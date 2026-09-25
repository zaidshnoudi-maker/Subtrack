/**
 * Static conversion rates to AED. USD is pegged (3.6725); others are
 * approximate and should be replaced by a live FX feed in Phase 2.
 */
export const RATES_TO_AED: Record<string, number> = {
  AED: 1,
  USD: 3.6725,
  SAR: 0.979,
  EUR: 4.2,
  GBP: 4.9,
  INR: 0.042,
};

export function toAED(amount: number, currency: string): number | null {
  const r = RATES_TO_AED[currency.toUpperCase()];
  return r == null ? null : amount * r;
}
