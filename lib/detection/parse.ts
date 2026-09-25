import type { Cycle, DetectedCharge, RawEmail } from "./types";
import { APP_STORES, domainMatches, findMerchant, guessDomain, rootDomain, senderDomain } from "./merchants";

// ---------- keyword filters ----------

const BILLING_WORDS =
  /\b(receipt|invoice|payment|paid|charged|billing|billed|subscription|subscribed|renew(s|ed|al)?|membership|your plan|trial|order id|amount due)\b/i;

const NOT_SUBSCRIPTION =
  /\b(has (been )?shipped|out for delivery|delivered|password reset|verify your email|one-time password|OTP|refund(ed)? (has been|was) (issued|processed)|flight|boarding pass|hotel booking)\b/i;

const CANCEL_WORDS =
  /\b(subscription (has been |was )?(cancel(l)?ed|ended)|membership (has been |was )?cancel(l)?ed|we('ve| have) cancel(l)?ed your|sorry to see you go|auto-renew(al)? (is )?(turned )?off)\b/i;

const TRIAL_WORDS = /\b(free trial|trial (ends|period|will end)|your trial)\b/i;

const RENEWAL_NOTICE =
  /\b(will (auto(matically)?[- ])?renew|upcoming (renewal|payment|charge)|renews (on|soon)|is about to renew)\b/i;

// ---------- amounts ----------

const CURRENCY_ALIASES: Record<string, string> = {
  AED: "AED", "د.إ": "AED", DHS: "AED", DH: "AED",
  USD: "USD", "US$": "USD", $: "USD",
  EUR: "EUR", "€": "EUR",
  GBP: "GBP", "£": "GBP",
  SAR: "SAR", INR: "INR", "₹": "INR",
};

const CUR = "(AED|USD|EUR|GBP|SAR|INR|DHS|DH|US\\$|د\\.إ|\\$|€|£|₹)";
const NUM = "(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)";
const AMOUNT_BEFORE = new RegExp(`${CUR}\\s?${NUM}`, "gi"); // AED 49.00, $9.99
const AMOUNT_AFTER = new RegExp(`${NUM}\\s?${CUR}(?![a-z])`, "gi"); // 49.00 AED

interface AmountHit { amount: number; currency: string; index: number }

function findAmounts(text: string): AmountHit[] {
  const hits: AmountHit[] = [];
  for (const m of text.matchAll(AMOUNT_BEFORE)) {
    hits.push({ currency: CURRENCY_ALIASES[m[1].toUpperCase()] ?? m[1], amount: toNum(m[2]), index: m.index ?? 0 });
  }
  for (const m of text.matchAll(AMOUNT_AFTER)) {
    hits.push({ currency: CURRENCY_ALIASES[m[2].toUpperCase()] ?? m[2], amount: toNum(m[1]), index: m.index ?? 0 });
  }
  return hits.filter((h) => h.amount > 0 && h.amount < 100000).sort((a, b) => a.index - b.index);
}

function toNum(s: string): number {
  return Number(s.replace(/,/g, ""));
}

/** Prefer the amount on a "total / amount charged / price" line; else the last amount. */
export function extractAmount(text: string): { amount: number; currency: string } | null {
  const hits = findAmounts(text);
  if (hits.length === 0) return null;
  const totalRe = /\b(total|amount (charged|paid|due)|you (paid|were charged|will be charged)|price|charged)\b/gi;
  for (const t of text.matchAll(totalRe)) {
    const after = hits.find((h) => h.index >= (t.index ?? 0) && h.index - (t.index ?? 0) < 80);
    if (after) return { amount: after.amount, currency: after.currency };
  }
  const last = hits[hits.length - 1];
  return { amount: last.amount, currency: last.currency };
}

// ---------- billing cycle ----------

export function extractCycle(text: string): Cycle {
  if (/\b(per|a|each|every|\/)\s?(year|yr)\b|\b(annual(ly)?|yearly|12[- ]months?)\b/i.test(text)) return "yearly";
  if (/\b(quarterly|every 3 months|per quarter)\b/i.test(text)) return "quarterly";
  if (/\b(per|a|each|every|\/)\s?(month|mo)\b|\bmonthly\b/i.test(text)) return "monthly";
  if (/\b(per|a|each|every|\/)\s?(week|wk)\b|\bweekly\b/i.test(text)) return "weekly";
  return "unknown";
}

// ---------- dates ----------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Parses the first date found in a string. Numeric dates are read as DD/MM/YYYY (UAE convention). */
export function parseDate(s: string): string | null {
  let m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/); // October 12, 2026
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return ymd(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]);
  m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/); // 12 October 2026
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return ymd(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]);
  m = s.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/); // 12/10/2026 -> DD/MM
  if (m) return ymd(+m[3], +m[2], +m[1]);
  return null;
}

