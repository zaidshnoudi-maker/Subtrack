import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";

/**
 * The sign-in email link (or Google, if Gmail is enabled later) lands here. We:
 * 1) exchange the code for a Supabase session
 * 2) if Google sent a Gmail refresh token, store it encrypted
 * 3) send new users to Settings to connect an inbox, returning users to the dashboard
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/?error=missing_code", url.origin));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(new URL("/?error=auth", url.origin));

  const refresh = data.session.provider_refresh_token;
  if (refresh) {
    await createServiceClient()
      .from("email_connections")
      .upsert(
        {
          user_id: data.user.id,
          provider: "gmail",
          email: data.user.email,
          refresh_token: encryptToken(refresh),
          needs_reconnect: false,
        },
        { onConflict: "user_id,provider,email" },
      );
  }

  if (refresh) return NextResponse.redirect(new URL("/dashboard?scan=1", url.origin));
  const { count } = await createServiceClient()
    .from("email_connections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.user.id);
  return NextResponse.redirect(new URL(count ? "/dashboard" : "/settings", url.origin));
}
