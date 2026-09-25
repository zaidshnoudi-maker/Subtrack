import "server-only";
import { createServiceClient } from "./supabase/server";
import { fetchBillingEmails, getAccessToken } from "./gmail";
import { fetchICloudBillingEmails } from "./icloud";
import type { RawEmail } from "./detection";
import { decryptToken } from "./crypto";
import { detectSubscriptions } from "./detection";
import { llmEnabled, llmExtract } from "./llm";
import { todayInDubai } from "./reminders";

export interface ScanResult {
  userId: string;
  scannedEmails: number;
  detected: number;
  error?: string;
}

/**
 * Scan one user's Gmail and save results. Uses the service-role client with
 * explicit user_id filters, so it works both from the API (signed-in user)
 * and from the daily cron (no user session).
 */
export async function scanUser(userId: string): Promise<ScanResult> {
  const db = createServiceClient();
  const { data: conns } = await db
    .from("email_connections")
    .select("id, provider, email, refresh_token")
    .eq("user_id", userId);
  if (!conns || conns.length === 0) return { userId, scannedEmails: 0, detected: 0, error: "No inbox connected" };

  // Gather billing emails from every connected inbox.
  const emails: RawEmail[] = [];
  const errors: string[] = [];
  for (const conn of conns) {
    try {
      if (conn.provider === "icloud") {
        emails.push(...(await fetchICloudBillingEmails(conn.email, decryptToken(conn.refresh_token))));
      } else if (conn.provider === "gmail") {
        const token = await getAccessToken(decryptToken(conn.refresh_token));
        emails.push(...(await fetchBillingEmails(token)));
      }
      await db.from("email_connections").update({ needs_reconnect: false }).eq("id", conn.id);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (/invalid_grant|auth|login|credentials/i.test(msg)) {
        await db.from("email_connections").update({ needs_reconnect: true }).eq("id", conn.id);
        errors.push(`${conn.email}: access was revoked or the password changed. Please reconnect.`);
      } else {
        errors.push(`${conn.email}: couldn't read the inbox right now.`);
      }
    }
  }
  if (emails.length === 0 && errors.length) {
    return { userId, scannedEmails: 0, detected: 0, error: errors.join(" ") };
  }

  const { charges, subscriptions } = await detectSubscriptions(emails, {
    llmExtract: llmEnabled() ? llmExtract : undefined,
  });

  // Never overwrite subscriptions the user edited by hand.
  const { data: edited } = await db
    .from("subscriptions")
    .select("merchant_key")
    .eq("user_id", userId)
    .eq("user_edited", true);
  const editedKeys = new Set((edited ?? []).map((r: { merchant_key: string }) => r.merchant_key));
  const toSave = subscriptions.filter((s) => !editedKeys.has(s.merchantKey));

  // Remember current prices so we can spot increases after saving.
  const { data: existing } = await db
    .from("subscriptions")
    .select("merchant_key, amount, currency")
    .eq("user_id", userId);
  const before = new Map<string, { amount: number | null; currency: string | null }>(
    (existing ?? []).map((r: { merchant_key: string; amount: number | string | null; currency: string | null }) => [
      r.merchant_key,
      { amount: r.amount != null ? Number(r.amount) : null, currency: r.currency },
    ]),
  );
  const increases = toSave.filter((s) => {
    const old = before.get(s.merchantKey);
    return old && old.amount != null && s.amount != null && old.currency === s.currency && s.amount > old.amount + 0.009;
  });

  if (toSave.length) {
    const { error } = await db.from("subscriptions").upsert(
      toSave.map((s) => ({
        user_id: userId,
        merchant_key: s.merchantKey,
        merchant: s.merchant,
        category: s.category,
        logo_domain: s.domain,
        amount: s.amount,
        currency: s.currency,
        cycle: s.cycle,
        last_charged: s.lastCharged,
        next_renewal: s.nextRenewal,
        monthly_cost_aed: s.monthlyCostAED,
        status: s.status,
        source: conns[0].provider,
        confidence: s.confidence,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,merchant_key" },
    );
    if (error) return { userId, scannedEmails: emails.length, detected: 0, error: error.message };
  }

  const today = todayInDubai();
  for (const s of increases) {
    await db
      .from("subscriptions")
      .update({ previous_amount: before.get(s.merchantKey)!.amount, price_changed_at: today })
      .eq("user_id", userId)
      .eq("merchant_key", s.merchantKey);
  }

  const { data: subRows } = await db.from("subscriptions").select("id, merchant_key").eq("user_id", userId);
  const idByKey = new Map((subRows ?? []).map((r: { id: string; merchant_key: string }) => [r.merchant_key, r.id]));
  if (charges.length) {
    await db.from("detected_charges").upsert(
      charges.map((c) => ({
        user_id: userId,
        subscription_id: idByKey.get(c.merchantKey) ?? null,
        source_message_id: c.emailId,
        merchant_key: c.merchantKey,
        amount: c.amount,
        currency: c.currency,
        charged_on: c.date,
        kind: c.kind,
        method: c.method,
        confidence: c.confidence,
      })),
      { onConflict: "user_id,source_message_id" },
    );
  }

  await db.from("email_connections").update({ last_scanned_at: new Date().toISOString() }).eq("user_id", userId);

  return { userId, scannedEmails: emails.length, detected: subscriptions.length };
}

/** Revoke Google access for a stored refresh token (best effort). iCloud passwords are revoked by the user at Apple. */
export async function revokeGoogleToken(storedToken: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: decryptToken(storedToken) }),
    });
  } catch {
    // ignore — deleting our copy is what matters
  }
}
