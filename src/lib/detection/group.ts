import type { Cycle, DetectedCharge, DetectedSubscription, SubStatus } from "./types";
import { toAED } from "./currency";

const CYCLE_DAYS: Record<Exclude<Cycle, "unknown">, number> = {
  weekly: 7,
  monthly: 30.44,
  quarterly: 91.3,
  yearly: 365.25,
};

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function addCycle(date: string, cycle: Exclude<Cycle, "unknown">): string {
  const d = new Date(date + "T00:00:00Z");
  if (cycle === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  if (cycle === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  if (cycle === "quarterly") d.setUTCMonth(d.getUTCMonth() + 3);
  if (cycle === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Infer the cycle from the median gap between charges. */
export function inferCycleFromDates(dates: string[]): Cycle {
  if (dates.length < 2) return "unknown";
  const sorted = [...dates].sort();
  const gaps = sorted.slice(1).map((d, i) => daysBetween(sorted[i], d)).filter((g) => g > 3);
  if (gaps.length === 0) return "unknown";
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  if (median >= 5 && median <= 9) return "weekly";
  if (median >= 26 && median <= 35) return "monthly";
  if (median >= 84 && median <= 98) return "quarterly";
  if (median >= 350 && median <= 380) return "yearly";
  return "unknown";
}

export function monthlyEquivalent(amount: number, cycle: Cycle): number | null {
  if (cycle === "unknown") return null;
  return (amount * 30.44) / CYCLE_DAYS[cycle];
}

/** Group extracted charges into subscriptions and predict next renewal. */
export function groupCharges(charges: DetectedCharge[], today = new Date().toISOString().slice(0, 10)): DetectedSubscription[] {
  const byKey = new Map<string, DetectedCharge[]>();
  for (const c of charges) {
    const list = byKey.get(c.merchantKey) ?? [];
    list.push(c);
    byKey.set(c.merchantKey, list);
  }

  const subs: DetectedSubscription[] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const latest = list[list.length - 1];
    const paid = list.filter((c) => c.kind === "charge" && c.amount != null);
    const lastPaid = paid[paid.length - 1] ?? null;
    const withAmount = [...list].reverse().find((c) => c.amount != null) ?? null;

    // Cycle: explicit in any email (latest first) > inferred from dates > merchant default.
    const explicit = [...list].reverse().find((c) => c.cycle !== "unknown")?.cycle;
    const inferred = inferCycleFromDates(paid.map((c) => c.date));
    const cycle: Cycle = explicit ?? (inferred !== "unknown" ? inferred : latest.defaultCycle);

    // Next renewal: stated date in the latest email that has one (if still in future), else project forward.
    let nextRenewal: string | null = null;
    const stated = [...list].reverse().find((c) => c.nextRenewal)?.nextRenewal ?? null;
    if (stated && stated >= today) nextRenewal = stated;
    else if (lastPaid && cycle !== "unknown") {
      let d = addCycle(lastPaid.date, cycle);
      while (d < today) d = addCycle(d, cycle);
      nextRenewal = d;
    } else if (stated) nextRenewal = stated;

    // Status
    let status: SubStatus = "active";
    if (latest.kind === "cancellation") status = "cancelled";
    else if (latest.kind === "trial" && !lastPaid) status = "trial";
    else if (lastPaid && cycle !== "unknown") {
      const overdueDays = daysBetween(lastPaid.date, today);
      if (overdueDays > CYCLE_DAYS[cycle] * 2 + 7) status = "possibly_cancelled";
    }
    if (status === "cancelled") nextRenewal = null;

    const amount = withAmount?.amount ?? null;
    const currency = withAmount?.currency ?? null;
    const monthly = amount != null ? monthlyEquivalent(amount, cycle) : null;
    const monthlyAED = monthly != null && currency ? toAED(monthly, currency) : null;

    // Confidence rises with repeat evidence.
    const base = Math.max(...list.map((c) => c.confidence));
    const confidence = Math.min(1, base + (paid.length >= 2 ? 0.1 : 0) + (paid.length >= 4 ? 0.05 : 0));

    subs.push({
      merchantKey: key,
      merchant: latest.merchant,
      category: latest.category,
      domain: [...list].reverse().find((c) => c.domain)?.domain ?? null,
      amount,
      currency,
      cycle,
      lastCharged: lastPaid?.date ?? null,
      nextRenewal,
      status,
      monthlyCostAED: monthlyAED != null ? Math.round(monthlyAED * 100) / 100 : null,
      confidence: Math.round(confidence * 100) / 100,
      emailIds: list.map((c) => c.emailId),
    });
  }

  return subs.sort((a, b) => (a.nextRenewal ?? "9999").localeCompare(b.nextRenewal ?? "9999"));
}
