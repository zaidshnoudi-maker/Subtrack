import "server-only";
// @ts-ignore -- types come from the package when available
import { ImapFlow } from "imapflow";
// @ts-ignore -- types come from @types/mailparser when available
import { simpleParser } from "mailparser";
import type { RawEmail } from "./detection";
import { htmlToText } from "./html";

/**
 * iCloud Mail over IMAP (read-only use).
 * Apple has no OAuth for mail, so the user creates an app-specific password at
 * account.apple.com → Sign-In and Security → App-Specific Passwords.
 */
const HOST = "imap.mail.me.com";

const SUBJECT_WORDS = ["receipt", "invoice", "subscription", "renew", "membership", "trial", "payment", "billing"];
const SENDERS = [
  "apple.com", "netflix.com", "spotify.com", "openai.com", "anthropic.com", "osnplus.com", "shahid.net",
  "anghami.com", "starzplay.com", "disneyplus.com", "canva.com", "adobe.com", "careem.com", "talabat.com",
  "noon.com", "youtube.com", "google.com", "amazon.ae", "amazon.com", "microsoft.com",
];

function client(user: string, pass: string) {
  return new ImapFlow({
    host: HOST,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 30_000,
  });
}

/** Check the email + app-specific password. Returns null if OK, or a user-facing error. */
export async function testICloudLogin(user: string, pass: string): Promise<string | null> {
  const c = client(user, pass);
  try {
    await c.connect();
    await c.logout();
    return null;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/auth|login|credentials|invalid/i.test(msg)) {
      return "Apple rejected the login. Use an app-specific password (not your Apple ID password) and your full iCloud email address.";
    }
    return "Couldn't reach iCloud Mail. Try again in a minute.";
  }
}

/** Fetch billing-like emails from Inbox and Archive, newest first, capped at `max`. */
export async function fetchICloudBillingEmails(user: string, pass: string, max = 300): Promise<RawEmail[]> {
  const c = client(user, pass);
  await c.connect();
  const since = new Date();
  since.setMonth(since.getMonth() - 13);

  const folders = ["INBOX"];
  try {
    const list = await c.list();
    const archive = list.find((f: { specialUse?: string; path: string }) => f.specialUse === "\\Archive" || /^archive$/i.test(f.path));
    if (archive) folders.push(archive.path);
  } catch {
    // Inbox only
  }

  const emails: RawEmail[] = [];
  try {
    for (const folder of folders) {
      if (emails.length >= max) break;
      const lock = await c.getMailboxLock(folder);
      try {
        const query = {
          since,
          or: [...SUBJECT_WORDS.map((w) => ({ subject: w })), ...SENDERS.map((d) => ({ from: d }))],
        };
        const found = await c.search(query, { uid: true });
        const uids = (found || []).slice(-(max - emails.length)); // newest last → keep the most recent
        if (uids.length === 0) continue;
        for await (const msg of c.fetch(uids, { source: true, internalDate: true }, { uid: true })) {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const text = (parsed.text && parsed.text.trim()) || (parsed.html ? htmlToText(String(parsed.html)) : "");
          const date = parsed.date ?? (msg.internalDate ? new Date(msg.internalDate) : new Date());
          emails.push({
            id: parsed.messageId ?? `icloud:${folder}:${msg.uid}`,
            from: parsed.from?.text ?? "",
            subject: parsed.subject ?? "",
            date: date.toISOString(),
            text: text.slice(0, 8000), // held in memory only, never stored
          });
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await c.logout().catch(() => undefined);
  }
  return emails;
}
