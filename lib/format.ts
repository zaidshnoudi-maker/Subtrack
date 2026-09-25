import type { Cycle } from "./detection";

export const CYCLE_LABEL: Record<Cycle, { per: string; name: string }> = {
  weekly: { per: "week", name: "Weekly" },
  monthly: { per: "month", name: "Monthly" },
  quarterly: { per: "quarter", name: "Every 3 months" },
  yearly: { per: "year", name: "Yearly" },
  unknown: { per: "period", name: "Unknown" },
};

export const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const daysFrom = (today: string, date: string) =>
  Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);

const fmtDate = (d: string, o: Intl.DateTimeFormatOptions) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });
export const shortDate = (d: string) => fmtDate(d, { day: "numeric", month: "short" });
export const weekday = (d: string) => fmtDate(d, { weekday: "short" });
export const dayOfMonth = (d: string) => new Date(d + "T00:00:00Z").getUTCDate();

export const relDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

const ICON_COLORS = ["--red", "--orange", "--green", "--teal", "--blue", "--indigo", "--purple", "--pink"];
export const iconColor = (name: string) =>
  `var(${ICON_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % ICON_COLORS.length]})`;

/** Name without the "(via Apple)" suffix the detector adds, plus the store it came through. */
export function splitVia(merchant: string): { name: string; via: string | null } {
  const m = merchant.match(/^(.*) \(via (.*)\)$/);
  return m ? { name: m[1], via: m[2] } : { name: merchant, via: null };
}
