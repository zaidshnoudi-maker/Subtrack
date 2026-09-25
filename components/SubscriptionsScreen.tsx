"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppIcon, Chevron, useToast } from "./ios/parts";
import { DetailSheet, FormSheet } from "./SubscriptionSheets";
import { CYCLE_LABEL, daysFrom, money, relDays, shortDate, splitVia } from "@/lib/format";
import { isLive, monthlyAED, priceWentUp, type SubRow } from "@/lib/subrow";

function Subtitle({ r, today }: { r: SubRow; today: string }) {
  if (r.status === "cancelled") return <>Cancelled</>;
  if (r.status === "possibly_cancelled") return <>No recent payment found</>;
  if (!r.nextRenewal) return <>{CYCLE_LABEL[r.cycle].name}</>;
  const n = daysFrom(today, r.nextRenewal);
  const when = n >= 0 && n <= 7 ? relDays(n) : shortDate(r.nextRenewal);
  if (r.status === "trial") return <span style={{ color: "var(--orange)" }}>Free trial ends {when}</span>;
  return (
    <>
      Renews {when}
      {priceWentUp(r, today) && <span style={{ color: "var(--red)" }}> · price up</span>}
    </>
  );
}

export function SubRowButton({ r, today, onOpen }: { r: SubRow; today: string; onOpen: (r: SubRow) => void }) {
  return (
    <button className="row" onClick={() => onOpen(r)}>
      <AppIcon name={r.merchant} domain={r.logoDomain} />
      <div className="row-main">
        <div className="title">
          <span className="t">{splitVia(r.merchant).name}</span>
        </div>
        <div className="subtitle">
          <Subtitle r={r} today={today} />
        </div>
      </div>
      <div className="row-end">
        {r.amount != null && (
          <div>
            <div className="amount">
              {r.currency} {money(r.amount)}
            </div>
            <div className="per">per {CYCLE_LABEL[r.cycle].per}</div>
          </div>
        )}
        <Chevron />
      </div>
    </button>
  );
}

export function SubscriptionsScreen({
  rows,
  today,
  demo = false,
  note,
  connected = true,
}: {
  rows: SubRow[];
  today: string;
  demo?: boolean;
  note?: React.ReactNode;
  connected?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [open, setOpen] = useState<SubRow | null>(null);
  const [form, setForm] = useState<{ row: SubRow | null } | null>(null);
  const [scanning, setScanning] = useState(false);
  const autoScanned = useRef(false);

  async function scan() {
    setScanning(true);
    const res = await fetch("/api/scan", { method: "POST" });
    const body = await res.json();
    setScanning(false);
    toast.show(res.ok ? `Checked ${body.scannedEmails} emails · ${body.detected} found` : body.error);
    router.replace("/dashboard");
    router.refresh();
  }

  useEffect(() => {
    if (!demo && params?.get("scan") === "1" && !autoScanned.current) {
      autoScanned.current = true;
      void scan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, demo]);

  async function review(r: SubRow, state: "confirmed" | "dismissed") {
    if (demo) return toast.show(state === "confirmed" ? "Added to your subscriptions" : "Hidden");
    const res = await fetch("/api/subscriptions", { method: "PATCH", body: JSON.stringify({ id: r.id, review_state: state }) });
    if (!res.ok) return toast.show("Couldn't save. Try again.");
    toast.show(state === "confirmed" ? "Added to your subscriptions" : "Hidden. It won't come back");
    router.refresh();
  }

  const visible = rows.filter((r) => r.reviewState !== "dismissed");
  const live = visible.filter(isLive);
  const pending = visible.filter((r) => r.reviewState === "pending" && r.status !== "cancelled");
  const cancelled = visible.filter((r) => r.status === "cancelled" && r.reviewState !== "pending");
  const active = [...live].sort((a, b) => monthlyAED(b) - monthlyAED(a));
  const monthly = live.reduce((s, r) => s + monthlyAED(r), 0);
  const thisWeek = live.filter((r) => r.nextRenewal && daysFrom(today, r.nextRenewal) >= 0 && daysFrom(today, r.nextRenewal) <= 7);

  return (
    <div className="screen">
      <div className="navbar">
        {!demo && (
          <>
            <button className="nav-btn" onClick={scan} disabled={scanning || !connected}>
              {scanning ? "Checking…" : "Scan"}
            </button>
            <button className="nav-btn icon-btn" aria-label="Add subscription" onClick={() => setForm({ row: null })}>
              +
            </button>
          </>
        )}
      </div>
      <h1 className="large-title">Subscriptions</h1>
      {note}

      <div className="summary">
        <div className="lab">You spend</div>
        <div className="big">
          <small>AED</small>
          {money(monthly)}
          <span className="per" style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.41px" }}>
            {" "}
            / month
          </span>
        </div>
        <div className="meta">
          AED {money(monthly * 12)} a year · <b>{live.length}</b> active
          {thisWeek.length > 0 && (
            <>
              {" "}
              · <b style={{ color: "var(--orange)" }}>{thisWeek.length} renewing this week</b>
            </>
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <>
          <div className="section-h">
            <span>Check these</span>
          </div>
          <div className="group with-icons">
            {pending.map((r) => (
              <div className="row" key={r.id}>
                <AppIcon name={r.merchant} domain={r.logoDomain} />
                <div className="row-main">
                  <div className="title">
                    <span className="t">{splitVia(r.merchant).name}</span>
                  </div>
                  <div className="subtitle">
                    {r.amount != null ? `${r.currency} ${money(r.amount)} per ${CYCLE_LABEL[r.cycle].per}` : "Price unknown"}
                  </div>
                </div>
                <div className="row-end" style={{ gap: 6 }}>
                  <button className="pill-btn" onClick={() => review(r, "dismissed")}>
                    No
                  </button>
                  <button className="pill-btn primary" onClick={() => review(r, "confirmed")}>
                    Yes
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="section-f">Found in your email. Is this a subscription you pay for?</div>
        </>
      )}

      <div className="section-h">
        <span>Active</span>
        {active.length > 1 && <span>Most expensive first</span>}
      </div>
      <div className="group with-icons">
        {active.length ? (
          active.map((r) => <SubRowButton key={r.id} r={r} today={today} onOpen={setOpen} />)
        ) : (
          <div className="empty">
            {connected ? "Nothing yet. Tap Scan to check your inbox, or + to add one." : "Connect iCloud Mail in Settings to find your subscriptions."}
          </div>
        )}
      </div>

      {cancelled.length > 0 && (
        <>
          <div className="section-h">
            <span>Cancelled</span>
          </div>
          <div className="group with-icons">
            {cancelled.map((r) => (
              <SubRowButton key={r.id} r={r} today={today} onOpen={setOpen} />
            ))}
          </div>
        </>
      )}

      {open && (
        <DetailSheet
          row={open}
          today={today}
          readOnly={demo}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setForm({ row: open });
            setOpen(null);
          }}
          onToast={toast.show}
        />
      )}
      {form && (
        <FormSheet
          row={form.row}
          onClose={() => setForm(null)}
          onSaved={(m) => {
            setForm(null);
            toast.show(m);
          }}
        />
      )}
      {toast.node}
    </div>
  );
}
