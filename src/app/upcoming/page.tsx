import { loadUserData } from "@/lib/load";
import { todayInDubai } from "@/lib/reminders";
import { UpcomingScreen } from "@/components/UpcomingScreen";

export const dynamic = "force-dynamic";

export default async function Upcoming() {
  const { rows } = await loadUserData();
  return <UpcomingScreen rows={rows} today={todayInDubai()} />;
}
