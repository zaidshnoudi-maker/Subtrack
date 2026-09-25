# SubTrack

All your subscriptions in one view, detected automatically from the receipts in your iCloud Mail.

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind) · Supabase (Auth + Postgres) · iCloud Mail over IMAP (Gmail API code kept for later) · optional Claude API fallback for unknown merchants.

## What works today

| Area | Status |
| --- | --- |
| Detection engine (21 merchants incl. UAE: OSN+, Shahid, Anghami, Careem Plus, talabat pro, noon One) | Done, 13 tests pass |
| Apple / Google Play receipts split per app | Done |
| Cycle, next renewal, trial / cancelled status, AED/month | Done |
| `/demo` page on a sample inbox | Done |
| Email-link sign-in + iCloud Mail connection (app-specific password, encrypted) | Built, needs your keys |
| Scan + dashboard (totals, 7-day renewals, confirm/dismiss, manual add) | Built, needs your keys |
| **Phase 1:** edit / remove a subscription (edits survive re-scans) | Built |
| **Phase 1:** Settings — disconnect inbox, delete all data | Built |
| **Phase 1:** inbox credential encrypted at rest (AES-256-GCM) | Built, 4 tests pass |
| **Phase 1:** daily automatic re-scan (Vercel Cron, 06:00 UAE) + "reconnect" banner if access is revoked | Built |
| AI fallback for unknown senders | Built, optional key |

## 1. Run the demo (5 minutes, no accounts)

Requires [Node.js 20+](https://nodejs.org).

```bash
npm install
npm run test:engine   # prints detected subscriptions + 13 checks
npm run dev           # open http://localhost:3100/demo
```

## 2. Set up Supabase (~10 minutes, works on a phone)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run `001_init.sql`, then `002_phase1.sql`, then `003_icloud.sql`.
3. Project Settings → API Keys → copy the Project URL, publishable (anon) key and secret (service_role) key. They go into Vercel (step 3) or `.env.local` for local runs.
4. After deploying: Authentication → URL Configuration → set **Site URL** to your Vercel address and add `https://<your-app>.vercel.app/auth/callback` to Redirect URLs.

Sign-in uses Supabase's built-in email links, so there is no Google Cloud setup.

### Connecting iCloud Mail (each user, in the app)
1. [account.apple.com](https://account.apple.com) → Sign-In and Security → **App-Specific Passwords** → create one called SubTrack.
2. In SubTrack → Settings, enter your iCloud email and that password. SubTrack checks it with Apple before saving it (encrypted).
3. Revoke it any time at account.apple.com.

### Optional AI fallback
Add `ANTHROPIC_API_KEY`. Used only for billing-like emails the rules can't parse.

## 3. Put it online (Vercel, ~15 minutes)

Needed for the daily re-scan and so the app works when your laptop is off.

1. Put the project on GitHub (web upload or GitHub Desktop). Never upload `.env.local`, `node_modules` or `.next`.
2. [vercel.com](https://vercel.com) → Add New Project → import the repo.
3. Settings → Environment Variables → add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET` (generate the last two with `npm run setup:env` or ask Claude). Never change `TOKEN_ENCRYPTION_KEY` afterwards.
4. Deploy. You get a URL like `https://subtrack-xyz.vercel.app`.
5. Do Supabase step 4 above with this address.
6. The daily scan is set up by `vercel.json` (02:00 UTC = 06:00 UAE).

## Project map

```
src/lib/detection/     ← the brain (pure TypeScript, no framework)
  merchants.ts         known merchants — add new ones here
  parse.ts             email → charge (amount, currency, cycle, renewal date, trial/cancel)
  group.ts             charges → subscriptions (cycle inference, next renewal, status)
  currency.ts          AED conversion
  samples.ts           sample inbox for demo/tests
src/lib/icloud.ts      iCloud Mail search + fetch over IMAP
src/lib/gmail.ts       Gmail search + fetch (not active; kept for later)
src/lib/llm.ts         Claude fallback extractor
src/lib/scan.ts        scan one user (used by button + daily cron)
src/lib/crypto.ts      token encryption
src/app/api/scan       scan endpoint (button)
src/app/api/cron/scan  daily re-scan of all users
src/app/api/subscriptions  add, edit, confirm/dismiss, remove
src/app/api/connect/icloud  verify + save iCloud connection
src/app/api/account    disconnect inbox, delete all data
src/app/settings       connection status + data controls
src/app/dashboard      signed-in view
src/app/demo           no-login demo
supabase/migrations    database schema + row-level security
```

## Privacy by design
- The inbox search only targets receipts, invoices and renewal emails.
- Email bodies are processed in memory and **never stored** — only merchant, amount, dates and the email's message ID.
- The iCloud app-specific password is encrypted (AES-256-GCM) and lives in a table clients can't read (RLS, server-only). Users can revoke it at Apple any time.
- One click disconnects the inbox or deletes all data and the account.

## Next (Phase 2)
- Gmail and Outlook inboxes (Gmail code already written)
- Card statement upload (PDF/CSV) to catch subs with no email receipts
- Live FX rates instead of static ones
- More merchant parsers from real-inbox testing
