import "server-only";
import type { RawEmail } from "./detection";
import { htmlToText } from "./html";

/**
 * Minimal Gmail REST client (no googleapis dependency).
 * Scope required: https://www.googleapis.com/auth/gmail.readonly
 */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Gmail search: billing-type emails + known subscription senders, last 13 months. */
export const BILLING_QUERY = [
  "newer_than:13m",
  "-category:social",
  "{",
  "subject:(receipt OR invoice OR subscription OR renewal OR renew OR membership OR trial OR \"payment confirmation\" OR \"your payment\")",
  "from:(netflix.com OR spotify.com OR apple.com OR openai.com OR anthropic.com OR osnplus.com OR shahid.net OR anghami.com OR starzplay.com OR disneyplus.com OR canva.com OR adobe.com OR careem.com OR talabat.com OR noon.com OR youtube.com OR payments-noreply@google.com)",
  "}",
].join(" ");

/** Exchange a stored refresh token for a fresh access token. */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token as string;
}

async function gmailGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GMAIL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

interface Part {
  mimeType?: string;
  body?: { data?: string };
  parts?: Part[];
}
interface GmailMessage {
  id: string;
  internalDate: string;
  payload: Part & { headers: { name: string; value: string }[] };
}

function decode(data?: string): string {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function collect(part: Part, mime: string, out: string[]) {
  if (part.mimeType === mime && part.body?.data) out.push(decode(part.body.data));
  part.parts?.forEach((p) => collect(p, mime, out));
}

function toRawEmail(msg: GmailMessage): RawEmail {
  const h = (n: string) => msg.payload.headers.find((x) => x.name.toLowerCase() === n)?.value ?? "";
  const plain: string[] = [];
  collect(msg.payload, "text/plain", plain);
  let text = plain.join("\n");
  if (!text.trim()) {
    const html: string[] = [];
    collect(msg.payload, "text/html", html);
    text = htmlToText(html.join("\n"));
  }
  return {
    id: msg.id,
    from: h("from"),
    subject: h("subject"),
    date: new Date(Number(msg.internalDate)).toISOString(),
    text: text.slice(0, 8000), // bodies are only held in memory, never stored
  };
}

/** Fetch billing-like emails. `max` caps API usage per scan. */
export async function fetchBillingEmails(accessToken: string, max = 400): Promise<RawEmail[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({ q: BILLING_QUERY, maxResults: "100" });
    if (pageToken) q.set("pageToken", pageToken);
    const page = await gmailGet<{ messages?: { id: string }[]; nextPageToken?: string }>(`/messages?${q}`, accessToken);
    ids.push(...(page.messages ?? []).map((m) => m.id));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < max);

  const emails: RawEmail[] = [];
  const BATCH = 10; // stay well under Gmail per-user rate limits
  for (let i = 0; i < Math.min(ids.length, max); i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const msgs = await Promise.all(chunk.map((id) => gmailGet<GmailMessage>(`/messages/${id}?format=full`, accessToken)));
    emails.push(...msgs.map(toRawEmail));
  }
  return emails;
}
