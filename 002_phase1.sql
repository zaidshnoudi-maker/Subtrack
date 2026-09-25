-- Phase 1: user edits survive re-scans; faster cron lookups.
-- Run in Supabase SQL editor after 001_init.sql.

alter table public.subscriptions
  add column if not exists user_edited boolean not null default false;

create index if not exists email_connections_provider_idx
  on public.email_connections (provider, last_scanned_at);

-- Set when Google rejects the refresh token (user revoked access); UI asks to reconnect.
alter table public.email_connections
  add column if not exists needs_reconnect boolean not null default false;
