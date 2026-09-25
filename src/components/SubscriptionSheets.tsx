"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppIcon, Chevron, Sheet } from "./ios/parts";
import { CYCLE_LABEL, daysFrom, money, relDays, shortDate, splitVia } from "@/lib/format";
import { monthlyAED, priceWentUp, type SubRow } from "@/lib/subrow";

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR"];

/** Tap a subscription → this sheet. `readOnly` hides edit/remove (demo). */
export function DetailSheet({
  row,
  today,
  onClose,
  onEdit,
  onToast,
  readOnly = false,
}: {
  row: SubRow;
  today: string;
  onClose: () => void;
  onEdit: () => void;
  onToast: (m: string) => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const { name, via } = splitVia(row.merchant);
  const per = CYCLE_LABEL[row.cycle].per;
  const n = row.nextRenewal ? daysFrom(today, row.nextRenewal) : null;
  const monthly = monthlyAED(row);

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/subscriptions", { method: "DELETE", body: JSON.stringify({ id: row.id }) });
    setBusy(false);
    if (!res.ok) return onToast("Couldn't remove it. Try again.");
    onClose();
    onToast("Removed");
    router.refresh();
  }

  return (
    <Sheet onClose={onClose} label={name}>
      <div className="sheet-head">
        <span />
        <span className="sheet-title" />
        <button className="nav-btn" style={{ fontWeight: 600 }} onClick={onClose}>
          Done
        </button>
      </div>
      <div className="sheet-hero">
        <AppIcon name={name} domain={row.logoDomain} size="lg" />
        <div className="name">{name}</div>
        {row.amount != null && (
          <div className="price">
            {row.currency} {money(row.amount)} per {per}
          </div>
        )}
        {row.status === "trial" && <span className="tag orange" style={{ margin: 0 }}>Free trial</span>}
        {row.status === "cancelled" && <span className="tag gray" style={{ margin: 0 }}>Cancelled</span>}
        {row.status === "possibly_cancelled" && <span className="tag gray" style={{ margin: 0 }}>No recent payment</span>}
      </div>

      {priceWentUp(row, today) && (
        <div className="note" style={{ marginTop: 14, color: "var(--red)" }}>
          Price went up from {row.currency} {money(row.previousAmount!)} to {row.currency} {money(row.amount!)}.
        </div>
      )}

      <div className="section-h">
        <span>Billing</span>
      </div>
      <div className="group">
        <div className="row">
          <div className="row-main">{row.status === "trial" ? "Trial ends" : "Next payment"}</div>
          <div className="value">
            {row.nextRenewal ? `${shortDate(row.nextRenewal)}${n != null && n >= 0 && n <= 30 ? ` · ${relDays(n)}` : ""}` : "—"}
          </div>
        </div>
        <div className="row">
          <div className="row-main">Billed</div>
          <div className="value">{CYCLE_LABEL[row.cycle].name}</div>
        </div>
        <div className="row">
          <div className="row-main">Cost per month</div>
          <div className="value">AED {money(monthly)}</div>
        </div>
        <div className="row">
          <div className="row-main">Cost per year</div>
          <div className="value">AED {money(monthly * 12)}</div>
        </div>
      </div>

      <div className="section-h">
        <span>Details</span>
      </div>
      <div className="group">
        <div className="row">
          <div className="row-main">Category</div>
          <div className="value">{row.category ?? "Other"}</div>
        </div>
        {via && (
          <div className="row">
            <div className="row-main">Billed through</div>
            <div className="value">{via}</div>
          </div>
        )}
        <div className="row">
          <div className="row-main">Source</div>
          <div className="value">
            {row.source === "manual"
              ? "Added by you"
              : `Found in email${row.confidence != null ? ` · ${Math.round(row.confidence * 100)}% sure` : ""}`}
          </div>
        </div>
      </div>

      {!readOnly && (
        <>
          <div className="group" style={{ marginTop: 26 }}>
            <button className="row action" onClick={onEdit}>
              Edit Subscription
            </button>
            <button className="row destructive" onClick={() => setConfirming(true)}>
              Remove from List
            </button>
          </div>
          {confirming && (
            <div className="confirm-box">
              <div className="caption">Remove {name} from SubTrack? This doesn&apos;t cancel it with the provider.</div>
              <div className="actions">
                <button className="pill-btn" onClick={() => setConfirming(false)}>
                  Keep
                </button>
                <button className="pill-btn primary" style={{ background: "var(--red)" }} disabled={busy} onClick={remove}>
                  Remove
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

/** Add (row = null) or edit a subscription. */
export function FormSheet({
  row,
  onClose,
  onSaved,
}: {
  row: SubRow | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const router = useRouter();
  const isNew = !row;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/subscriptions", {
      method: isNew ? "POST" : "PATCH",
      body: JSON.stringify(isNew ? f : { id: row!.id, ...f }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error);
    onSaved(isNew ? "Added" : "Saved");
    router.refresh();
  }

  return (
    <Sheet onClose={onClose} label={isNew ? "New subscription" : "Edit subscription"}>
      <form onSubmit={submit}>
        <div className="sheet-head">
          <button type="button" className="nav-btn" onClick={onClose}>
            Cancel
          </button>
          <span className="sheet-title">{isNew ? "New Subscription" : "Edit"}</span>
          <button type="submit" className="nav-btn" style={{ fontWeight: 600 }} disabled={busy}>
            {isNew ? "Add" : "Save"}
          </button>
        </div>

        <div className="group" style={{ marginTop: 12 }}>
          <div className="field">
            <input className="left" name="merchant" required placeholder="Name, e.g. Gym" defaultValue={row?.merchant ?? ""} aria-label="Name" autoFocus />
          </div>
        </div>

        <div className="group" style={{ marginTop: 26 }}>
          <div className="field">
            <label htmlFor="f-amount">Price</label>
            <input id="f-amount" name="amount" type="number" inputMode="decimal" step="0.01" min="0" required placeholder="0.00" defaultValue={row?.amount ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="f-cur">Currency</label>
            <div className="select-wrap">
              <select id="f-cur" name="currency" defaultValue={row?.currency ?? "AED"}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>
          <div className="field">
            <label htmlFor="f-cycle">Billed</label>
            <div className="select-wrap">
              <select id="f-cycle" name="cycle" defaultValue={row && row.cycle !== "unknown" ? row.cycle : "monthly"}>
                {(["monthly", "yearly", "quarterly", "weekly"] as const).map((c) => (
                  <option key={c} value={c}>
                    {CYCLE_LABEL[c].name}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>
          <div className="field">
            <label htmlFor="f-next">Next payment</label>
            <input id="f-next" name="next_renewal" type="date" defaultValue={row?.nextRenewal ?? ""} />
          </div>
        </div>

        {!isNew && (
          <>
            <div className="group" style={{ marginTop: 26 }}>
              <div className="field">
                <label htmlFor="f-status">Status</label>
                <div className="select-wrap">
                  <select id="f-status" name="status" defaultValue={row!.status === "possibly_cancelled" ? "active" : row!.status}>
                    <option value="active">Active</option>
                    <option value="trial">Free trial</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Chevron />
                </div>
              </div>
            </div>
            <div className="section-f">Your changes are kept. The daily check won&apos;t overwrite them.</div>
          </>
        )}
        {error && <div className="error-text">{error}</div>}
      </form>
    </Sheet>
  );
}
