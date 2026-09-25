import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanUser } from "@/lib/scan";

export const maxDuration = 60; // seconds (Vercel)

/** Scan the signed-in user's Gmail and upsert detected subscriptions. */
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const result = await scanUser(data.user.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
