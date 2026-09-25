"use client";
import { useState } from "react";
import { Chevron, useToast } from "./ios/parts";
import { DetailSheet, FormSheet } from "./SubscriptionSheets";
import { dayOfMonth, daysFrom, money, relDays, shortDate, splitVia, weekday } from "@/lib/format";
import { isLive, paymentAED, type SubRow } from "@/lib/subrow";

const GROUPS: [string, number, number][] = [
  ["This week", 0, 7],
  ["Next week", 8, 14],
  ["Later this month", 15, 30],
];

export function UpcomingScreen({ rows, today, demo = false }: { rows: SubRow[]; today: string; demo?: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState<SubRow | null>(null);
  const [edit, setEdit] = useState<SubRow | null>(null);

  const dated = rows.filter((r) => isLive(r) && r.nextRenewal).sort((a, b) => a.nextRenewal!.localeCompare(b.nextRenewal!));
  const within = dated.filter((r) => {
    const n = daysFrom(today, r.nextRenewal!);
    return n >= 0 && n <= 30;
  });
  const later = dated.filter((r) => daysFrom(today, r.nextRenewal!) > 30).slice(0, 3);
  const total = within.reduce((s, r) => s + paymentAED(r), 0);
  const week = within.filter((r) => daysFrom(today, r.nextRenewal!) <= 7).reduce((s, r) => s + paymentAED(r), 0);

  return (
    <div className="screen">
      <div className="navbar" />
      <h1 className="large-title">Upcoming</h1>

      <div className="summary">
        <div className="lab">Due in the next 30 days</div>
        <div className="big">
          <small>AED</small>
          {money(total)}
        </div>
        <div className="meta">
          {within.length} {within.length === 1 ? "payment" : "payments"} · <b>AED {money(week)}</b> this week
        </div>
      </div>

      {GROUPS.map(([name, a, b]) => {
        const items = within.filter((r) => {
          const n = daysFrom(today, r.nextRenewal!);
          return n >= a && n <= b;
        });
        if (!items.length) return null;
        return (
          <div key={name}>
            <div className="section-h">
              <span>{name}</span>
              <span className="num">AED {money(items.reduce((s, r) => s + paymentAED(r), 0))}</span>
            </div>
            <div className="group">
              {items.map((r) => {
                const n = daysFrom(today, r.nextRenewal!);
                const trial = r.status === "trial";
                return (
                  <button key={r.id} className="row" style={{ paddingBlock: 8 }} onClick={() => setOpen(r)}>
                    <div className="date-tile" aria-hidden="true">
                      <span className="dow">{weekday(r.nextRenewal!)}</span>
                      <span className="day">{dayOfMonth(r.nextRenewal!)}</span>
                    </div>
                    <div className="row-main">
                      <div className="title">
                        <span className="t">{splitVia(r.merchant).name}</span>
                      </div>
                      <div className="subtitle" style={trial ? { color: "var(--orange)" } : undefined}>
                        {trial ? "Free trial ends" : "Renews"} · {relDays(n)}
                      </div>
                    </div>
                    <div className="row-end">
                      {r.amount != null && (
                        <div className="amount">
                          {r.currency} {money(r.amount)}
                        </div>
                      )}
                      <Chevron />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {within.length === 0 && (
        <div className="group" style={{ marginTop: 26 }}>
          <div className="empty">Nothing renews in the next 30 days.</div>
        </div>
      )}
      {later.length > 0 && (
        <div className="section-f" style={{ marginTop: 14 }}>
          After that: {later.map((r) => `${splitVia(r.merchant).name} on ${shortDate(r.nextRenewal!)}`).join(", ")}.
        </div>
      )}

      {open && (
        <DetailSheet
          row={open}
          today={today}
          readOnly={demo}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setEdit(open);
            setOpen(null);
          }}
          onToast={toast.show}
        />
      )}
      {edit && (
        <FormSheet
          row={edit}
          onClose={() => setEdit(null)}
          onSaved={(m) => {
            setEdit(null);
            toast.show(m);
          }}
        />
      )}
      {toast.node}
    </div>
  );
}
