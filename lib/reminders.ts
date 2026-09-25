/**
 * Reminder rules (pure functions, no I/O) — easy to test.
 *
 *  renewal : an active subscription renews within `daysBefore` days
 *  trial   : a free trial ends (and turns paid) within `daysBefore` days
 *  price   : a scan found the price went up in the last 7 days
 *
 * Each reminder is sent once, keyed by subscription + kind + date, so a missed
 * cron run catches up the next day without sending duplicates.
 */

export type ReminderKind = "renewal" | "trial" | "price";

export interface ReminderSub {
  id: string;
  merchant: string;
  amount: number | null;
  currency: string | null;
  cycle: string;
  next_renewal: string | null;
  status: string;
  review_state: string;
  previous_amount: number | null;
  price_changed_at: string | null;
}

export interface ReminderItem {
  subscriptionId: string;
  kind: ReminderKind;
  forDate: string;
  merchant: string;
  amount: number | null;
  currency: string | null;
  cycle: string;
  daysLeft?: number;
  previousAmount?: number | null;
}

export const reminderKey = (subscriptionId: string, kind: ReminderKind, forDate: string) =>
  `${subscriptionId}:${kind}:${forDate}`;

/** Today's date (YYYY-MM-DD) in the UAE, where the daily run happens at 06:00. */
export function todayInDubai(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(now);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
}

export function dueReminders(
  subs: ReminderSub[],
  today: string,
  daysBefore: number,
  alreadySent: Set<string>,
): ReminderItem[] {
  const out: ReminderItem[] = [];
  for (const s of subs) {
    if (s.review_state === "dismissed" || s.status === "cancelled") continue;
    const base = { subscriptionId: s.id, merchant: s.merchant, amount: s.amount, currency: s.currency, cycle: s.cycle };

    if (s.next_renewal && (s.status === "active" || s.status === "trial")) {
      const left = daysBetween(today, s.next_renewal);
      if (left >= 0 && left <= daysBefore) {
        const kind: ReminderKind = s.status === "trial" ? "trial" : "renewal";
        if (!alreadySent.has(reminderKey(s.id, kind, s.next_renewal))) {
          out.push({ ...base, kind, forDate: s.next_renewal, daysLeft: left });
        }
      }
    }

    if (s.price_changed_at && s.previous_amount != null && s.amount != null && s.amount > s.previous_amount) {
      const ago = daysBetween(s.price_changed_at, today);
      if (ago >= 0 && ago <= 7 && !alreadySent.has(reminderKey(s.id, "price", s.price_changed_at))) {
        out.push({ ...base, kind: "price", forDate: s.price_changed_at, previousAmount: s.previous_amount });
      }
    }
  }
  // Trials first (most urgent), then soonest renewals, then price changes.
  const rank = { trial: 0, renewal: 1, price: 2 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
}

// ---------- email content ----------

const money = (amount: number | null, currency: string | null) =>
  amount == null ? "" : `${currency ?? ""} ${amount.toFixed(2)}`.trim();

const when = (d?: number) => (d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`);

const dateLabel = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function describe(item: ReminderItem): string {
  const price = money(item.amount, item.currency);
  if (item.kind === "trial") return `${item.merchant} free trial ends ${when(item.daysLeft)}${price ? `, then ${price}` : ""}`;
  if (item.kind === "renewal") return `${item.merchant} renews ${when(item.daysLeft)}${price ? ` for ${price}` : ""}`;
  return `${item.merchant} went up from ${money(item.previousAmount ?? null, item.currency)} to ${price}`;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function buildDigest(items: ReminderItem[], appUrl: string) {
  const subject =
    items.length === 1
      ? describe(items[0])
      : `${items.length} subscription reminders: ${items.slice(0, 2).map((i) => i.merchant).join(", ")}${items.length > 2 ? "…" : ""}`;

  const label = { trial: "Trial ending", renewal: "Renewing", price: "Price increase" } as const;
  const color = { trial: "#9A6414", renewal: "#1F6F5C", price: "#B4443B" } as const;

  const rows = items
    .map(
      (i) => `<tr>
  <td style="padding:12px 0;border-top:1px solid #DCE3DE">
    <div style="font:600 12px/1.4 Arial,sans-serif;color:${color[i.kind]};text-transform:uppercase;letter-spacing:.05em">${label[i.kind]}</div>
    <div style="font:600 16px/1.4 Arial,sans-serif;color:#16201C">${esc(i.merchant)}</div>
    <div style="font:14px/1.5 Arial,sans-serif;color:#5E6B66">${esc(describe(i))}${i.kind !== "price" ? ` · ${dateLabel(i.forDate)}` : ""}</div>
  </td>
</tr>`,
    )
    .join("");

  const html = `<div style="background:#F4F6F3;padding:24px">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:20px 24px">
  <tr><td style="font:700 20px/1.3 Arial,sans-serif;color:#16201C;padding-bottom:8px">SubTrack</td></tr>
  ${rows}
  <tr><td style="padding-top:16px"><a href="${appUrl}/dashboard" style="display:inline-block;background:#1F6F5C;color:#fff;text-decoration:none;font:600 14px Arial,sans-serif;padding:10px 16px;border-radius:8px">Open SubTrack</a></td></tr>
  <tr><td style="padding-top:16px;font:12px/1.5 Arial,sans-serif;color:#8A9690">To cancel a subscription, do it with the provider before the renewal date. Change reminder settings in <a href="${appUrl}/settings" style="color:#5E6B66">Settings</a>.</td></tr>
</table></div>`;

  const text = [
    "SubTrack reminders",
    "",
    ...items.map((i) => `- ${describe(i)}${i.kind !== "price" ? ` (${dateLabel(i.forDate)})` : ""}`),
    "",
    `Open SubTrack: ${appUrl}/dashboard`,
    `Reminder settings: ${appUrl}/settings`,
  ].join("\n");

  return { subject, html, text };
}
