import { Suspense } from "react";
import Link from "next/link";
import { detectSubscriptions } from "@/lib/detection";
import { SAMPLE_EMAILS } from "@/lib/detection/samples";
import { todayInDubai } from "@/lib/reminders";
import type { SubRow } from "@/lib/subrow";
import { SubscriptionsScreen } from "@/components/SubscriptionsScreen";
import { UpcomingScreen } from "@/components/UpcomingScreen";

/** Runs the real detection engine on a sample inbox. No account needed. */
export default async function DemoPage() {
  const today = todayInDubai();
  const { subscriptions } = await detectSubscriptions(SAMPLE_EMAILS, { today });
  const rows: SubRow[] = subscriptions.map((s) => ({
    id: s.merchantKey,
    merchant: s.merchant,
    category: s.category,
    logoDomain: s.domain,
    amount: s.amount,
    currency: s.currency,
    cycle: s.cycle,
    nextRenewal: s.nextRenewal,
    status: s.status,
    monthlyCostAED: s.monthlyCostAED,
    confidence: s.confidence,
    reviewState: s.confidence < 0.6 ? "pending" : "confirmed",
    source: "icloud",
  }));

  const note = (
    <div className="caption" style={{ marginBottom: 12 }}>
      Demo: {SAMPLE_EMAILS.length} sample emails → {subscriptions.length} found. <Link href="/">Sign in</Link> to see yours.
    </div>
  );

  return (
    <>
      <Suspense>
        <SubscriptionsScreen rows={rows} today={today} demo note={note} />
      </Suspense>
      <UpcomingScreen rows={rows} today={today} demo />
    </>
  );
}
