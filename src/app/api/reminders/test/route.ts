import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTestReminder } from "@/lib/notify";

/** Send the signed-in user a test reminder email. */
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const err = await sendTestReminder(data.user.id);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true, to: data.user.email });
}
