import type { RawEmail } from "./types";

/**
 * Realistic sample inbox used by the /demo page and the engine test.
 * Includes noise (shipping, newsletter, one-off purchase) that must be ignored.
 */
export const SAMPLE_EMAILS: RawEmail[] = [
  // Netflix — 3 monthly charges, no explicit renewal date (must be inferred)
  ...["2026-06-14", "2026-07-14", "2026-08-14"].map((d, i) => ({
    id: `nf-${i}`,
    from: "Netflix <info@account.netflix.com>",
    subject: "Your Netflix payment receipt",
    date: `${d}T08:00:00Z`,
    text: `Hi Zaid,\nThanks for your payment.\nPlan: Standard\nTotal: AED 56.00\nPayment method: Visa ••4821\nQuestions? Visit help.netflix.com`,
  })),

  // Spotify — explicit renewal date
  {
    id: "sp-1",
    from: "Spotify <no-reply@spotify.com>",
    subject: "Your Spotify Premium receipt",
    date: "2026-09-03T10:00:00Z",
    text: "Spotify Premium Individual\nAED 21.99 / month\nYour subscription renews on 3 October 2026.\nOrder ID 88223311",
  },

  // Apple — two different apps billed by Apple
  {
    id: "ap-1",
    from: "Apple <no_reply@email.apple.com>",
    subject: "Your receipt from Apple.",
    date: "2026-09-10T06:00:00Z",
    text: "Receipt\nApple Account: zaid@example.com\n\nSubscription: iCloud+ with 200 GB (Monthly)\nRenews 10 Oct 2026\nTotal AED 10.99",
  },
  {
    id: "ap-2",
    from: "Apple <no_reply@email.apple.com>",
    subject: "Your receipt from Apple.",
    date: "2026-02-20T06:00:00Z",
    text: "Receipt\nSubscription: Calm Premium (Annual)\nRenews 20 Feb 2027\nTotal AED 249.99",
  },

  // ChatGPT — USD, converted to AED
  {
    id: "oa-1",
    from: "OpenAI <noreply@tm.openai.com>",
    subject: "Your ChatGPT Plus subscription receipt",
    date: "2026-09-18T12:00:00Z",
    text: "ChatGPT Plus Subscription\nAmount paid $20.00\nBilled monthly. Next billing date: October 18, 2026",
  },

  // OSN+ — free trial ending soon
  {
    id: "osn-1",
    from: "OSN+ <hello@osnplus.com>",
    subject: "Your free trial ends soon",
    date: "2026-09-20T09:00:00Z",
    text: "Enjoying OSN+? Your free trial ends on 27/09/2026. After that you'll be charged AED 35 per month.",
  },

  // Shahid — was paying, then cancelled
  {
    id: "sh-1",
    from: "Shahid <noreply@shahid.net>",
    subject: "Shahid VIP payment confirmation",
    date: "2026-05-01T09:00:00Z",
    text: "Your Shahid VIP subscription payment of AED 19.99 was successful. Billed monthly.",
  },
  {
    id: "sh-2",
    from: "Shahid <noreply@shahid.net>",
    subject: "Your subscription has been cancelled",
    date: "2026-05-20T09:00:00Z",
    text: "We're sorry to see you go. Your subscription has been cancelled and will not renew.",
  },

  // Canva — yearly invoice
  {
    id: "cv-1",
    from: "Canva <receipts@canva.com>",
    subject: "Invoice for Canva Pro",
    date: "2026-03-05T09:00:00Z",
    text: "Canva Pro — Annual plan\nAmount charged: USD 119.99\nThis plan renews on March 5, 2027.",
  },

  // Unknown merchant — handled by generic rules
  {
    id: "hs-1",
    from: "Headspace Billing <billing@headspace.com>",
    subject: "Your Headspace subscription receipt",
    date: "2026-08-28T09:00:00Z",
    text: "Thanks for subscribing!\nHeadspace Annual\nTotal: $69.99 per year",
  },

  // Careem Plus — two monthly charges, cycle inferred from dates
  ...["2026-08-02", "2026-09-02"].map((d, i) => ({
    id: `cr-${i}`,
    from: "Careem <no-reply@careem.com>",
    subject: "Your Careem Plus membership payment",
    date: `${d}T07:00:00Z`,
    text: "Careem Plus membership\nYou paid AED 19.00\nThank you for being a Careem Plus member.",
  })),

  // ---- Noise: must NOT become subscriptions ----
  {
    id: "noise-1",
    from: "Amazon.ae <shipment-tracking@amazon.ae>",
    subject: "Your order has shipped",
    date: "2026-09-12T09:00:00Z",
    text: "Your package with 1 item has shipped. Order total AED 149.00",
  },
  {
    id: "noise-2",
    from: "Medium Daily Digest <noreply@medium.com>",
    subject: "Top stories for you",
    date: "2026-09-12T09:00:00Z",
    text: "Stories picked for you today.",
  },
  {
    id: "noise-3",
    from: "IKEA UAE <no-reply@ikea.ae>",
    subject: "Your payment receipt",
    date: "2026-09-01T09:00:00Z",
    text: "Thank you for shopping. Total AED 830.00. Paid by card.",
  },
];
