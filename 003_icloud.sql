-- iCloud Mail support (IMAP + app-specific password). Run after 002.
alter table public.email_connections drop constraint if exists email_connections_provider_check;
alter table public.email_connections
  add constraint email_connections_provider_check check (provider in ('gmail', 'outlook', 'icloud'));

alter table public.subscriptions drop constraint if exists subscriptions_source_check;
alter table public.subscriptions
  add constraint subscriptions_source_check check (source in ('gmail', 'outlook', 'icloud', 'statement', 'manual'));

-- For iCloud this column holds the encrypted app-specific password; for Gmail the encrypted refresh token.
comment on column public.email_connections.refresh_token is 'Encrypted inbox credential (Gmail refresh token or iCloud app-specific password)';
