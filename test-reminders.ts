import { buildDigest, dueReminders, reminderKey, todayInDubai, type ReminderSub } from "../src/lib/reminders";

const TODAY = "2026-09-24";
const sub = (o: Partial<ReminderSub>): ReminderSub => ({
  id: o.merchant!.toLowerCase(), merchant: "X", amount: 10, currency: "AED", cycle: "monthly",
  next_renewal: null, status: "active", review_state: "confirmed", previous_amount: null, price_changed_at: null, ...o,
});

const subs = [
  sub({ merchant: "OSN", status: "trial", next_renewal: "2026-09-27", amount: 35 }),           // trial, 3 days
  sub({ merchant: "Spotify", next_renewal: "2026-09-26", amount: 21.99 }),                     // renewal, 2 days
  sub({ merchant: "Netflix", next_renewal: "2026-10-14", amount: 56 }),                        // too far
  sub({ merchant: "Shahid", status: "cancelled", next_renewal: "2026-09-25" }),                // cancelled
  sub({ merchant: "Junk", review_state: "dismissed", next_renewal: "2026-09-25" }),            // dismissed
  sub({ merchant: "ChatGPT", amount: 22, previous_amount: 20, price_changed_at: "2026-09-22", currency: "USD", next_renewal: "2026-10-18" }),
  sub({ merchant: "Old", amount: 12, previous_amount: 10, price_changed_at: "2026-08-01" }),   // price change too old
  sub({ merchant: "Past", next_renewal: "2026-09-20" }),                                       // renewal in the past
];

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(ok ? "ok  " : "FAIL", msg); if (!ok) fails++; };

const due = dueReminders(subs, TODAY, 3, new Set());
check(due.length === 3, `3 reminders due (got ${due.length}: ${due.map((d) => d.merchant).join(", ")})`);
check(due[0].kind === "trial" && due[0].merchant === "OSN", "trial comes first");
check(due.some((d) => d.merchant === "Spotify" && d.kind === "renewal" && d.daysLeft === 2), "Spotify renews in 2 days");
check(due.some((d) => d.merchant === "ChatGPT" && d.kind === "price"), "ChatGPT price increase flagged");
check(!due.some((d) => ["Netflix", "Shahid", "Junk", "Old", "Past"].includes(d.merchant)), "far, cancelled, dismissed, stale and past items skipped");

const sent = new Set([reminderKey("osn", "trial", "2026-09-27")]);
check(!dueReminders(subs, TODAY, 3, sent).some((d) => d.merchant === "OSN"), "already-sent reminder not repeated");
check(dueReminders(subs, TODAY, 7, new Set()).length === 3, "7-day window still excludes Netflix (20 days)");
check(dueReminders(subs, "2026-09-26", 1, new Set()).some((d) => d.merchant === "Spotify" && d.daysLeft === 0), "renewal day itself included");

const mail = buildDigest(due, "https://subtrack.example");
check(mail.subject.startsWith("3 subscription reminders"), `subject: "${mail.subject}"`);
check(mail.text.includes("OSN free trial ends in 3 days, then AED 35.00"), "trial line reads well");
check(mail.text.includes("ChatGPT went up from USD 20.00 to USD 22.00"), "price line reads well");
check(buildDigest([due[1]], "x").subject === "Spotify renews in 2 days for AED 21.99", "single-item subject");
check(/^\d{4}-\d{2}-\d{2}$/.test(todayInDubai()), "Dubai date format");
check(todayInDubai(new Date("2026-09-24T21:30:00Z")) === "2026-09-25", "Dubai date rolls over at 20:00 UTC");

console.log("\n" + mail.text);
if (fails) process.exitCode = 1;
