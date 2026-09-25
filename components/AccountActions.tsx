"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "disconnect" | "delete_all";

const CONFIRM: Record<Action, { text: string; button: string }> = {
  disconnect: {
    text: "Disconnect your inbox? SubTrack stops checking it. Your list stays. Also delete the SubTrack password at account.apple.com.",
    button: "Disconnect",
  },
  delete_all: {
    text: "Delete everything? This removes your subscriptions, history, inbox connection and account. It can't be undone.",
    button: "Delete All",
  },
};

export function AccountActions({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Action) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account", { method: "POST", body: JSON.stringify({ action }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error);
    setAsking(null);
    if (action === "delete_all") router.push("/");
    else router.refresh();
  }

  return (
    <>
      <div className="section-h">
        <span>Privacy</span>
      </div>
      <div className="group">
        {connected && (
          <button className="row action" onClick={() => setAsking("disconnect")}>
            Disconnect Inbox
          </button>
        )}
        <button className="row destructive" onClick={() => setAsking("delete_all")}>
          Delete All My Data
        </button>
      </div>
      {asking && (
        <div className="confirm-box">
          <div className="caption">{CONFIRM[asking].text}</div>
          <div className="actions">
            <button className="pill-btn" onClick={() => setAsking(null)}>
              Cancel
            </button>
            <button className="pill-btn primary" style={{ background: "var(--red)" }} disabled={busy} onClick={() => run(asking)}>
              {busy ? "Working…" : CONFIRM[asking].button}
            </button>
          </div>
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      <div className="section-f">
        SubTrack keeps only the merchant, price and dates. Email content is never stored, and your iCloud password is encrypted.
      </div>
    </>
  );
}
