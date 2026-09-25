import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revokeGoogleToken } from "@/lib/scan";

/**
 * POST { action: "disconnect" }  → delete stored inbox credentials (and revoke Google access for Gmail). Keeps subscriptions.
 * POST { action: "delete_all" }  → disconnect + delete every subscription, charge and the account itself.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { action } = await req.json();
  if (action !== "disconnect" && action !== "delete_all") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: conns } = await db.from("email_connections").select("id, provider, refresh_token").eq("user_id", user.id);
  for (const c of conns ?? []) if (c.provider === "gmail") await revokeGoogleToken(c.refresh_token);
  await db.from("email_connections").delete().eq("user_id", user.id);

  if (action === "delete_all") {
    await db.from("detected_charges").delete().eq("user_id", user.id);
    await db.from("subscriptions").delete().eq("user_id", user.id);
    await supabase.auth.signOut();
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
