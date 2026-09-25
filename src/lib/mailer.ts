import "server-only";

/**
 * Sends email through Resend (https://resend.com, free tier: 3,000 emails/month).
 * Env: RESEND_API_KEY, REMINDER_FROM (optional).
 * Without a verified domain, Resend's test sender only delivers to the email
 * address you signed up to Resend with — fine for personal use.
 */
export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<string | null> {
  if (!mailEnabled()) return "Email sending isn't set up yet (RESEND_API_KEY is missing).";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM || "SubTrack <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (res.ok) return null;
  const body = await res.text();
  return `Email provider rejected the message (${res.status}): ${body.slice(0, 200)}`;
}

export function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3100";
}
