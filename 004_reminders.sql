-- Renewal reminders. Run after 003.

-- Remember the old price when a scan finds an increase.
alter table public.subscriptions
  add column if not exists previous_amount numeric(12, 2),
  add column if not exists price_changed_at date;

-- Per-user reminder preferences (a missing row means the defaults: on, 3 days before).
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  reminders_enabled boolean not null default true,
  days_before int not null default 3 check (days_before between 1 and 14),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Log of reminders already emailed, so each one is sent exactly once. Server-only (no policies).
create table if not exists public.reminders_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subscription_id uuid not null references public.subscriptions on delete cascade,
  kind text not null check (kind in ('renewal', 'trial', 'price')),
  for_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, subscription_id, kind, for_date)
);
alter table public.reminders_sent enable row level security;
