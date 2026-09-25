-- Company logos: the website each subscription belongs to. Run after 004.
alter table public.subscriptions add column if not exists logo_domain text;