const RENEWAL_PHRASE =
  /(renews?( on)?|renewal date|next (billing|payment|charge)( date)?|will be (charged|billed|renewed) on|trial ends( on)?|valid until|expires on|next bill)[:\s]*([^\n]{0,40})/gi;

/** First renewal-type phrase that is followed by a parseable date. */
export function extractNextRenewal(text: string): string | null {
  for (const m of text.matchAll(RENEWAL_PHRASE)) {
    const d = parseDate(m[m.length - 1]);
    if (d) return d;
  }
  return null;
}

// ---------- merchant name helpers ----------

function displayName(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (m) return m[1].replace(/\b(no-?reply|billing|receipts?|team|support|payments?)\b/gi, "").trim() || domainRoot(from);
  return domainRoot(from);
}

function domainRoot(from: string): string {
  const parts = senderDomain(from).split(".");
  const root = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "Unknown";
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** For Apple / Google Play receipts, pull the subscribed app name so each app becomes its own subscription. */
function appStoreItem(text: string): string | null {
  const m = text.match(/(?:^|\n)\s*(?:subscription|item|app)\s*:\s*([^\n(]{2,40}?)\s*(?:\(|\n|$)/i);
  return m ? m[1].trim() : null;
}

// ---------- main extractor ----------

export function isLikelyBilling(email: RawEmail): boolean {
  const hay = `${email.subject}\n${email.text}`;
  return BILLING_WORDS.test(hay) && !NOT_SUBSCRIPTION.test(email.subject);
}

/**
 * Rule-based extraction. Returns null when the email isn't a subscription event.
 * Unknown merchants get method "generic" and lower confidence; the caller may
 * send those to the LLM fallback.
 */
export function extractCharge(email: RawEmail): DetectedCharge | null {
  if (!isLikelyBilling(email)) return null;
  const hay = `${email.subject}\n${email.text}`;
  const domain = senderDomain(email.from);
  const date = email.date.slice(0, 10);

  let merchantKey: string;
  let merchant: string;
  let category = "Other";
  let logoDomain: string | null = null;
  let defaultCycle: Cycle = "unknown";
  let method: DetectedCharge["method"] = "rule";
  let confidence = 0.9;

  const known = findMerchant(email.from, hay);
  const store = APP_STORES.find((s) => domainMatches(domain, s.domains) && (!s.match || s.match.test(hay)));

  if (known) {
    merchantKey = known.key;
    merchant = known.name;
    category = known.category;
    logoDomain = known.domains[0];
    defaultCycle = known.defaultCycle;
  } else if (store) {
    const item = appStoreItem(email.text);
    merchantKey = item ? `${store.key}:${slug(item)}` : store.key;
    merchant = item ? `${item} (via ${store.name})` : `${store.name} subscription`;
    category = "App store";
    logoDomain = item ? guessDomain(item) : null;
    confidence = item ? 0.85 : 0.6;
  } else {
    merchant = displayName(email.from);
    merchantKey = `generic:${slug(domain || merchant)}`;
    logoDomain = domain ? rootDomain(domain) : null;
    method = "generic";
    confidence = 0.5;
  }

  const kind: DetectedCharge["kind"] = CANCEL_WORDS.test(hay)
    ? "cancellation"
    : TRIAL_WORDS.test(hay)
      ? "trial"
      : RENEWAL_NOTICE.test(hay)
        ? "renewal_notice"
        : "charge";

  const amt = extractAmount(email.text) ?? extractAmount(email.subject);
  // Generic senders need a recurring signal, otherwise it's probably a one-off purchase.
  const explicitCycle = extractCycle(hay);
  if (method === "generic" && explicitCycle === "unknown" && !/subscription|membership|renew/i.test(hay)) {
    return null;
  }
  if (!amt && kind === "charge") confidence -= 0.3;

  return {
    emailId: email.id,
    merchantKey,
    merchant,
    category,
    domain: logoDomain,
    amount: amt?.amount ?? null,
    currency: amt?.currency ?? null,
    date,
    cycle: explicitCycle,
    defaultCycle,
    nextRenewal: extractNextRenewal(hay),
    kind,
    confidence: Math.max(0.1, Math.min(1, confidence)),
    method,
  };
}
