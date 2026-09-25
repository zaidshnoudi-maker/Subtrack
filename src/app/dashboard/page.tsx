import { Suspense } from "react";
import Link from "next/link";
import { loadUserData } from "@/lib/load";
import { todayInDubai } from "@/lib/reminders";
import { SubscriptionsScreen } from "@/components/SubscriptionsScreen";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { rows, connected, needsReconnect } = await loadUserData();

  const note = !connected ? (
    <div className="note" style={{ marginBottom: 12 }}>
      Connect iCloud Mail so SubTrack can find your subscriptions. <Link href="/settings">Open Settings</Link>
    </div>
  ) : needsReconnect ? (
    <div className="note" style={{ marginBottom: 12, color: "var(--red)" }}>
      Apple rejected the saved password, so daily checks are paused. <Link href="/settings">Reconnect</Link>
    </div>
  ) : null;

  return (
    <Suspense>
      <SubscriptionsScreen rows={rows} today={todayInDubai()} note={note} connected={connected} />
    </Suspense>
  );
}
