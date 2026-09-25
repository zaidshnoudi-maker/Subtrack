import "server-only";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "./supabase/server";
import { fromDb, type SubRow } from "./subrow";

/** Signed-in user's subscriptions + whether an inbox is connected. Redirects to / if signed out. */
export async function loadUserData() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data } = await supabase.from("subscriptions").select("*");
  const rows: SubRow[] = (data ?? []).map((r: Record<string, unknown>) => fromDb(r));

  const { data: conns } = await createServiceClient()
    .from("email_connections")
    .select("needs_reconnect")
    .eq("user_id", auth.user.id);
  const list = (conns ?? []) as { needs_reconnect: boolean }[];

  return {
    user: auth.user,
    rows,
    connected: list.length > 0,
    needsReconnect: list.some((c) => c.needs_reconnect),
  };
}
