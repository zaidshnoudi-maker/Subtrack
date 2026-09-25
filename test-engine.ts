/**
 * Runs the detection engine on the sample inbox and checks the results.
 * Usage: npm run test:engine
 */
import { detectSubscriptions } from "../src/lib/detection";
import { SAMPLE_EMAILS } from "../src/lib/detection/samples";

const TODAY = "2026-09-24";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("ok  ", msg);
}

const { subscriptions } = await detectSubscriptions(SAMPLE_EMAILS, { today: TODAY });

console.table(
  subscriptions.map((s) => ({
    merchant: s.merchant,
    amount: `${s.amount ?? "?"} ${s.currency ?? ""}`,
    cycle: s.cycle,
    next: s.nextRenewal,
    status: s.status,
    "AED/mo": s.monthlyCostAED,
    conf: s.confidence,
  })),
);

const by = (k: string) => subscriptions.find((s) => s.merchantKey === k || s.merchantKey.startsWith(k));

assert(subscriptions.length === 10, `detects 10 subscriptions (got ${subscriptions.length})`);
assert(by("netflix")?.nextRenewal === "2026-09-14" || by("netflix")?.nextRenewal === "2026-10-14", "Netflix renewal projected");
assert(by("netflix")?.nextRenewal === "2026-10-14", "Netflix next renewal = 2026-10-14");
assert(by("spotify")?.nextRenewal === "2026-10-03", "Spotify renewal read from email");
assert(by("apple:icloud")?.amount === 10.99, "Apple iCloud+ split out as its own sub");
assert(by("apple:calm")?.cycle === "yearly", "Calm via Apple is yearly");
assert(by("chatgpt")?.monthlyCostAED === 73.45, "ChatGPT USD 20 -> AED 73.45/mo");
assert(by("osnplus")?.status === "trial", "OSN+ flagged as trial");
assert(by("shahid")?.status === "cancelled", "Shahid flagged as cancelled");
assert(by("canva")?.cycle === "yearly", "Canva yearly");
assert(by("generic:headspace")?.amount === 69.99, "Unknown merchant Headspace detected generically");
assert(by("careem_plus")?.cycle === "monthly", "Careem Plus cycle");
assert(!subscriptions.some((s) => /amazon|medium|ikea/i.test(s.merchantKey)), "noise emails ignored");

assert(by("netflix")?.domain === "netflix.com", "Netflix logo domain");
assert(by("apple:icloud")?.domain === "icloud.com", "iCloud+ logo domain (not Apple's store)");
assert(by("apple:calm")?.domain === "calm.com", "Calm logo domain");
assert(by("generic:headspace")?.domain === "headspace.com", "unknown merchant uses sender's root domain");

const total = subscriptions
  .filter((s) => s.status === "active" || s.status === "trial")
  .reduce((sum, s) => sum + (s.monthlyCostAED ?? 0), 0);
console.log(`\nMonthly total (active + trial): AED ${total.toFixed(2)}`);
