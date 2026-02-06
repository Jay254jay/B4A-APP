create table if not exists public.transactions (
  id bigserial primary key,
  user_id bigint not null,
  type text not null,
  amount numeric not null,
  client_name text,
  groomed_by text not null,
  served_by text not null,
  recipient text,
  mpesa_ref text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_transactions_type on public.transactions(type);

alter table public.transactions enable row level security;

create policy read_transactions_authenticated
on public.transactions
for select
to authenticated
using (true);
