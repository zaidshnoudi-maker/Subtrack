import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { monthlyEquivalent, toAED, type Cycle } from "@/lib/detection";
import { guessDomain } from "@/lib/detection/merchants";

const CYCLES: Cycle[] = ["weekly", "monthly", "quarterly", "yearly", "unknown"];
const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR", "INR"];

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

function monthlyAED(amount: number | null, cycle: Cycle, currency: string | null) {
  if (amount == null || !currency) return null;
  const m = monthlyEquivalent(amount, cycle);
  const v = m != null ? toAED(m, currency) : null;
  return v != null ? Math.round(v * 100) / 100 : null;
}

/** Manual add. */
export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const b = await req.json();
  const amount = Number(b.amount);
  const cycle = (CYCLES.includes(b.cycle) ? b.cycle : "monthly") as Cycle;
  const currency = CURRENCIES.includes(String(b.currency).toUpperCase()) ? String(b.currency).toUpperCase() : "AED";
  if (!b.merchant || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Name and a valid amount are required" }, { status: 400 });
  }
  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    merchant_key: `manual:${crypto.randomUUID()}`,
    merchant: String(b.merchant).slice(0, 80),
    category: b.category ?? "Other",
    logo_domain: guessDomain(String(b.merchant)),
    amount,
    currency,
    cycle,
    next_renewal: b.next_renewal || null,
    monthly_cost_aed: monthlyAED(amount, cycle, currency),
    status: "active",
    review_state: "confirmed",
    source: "manual",
    confidence: 1,
    user_edited: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/**
 * Update a subscription:
 *  - { id, review_state } → confirm / dismiss
 *  - { id, merchant?, amount?, currency?, cycle?, next_renewal?, status? } → edit (locks it from re-scan overwrites)
 */
export async function PATCH(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (b.review_state !== undefined) {
    if (!["confirmed", "dismissed", "pending"].includes(b.review_state)) {
      return NextResponse.json({ error: "Invalid review_state" }, { status: 400 });
    }
    const { error } = await supabase.from("subscriptions").update({ review_state: b.review_state }).eq("id", b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { data: cur, error: readErr } = await supabase
    .from("subscriptions")
    .select("amount, currency, cycle")
    .eq("id", b.id)
    .single();
  if (readErr || !cur) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const amount = b.amount !== undefined ? Number(b.amount) : cur.amount != null ? Number(cur.amount) : null;
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const currency = b.currency !== undefined ? String(b.currency).toUpperCase() : cur.currency;
  if (currency && !CURRENCIES.includes(currency)) return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  const cycle = (b.cycle !== undefined ? b.cycle : cur.cycle) as Cycle;
  if (!CYCLES.includes(cycle)) return NextResponse.json({ error: "Invalid cycle" }, { status: 400 });

  const update: Record<string, unknown> = {
    amount,
    currency,
    cycle,
    monthly_cost_aed: monthlyAED(amount, cycle, currency),
    review_state: "confirmed",
    user_edited: true,
    updated_at: new Date().toISOString(),
  };
  if (b.merchant !== undefined) {
    update.merchant = String(b.merchant).slice(0, 80);
    const guess = guessDomain(String(b.merchant));
    if (guess) update.logo_domain = guess;
  }
  if (b.next_renewal !== undefined) update.next_renewal = b.next_renewal || null;
  if (b.status !== undefined) {
    if (!["active", "trial", "possibly_cancelled", "cancelled"].includes(b.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = b.status;
  }

  const { error } = await supabase.from("subscriptions").update(update).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Delete one subscription. */
export async function DELETE(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
