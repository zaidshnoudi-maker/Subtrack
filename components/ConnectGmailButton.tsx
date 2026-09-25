"use client";
import { createClient } from "@/lib/supabase/client";

/** Google sign-in that also asks for read-only Gmail access (offline = refresh token). */
export function ConnectGmailButton() {
  async function connect() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }
  return (
    <button onClick={connect} className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700">
      Connect Gmail
    </button>
  );
}
