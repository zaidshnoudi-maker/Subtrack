import type { DetectedCharge, DetectedSubscription, RawEmail } from "./types";
import { extractCharge } from "./parse";
import { groupCharges } from "./group";

export * from "./types";
export { extractCharge, isLikelyBilling } from "./parse";
export { groupCharges, monthlyEquivalent } from "./group";
export { toAED } from "./currency";

export interface DetectOptions {
  /** Optional AI fallback for low-confidence/unknown senders. */
  llmExtract?: (email: RawEmail) => Promise<DetectedCharge | null>;
  /** Confidence below which the LLM fallback is used. */
  llmThreshold?: number;
  today?: string;
}

/** Full pipeline: emails -> charges -> subscriptions. */
export async function detectSubscriptions(
  emails: RawEmail[],
  opts: DetectOptions = {},
): Promise<{ charges: DetectedCharge[]; subscriptions: DetectedSubscription[] }> {
  const threshold = opts.llmThreshold ?? 0.6;
  const charges: DetectedCharge[] = [];

  for (const email of emails) {
    let charge = extractCharge(email);
    if (opts.llmExtract && (!charge || charge.confidence < threshold || charge.amount == null)) {
      // Only spend LLM calls on emails that at least look like billing.
      if (charge || /receipt|invoice|subscription|renew|membership/i.test(email.subject)) {
        const llm = await opts.llmExtract(email).catch(() => null);
        if (llm) charge = llm;
      }
    }
    if (charge) charges.push(charge);
  }

  return { charges, subscriptions: groupCharges(charges, opts.today) };
}
