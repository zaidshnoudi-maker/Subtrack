"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppIcon, Chevron, Sheet } from "./ios/parts";

type Conn = { email: string; last_scanned_at: string | null; needs_reconnect: boolean } | null;

/** Inbox row in Settings; tapping it opens the iCloud connect sheet. */
export function InboxSection({ conn, defaultEmail }: { conn: Conn; defaultEmail: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = !conn ? "Not connected" : conn.needs_reconnect ? "Reconnect" : "Connected";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/connect/icloud", {
      method: "POST",
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error);
    setOpen(false);
    router.push("/dashboard?scan=1");
  }

  return (
    <>
      <div className="section-h">
        <span>Inbox</span>
      </div>
      <div className="group with-icons">
        <button className="row" onClick={() => setOpen(true)}>
          <AppIcon name="iCloud Mail" domain="icloud.com" size="sm" />
          <div className="row-main">
            <div className="title">
              <span className="t">iCloud Mail</span>
            </div>
            {conn && <div className="subtitle">{conn.email}</div>}
          </div>
          <div className="row-end">
            <span style={conn?.needs_reconnect ? { color: "var(--red)" } : undefined}>{status}</span>
            <Chevron />
          </div>
        </button>
      </div>
      <div className="section-f">
        {conn?.last_scanned_at
          ? `Last checked ${new Date(conn.last_scanned_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. `
          : ""}
        SubTrack reads receipts and renewal emails only, and checks again every morning at 6:00.
      </div>

      {open && (
        <Sheet onClose={() => setOpen(false)} label="Connect iCloud Mail">
          <form onSubmit={submit}>
            <div className="sheet-head">
              <button type="button" className="nav-btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <span className="sheet-title">iCloud Mail</span>
              <span />
            </div>
            <div className="sheet-hero">
              <AppIcon name="iCloud Mail" domain="icloud.com" size="lg" />
            </div>
            <div className="section-h" style={{ marginTop: 12 }}>
              <span>Create an app-specific password</span>
            </div>
            <div className="group">
              <div className="row">
                <div className="row-main" style={{ fontSize: 15, lineHeight: "21px" }}>
                  1. Open{" "}
                  <a href="https://account.apple.com" target="_blank" rel="noreferrer">
                    account.apple.com
                  </a>{" "}
                  and sign in
                  <br />
                  2. Go to <b>Sign-In and Security</b>
                  <br />
                  3. Tap <b>App-Specific Passwords</b>
                  <br />
                  4. Create one called <b>SubTrack</b> and copy it
                </div>
              </div>
            </div>
            <div className="group" style={{ marginTop: 26 }}>
              <div className="field">
                <label htmlFor="ic-email">Email</label>
                <input id="ic-email" name="email" type="email" required defaultValue={conn?.email ?? defaultEmail} placeholder="name@icloud.com" autoCapitalize="none" />
              </div>
              <div className="field">
                <label htmlFor="ic-pass">Password</label>
                <input id="ic-pass" name="password" type="password" required autoComplete="off" placeholder="xxxx-xxxx-xxxx-xxxx" />
              </div>
            </div>
            <div className="section-f">
              SubTrack checks the password with Apple, then stores it encrypted. You can revoke it any time at account.apple.com.
            </div>
            {error && <div className="error-text">{error}</div>}
            <div style={{ marginTop: 22 }}>
              <button className="filled-btn" disabled={busy}>
                {busy ? "Checking with Apple…" : "Connect"}
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </>
  );
}
