import "server-only";
import type { DetectedCharge, RawEmail, Cycle } from "./detection";
import { rootDomain, senderDomain } from "./detection/merchants";

/**
 * AI fallback for emails the rules can't parse confidently.
 * Disabled automatically when ANTHROPIC_API_KEY is not set.
 */
export const llmEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const PROMPT = `You extract subscription billing data from an email.
Return ONLY a JSON object, no prose:
{"is_subscription": boolean, "merchant": string, "amount": number|null, "currency": "AED"|"USD"|"EUR"|"GBP"|"SAR"|null,
 "cycle": "weekly"|"monthly"|"quarterly"|"yearly"|"unknown", "next_renewal": "YYYY-MM-DD"|null,
 "kind": "charge"|"trial"|"cancellation"|"renewal_notice"}
is_subscription is false for one-off purchases, shipping updates, marketing and newsletters.
Numeric dates like 05/10/2026 are day/month/year.`;

export async function llmExtract(email: RawEmail): Promise<DetectedCharge | null> {
  if (!llmEnabled()) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5",
      max_tokens: 300,
      system: PROMPT,
      messages: [
        {
          role: "user",
          content: `From: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\n\n${email.text.slice(0, 4000)}`,
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const raw: string = data.content?.[0]?.text ?? "";
  const json = raw.match(/\{[\s\S]*\}/);
  if (!json) return null;
  const r = JSON.parse(json[0]);
  if (!r.is_subscription || !r.merchant) return null;

  const key = String(r.merchant).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return {
    emailId: email.id,
    merchantKey: `generic:${key}`,
    merchant: r.merchant,
    category: "Other",
    domain: senderDomain(email.from) ? rootDomain(senderDomain(email.from)) : null,
    amount: typeof r.amount === "number" ? r.amount : null,
    currency: r.currency ?? null,
    date: email.date.slice(0, 10),
    cycle: (r.cycle ?? "unknown") as Cycle,
    defaultCycle: "unknown",
    nextRenewal: r.next_renewal ?? null,
    kind: r.kind ?? "charge",
    confidence: 0.75,
    method: "llm",
  };
}
