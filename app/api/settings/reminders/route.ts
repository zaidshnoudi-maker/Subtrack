import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Save reminder preferences: { enabled: boolean, days_before: 1..14 } */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const b = await req.json();
  const days = Number(b.days_before);
  if (!Number.isInteger(days) || days < 1 || days > 14) {
    return NextResponse.json({ error: "Choose between 1 and 14 days." }, { status: 400 });
  }
  const { error } = await supabase.from("user_settings").upsert(
    { user_id: data.user.id, reminders_enabled: Boolean(b.enabled), days_before: days, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
