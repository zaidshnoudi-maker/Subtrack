import type { Cycle } from "./types";

export interface Merchant {
  key: string;
  name: string;
  category: string;
  /** Sender domains (matched as suffix of the From address domain). */
  domains: string[];
  defaultCycle: Cycle;
  /** Optional extra check on subject/body, for shared senders like Apple/Google. */
  match?: RegExp;
}

/**
 * Known merchants. Order matters: the first match wins, so put specific
 * entries (YouTube Premium) before generic ones on the same domain (Google).
 * Add new merchants here — no other code change needed.
 */
export const MERCHANTS: Merchant[] = [
  { key: "netflix", name: "Netflix", category: "Streaming", domains: ["netflix.com"], defaultCycle: "monthly" },
  { key: "spotify", name: "Spotify", category: "Music", domains: ["spotify.com"], defaultCycle: "monthly" },
  { key: "anghami", name: "Anghami", category: "Music", domains: ["anghami.com"], defaultCycle: "monthly" },
  { key: "osnplus", name: "OSN+", category: "Streaming", domains: ["osnplus.com", "osn.com"], defaultCycle: "monthly" },
  { key: "shahid", name: "Shahid VIP", category: "Streaming", domains: ["shahid.net", "mbc.net"], defaultCycle: "monthly" },
  { key: "starzplay", name: "STARZPLAY", category: "Streaming", domains: ["starzplay.com"], defaultCycle: "monthly" },
  { key: "disneyplus", name: "Disney+", category: "Streaming", domains: ["disneyplus.com"], defaultCycle: "monthly" },
  { key: "youtube_premium", name: "YouTube Premium", category: "Streaming", domains: ["youtube.com", "google.com"], defaultCycle: "monthly", match: /youtube (premium|music)/i },
  { key: "google_one", name: "Google One", category: "Cloud storage", domains: ["google.com"], defaultCycle: "monthly", match: /google one/i },
  { key: "amazon_prime", name: "Amazon Prime", category: "Shopping", domains: ["amazon.ae", "amazon.com", "amazon.sa"], defaultCycle: "monthly", match: /prime/i },
  { key: "noon_one", name: "noon One", category: "Shopping", domains: ["noon.com"], defaultCycle: "monthly", match: /noon one/i },
  { key: "careem_plus", name: "Careem Plus", category: "Delivery & rides", domains: ["careem.com"], defaultCycle: "monthly", match: /careem plus/i },
  { key: "talabat_pro", name: "talabat pro", category: "Delivery & rides", domains: ["talabat.com"], defaultCycle: "monthly", match: /\bpro\b/i },
  { key: "chatgpt", name: "ChatGPT Plus", category: "AI tools", domains: ["openai.com"], defaultCycle: "monthly" },
  { key: "claude", name: "Claude", category: "AI tools", domains: ["anthropic.com"], defaultCycle: "monthly" },
  { key: "microsoft365", name: "Microsoft 365", category: "Productivity", domains: ["microsoft.com"], defaultCycle: "yearly", match: /microsoft 365|office 365/i },
  { key: "adobe", name: "Adobe", category: "Productivity", domains: ["adobe.com"], defaultCycle: "monthly" },
  { key: "canva", name: "Canva", category: "Productivity", domains: ["canva.com"], defaultCycle: "yearly" },
  { key: "notion", name: "Notion", category: "Productivity", domains: ["notion.so"], defaultCycle: "monthly" },
  { key: "dropbox", name: "Dropbox", category: "Cloud storage", domains: ["dropbox.com"], defaultCycle: "yearly" },
  { key: "linkedin_premium", name: "LinkedIn Premium", category: "Productivity", domains: ["linkedin.com"], defaultCycle: "monthly", match: /premium/i },
];

/** Apple and Google Play bill for many different apps; we split by item name. */
export const APP_STORES = [
  { key: "apple", name: "Apple", domains: ["apple.com"] },
  { key: "google_play", name: "Google Play", domains: ["google.com"], match: /google play/i },
];

export function senderDomain(from: string): string {
  const m = from.match(/@([a-z0-9.-]+)/i);
  return m ? m[1].toLowerCase() : "";
}

export function domainMatches(domain: string, candidates: string[]): boolean {
  return candidates.some((d) => domain === d || domain.endsWith("." + d));
}

export function findMerchant(from: string, haystack: string): Merchant | null {
  const domain = senderDomain(from);
  for (const m of MERCHANTS) {
    if (!domainMatches(domain, m.domains)) continue;
    if (m.match && !m.match.test(haystack)) continue;
    return m;
  }
  return null;
}

/** Apps commonly billed through Apple / Google Play → their own website, for the logo. */
const APP_DOMAINS: [RegExp, string][] = [
  [/^icloud/i, "icloud.com"],
  [/^apple music/i, "music.apple.com"],
  [/^apple tv/i, "tv.apple.com"],
  [/^apple one/i, "apple.com"],
  [/^calm/i, "calm.com"],
  [/^headspace/i, "headspace.com"],
  [/^duolingo/i, "duolingo.com"],
  [/^youtube/i, "youtube.com"],
  [/^spotify/i, "spotify.com"],
  [/^netflix/i, "netflix.com"],
  [/^chatgpt/i, "openai.com"],
  [/^tinder/i, "tinder.com"],
  [/^strava/i, "strava.com"],
];

/** Registrable domain, e.g. "mail.account.netflix.com" → "netflix.com", "amazon.co.uk" stays. */
export function rootDomain(domain: string): string {
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const secondLevel = /^(co|com|net|org|gov|ac|edu)$/.test(parts[parts.length - 2]) && parts[parts.length - 1].length === 2;
  return parts.slice(secondLevel ? -3 : -2).join(".");
}

/** Best-guess website for a subscription name (used for manual entries and app-store items). */
export function guessDomain(name: string): string | null {
  const n = name.trim();
  for (const [re, d] of APP_DOMAINS) if (re.test(n)) return d;
  const m = MERCHANTS.find((x) => n.toLowerCase().startsWith(x.name.toLowerCase().split(" ")[0]));
  return m ? m.domains[0] : null;
}
