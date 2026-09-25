import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AccountActions } from "@/components/AccountActions";
import { InboxSection } from "@/components/ICloudConnectForm";
import { ReminderSettings } from "@/components/ReminderSettings";
import { SignOutRow } from "@/components/SignOutRow";
import { mailEnabled } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data } = await createServiceClient()
    .from("email_connections")
    .select("provider, email, last_scanned_at, needs_reconnect")
    .eq("user_id", auth.user.id);
  type Conn = { provider: string; email: string; last_scanned_at: string | null; needs_reconnect: boolean };
  const conns: Conn[] = data ?? [];
  const icloud = conns.find((c) => c.provider === "icloud") ?? null;

  const { data: prefs } = await supabase
    .from("user_settings")
    .select("reminders_enabled, days_before")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return (
    <div className="screen">
      <div className="navbar" />
      <h1 className="large-title">Settings</h1>

      <InboxSection conn={icloud} defaultEmail={auth.user.email ?? ""} />

      <ReminderSettings
        enabled={prefs?.reminders_enabled ?? true}
        daysBefore={prefs?.days_before ?? 3}
        email={auth.user.email ?? ""}
        mailReady={mailEnabled()}
      />

      <AccountActions connected={conns.length > 0} />

      <div className="section-h">
        <span>Account</span>
      </div>
      <div className="group">
        <div className="row">
          <div className="row-main">Signed in as</div>
          <div className="value">{auth.user.email}</div>
        </div>
        <SignOutRow />
      </div>
    </div>
  );
}
