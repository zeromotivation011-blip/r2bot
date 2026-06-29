-- Pro tier subscriptions (Razorpay one-time order flow).
-- One row per active or expired subscription period; the most recent row with
-- status = 'active' AND current_period_end > now() determines Pro status.

create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan                 text not null check (plan in ('monthly', 'yearly')),
  status               text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  razorpay_order_id    text,
  razorpay_payment_id  text,
  current_period_end   timestamptz not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id, current_period_end desc);

alter table public.subscriptions enable row level security;

drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- No INSERT / UPDATE policy: the verify route uses the service-role admin
-- client so RLS doesn't apply. Clients can never write to this table directly.
