"use client";
import { useState } from "react";
import { Chevron, useToast } from "./ios/parts";

const OPTIONS: [number, string][] = [
  [1, "1 day before"],
  [2, "2 days before"],
  [3, "3 days before"],
  [5, "5 days before"],
  [7, "1 week before"],
  [14, "2 weeks before"],
];

export function ReminderSettings({
  enabled: initialEnabled,
  daysBefore: initialDays,
  email,
  mailReady,
}: {
  enabled: boolean;
  daysBefore: number;
  email: string;
  mailReady: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [days, setDays] = useState(initialDays);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function save(nextEnabled: boolean, nextDays: number) {
    const res = await fetch("/api/settings/reminders", {
      method: "POST",
      body: JSON.stringify({ enabled: nextEnabled, days_before: nextDays }),
    });
    if (!res.ok) toast.show((await res.json()).error);
  }

  async function test() {
    setBusy(true);
    const res = await fetch("/api/reminders/test", { method: "POST" });
    const body = await res.json();
    setBusy(false);
    toast.show(res.ok ? `Test email sent to ${body.to}` : body.error);
  }

  return (
    <>
      <div className="section-h">
        <span>Reminders</span>
      </div>
      <div className="group">
        <label className="row" htmlFor="reminders-enabled">
          <div className="row-main">Email reminders</div>
          <input
            id="reminders-enabled"
            type="checkbox"
            className="switch"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              void save(e.target.checked, days);
            }}
          />
        </label>
        <div className="field" style={{ opacity: enabled ? 1 : 0.4 }}>
          <label htmlFor="reminders-days">Remind me</label>
          <div className="select-wrap">
            <select
              id="reminders-days"
              value={days}
              disabled={!enabled}
              onChange={(e) => {
                const d = Number(e.target.value);
                setDays(d);
                void save(enabled, d);
              }}
            >
              {OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>
        <button className="row action" onClick={test} disabled={busy || !mailReady}>
          {busy ? "Sending…" : "Send Test Email"}
        </button>
      </div>
      <div className="section-f">
        {mailReady
          ? `One email to ${email} at 6:00 UAE time when something renews, a free trial is about to turn paid, or a price goes up.`
          : "Email sending isn't switched on yet. Add RESEND_API_KEY in Vercel to start reminders."}
      </div>
      {toast.node}
    </>
  );
}
