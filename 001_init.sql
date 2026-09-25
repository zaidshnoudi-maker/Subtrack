-- SubTrack initial schema. Run in Supabase SQL editor (or `supabase db push`).

-- Connected inboxes. Holds OAuth refresh tokens, so NO client access:
-- RLS is on with no policies -> only the server (service role key) can read it.
create table public.email_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null default 'gmail' check (provider in ('gmail', 'outlook')),
  email text,
  refresh_token text not null,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider, email)
);
alter table public.email_connections enable row level security;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  merchant_key text not null,            -- e.g. 'netflix', 'apple:icloud_with_200_gb', 'manual:<uuid>'
  merchant text not null,
  category text,
  amount numeric(12, 2),
  currency text,
  cycle text not null default 'unknown' check (cycle in ('weekly','monthly','quarterly','yearly','unknown')),
  last_charged date,
  next_renewal date,
  monthly_cost_aed numeric(12, 2),
  status text not null default 'active' check (status in ('active','trial','possibly_cancelled','cancelled')),
  review_state text not null default 'pending' check (review_state in ('pending','confirmed','dismissed')),
  source text not null default 'gmail' check (source in ('gmail','outlook','statement','manual')),
  confidence numeric(3, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, merchant_key)
);

-- One row per receipt email; we keep the message id, never the email body.
create table public.detected_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subscription_id uuid references public.subscriptions on delete cascade,
  source_message_id text not null,
  merchant_key text not null,
  amount numeric(12, 2),
  currency text,
  charged_on date,
  kind text,
  method text,
  confidence numeric(3, 2),
  created_at timestamptz not null default now(),
  unique (user_id, source_message_id)
);

alter table public.subscriptions enable row level security;
alter table public.detected_charges enable row level security;

create policy "own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own charges" on public.detected_charges
  for select using (auth.uid() = user_id);

create index on public.subscriptions (user_id, next_renewal);
