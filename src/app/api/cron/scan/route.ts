import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { scanUser } from "@/lib/scan";
import { runReminders } from "@/lib/notify";

export const maxDuration = 300; // seconds

/**
 * Daily job (06:00 UAE): re-scan every connected inbox, then email reminders.
 * Called by Vercel Cron (see vercel.json),
 * which sends "Authorization: Bearer <CRON_SECRET>".
 * Oldest-scanned first, capped per run so it fits in the time limit.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: conns } = await db
    .from("email_connections")
    .select("user_id")
    .eq("needs_reconnect", false)
    .order("last_scanned_at", { ascending: true, nullsFirst: true })
    .limit(40);

  const userIds = [...new Set<string>((conns ?? []).map((c: { user_id: string }) => c.user_id))].slice(0, 20);
  const results = [];
  for (const id of userIds) {
    results.push(await scanUser(id).catch((e) => ({ userId: id, error: String(e) })));
  }
  const reminders = await runReminders();
  return NextResponse.json({
    scanned: results.length,
    results,
    reminders: { users: reminders.length, emailsSent: reminders.filter((r) => r.sent > 0).length, errors: reminders.filter((r) => r.error) },
  });
}
