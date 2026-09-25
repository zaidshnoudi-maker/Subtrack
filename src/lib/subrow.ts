import type { Cycle, SubStatus } from "./detection";
import { monthlyEquivalent, toAED } from "./detection";

/** A subscription as the screens use it. */
export interface SubRow {
  id: string;
  merchant: string;
  category: string | null;
  logoDomain?: string | null;
  amount: number | null;
  currency: string | null;
  cycle: Cycle;
  nextRenewal: string | null;
  status: SubStatus;
  monthlyCostAED: number | null;
  confidence: number | null;
  reviewState?: "pending" | "confirmed" | "dismissed";
  source: string;
  previousAmount?: number | null;
  priceChangedAt?: string | null;
}

/** Map a `subscriptions` table row to a SubRow. */
export function fromDb(r: Record<string, unknown>): SubRow {
  const n = (v: unknown) => (v != null ? Number(v) : null);
  return {
    id: String(r.id),
    merchant: String(r.merchant),
    category: (r.category as string) ?? null,
    logoDomain: (r.logo_domain as string) ?? null,
    amount: n(r.amount),
    currency: (r.currency as string) ?? null,
    cycle: r.cycle as Cycle,
    nextRenewal: (r.next_renewal as string) ?? null,
    status: r.status as SubStatus,
    monthlyCostAED: n(r.monthly_cost_aed),
    confidence: n(r.confidence),
    reviewState: r.review_state as SubRow["reviewState"],
    source: String(r.source),
    previousAmount: n(r.previous_amount),
    priceChangedAt: (r.price_changed_at as string) ?? null,
  };
}

/** Monthly cost in AED, computed if the stored value is missing. */
export function monthlyAED(r: SubRow): number {
  if (r.monthlyCostAED != null) return r.monthlyCostAED;
  if (r.amount == null || !r.currency) return 0;
  const m = monthlyEquivalent(r.amount, r.cycle);
  return (m != null ? toAED(m, r.currency) : null) ?? 0;
}

/** One payment converted to AED. */
export function paymentAED(r: SubRow): number {
  if (r.amount == null || !r.currency) return 0;
  return toAED(r.amount, r.currency) ?? 0;
}

export const isLive = (r: SubRow) => r.status !== "cancelled" && r.reviewState !== "pending" && r.reviewState !== "dismissed";

export const priceWentUp = (r: SubRow, today: string) =>
  r.previousAmount != null &&
  r.amount != null &&
  r.amount > r.previousAmount &&
  !!r.priceChangedAt &&
  Date.parse(today) - Date.parse(r.priceChangedAt) <= 31 * 86_400_000;
