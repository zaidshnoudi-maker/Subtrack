import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { testICloudLogin } from "@/lib/icloud";
import { encryptToken } from "@/lib/crypto";

export const maxDuration = 30;

/** Connect an iCloud inbox: verify the app-specific password, then store it encrypted. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { email, password } = await req.json();
  const address = String(email ?? "").trim().toLowerCase();
  const pass = String(password ?? "").replace(/\s+/g, ""); // Apple shows it as xxxx-xxxx-xxxx-xxxx
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(address)) {
    return NextResponse.json({ error: "Enter your full iCloud email address, for example name@icloud.com." }, { status: 400 });
  }
  if (pass.length < 16) {
    return NextResponse.json({ error: "That doesn't look like an app-specific password. It has 16 letters, shown as xxxx-xxxx-xxxx-xxxx." }, { status: 400 });
  }

  const problem = await testICloudLogin(address, pass);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { error } = await createServiceClient()
    .from("email_connections")
    .upsert(
      { user_id: user.id, provider: "icloud", email: address, refresh_token: encryptToken(pass), needs_reconnect: false },
      { onConflict: "user_id,provider,email" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
