import "server-only";
import { createServiceClient } from "./supabase/server";
import { buildDigest, dueReminders, reminderKey, todayInDubai, type ReminderItem, type ReminderSub } from "./reminders";
import { appUrl, sendEmail } from "./mailer";

export interface NotifyResult {
  userId: string;
  sent: number;
  error?: string;
}

async function loadSettings(userId: string) {
  const db = createServiceClient();
  const { data } = await db.from("user_settings").select("reminders_enabled, days_before").eq("user_id", userId).maybeSingle();
  return { enabled: data?.reminders_enabled ?? true, daysBefore: data?.days_before ?? 3 };
}

async function loadSubs(userId: string): Promise<ReminderSub[]> {
  const { data } = await createServiceClient()
    .from("subscriptions")
    .select("id, merchant, amount, currency, cycle, next_renewal, status, review_state, previous_amount, price_changed_at")
    .eq("user_id", userId);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as ReminderSub),
    amount: r.amount != null ? Number(r.amount) : null,
    previous_amount: r.previous_amount != null ? Number(r.previous_amount) : null,
  }));
}

async function userEmail(userId: string): Promise<string | null> {
  const { data } = await createServiceClient().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** Send one digest email with everything due for this user today, then log it. */
export async function sendRemindersForUser(userId: string, today = todayInDubai()): Promise<NotifyResult> {
  const settings = await loadSettings(userId);
  if (!settings.enabled) return { userId, sent: 0 };

  const db = createServiceClient();
  const { data: sentRows } = await db
    .from("reminders_sent")
    .select("subscription_id, kind, for_date")
    .eq("user_id", userId)
    .gte("for_date", new Date(Date.parse(today) - 30 * 86_400_000).toISOString().slice(0, 10));
  const already = new Set<string>(
    (sentRows ?? []).map((r: { subscription_id: string; kind: ReminderItem["kind"]; for_date: string }) =>
      reminderKey(r.subscription_id, r.kind, r.for_date),
    ),
  );

  const items = dueReminders(await loadSubs(userId), today, settings.daysBefore, already);
  if (items.length === 0) return { userId, sent: 0 };

  const to = await userEmail(userId);
  if (!to) return { userId, sent: 0, error: "No email address on the account" };

  const { subject, html, text } = buildDigest(items, appUrl());
  const err = await sendEmail(to, subject, html, text);
  if (err) return { userId, sent: 0, error: err };

  await db.from("reminders_sent").upsert(
    items.map((i) => ({ user_id: userId, subscription_id: i.subscriptionId, kind: i.kind, for_date: i.forDate })),
    { onConflict: "user_id,subscription_id,kind,for_date", ignoreDuplicates: true },
  );
  return { userId, sent: items.length };
}

/** A test email showing what's coming up, without marking anything as sent. */
export async function sendTestReminder(userId: string): Promise<string | null> {
  const to = await userEmail(userId);
  if (!to) return "No email address on the account.";
  const { daysBefore } = await loadSettings(userId);
  const today = todayInDubai();
  // Use a wider window so the test shows something useful.
  let items = dueReminders(await loadSubs(userId), today, Math.max(daysBefore, 14), new Set());
  if (items.length === 0) {
    items = [{ subscriptionId: "example", kind: "renewal", forDate: today, merchant: "Example subscription", amount: 29, currency: "AED", cycle: "monthly", daysLeft: daysBefore }];
  }
  const { subject, html, text } = buildDigest(items, appUrl());
  return sendEmail(to, `[Test] ${subject}`, html, text);
}

/** Daily job: every user with live subscriptions. */
export async function runReminders(limit = 200): Promise<NotifyResult[]> {
  const { data } = await createServiceClient()
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trial"])
    .limit(5000);
  const userIds = [...new Set<string>((data ?? []).map((r: { user_id: string }) => r.user_id))].slice(0, limit);
  const results: NotifyResult[] = [];
  for (const id of userIds) {
    results.push(await sendRemindersForUser(id).catch((e) => ({ userId: id, sent: 0, error: String(e) })));
  }
  return results;
}
