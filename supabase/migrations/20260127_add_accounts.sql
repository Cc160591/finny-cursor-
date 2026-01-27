-- Migration: Add accounts table and link transactions

-- 1. Accounts table
create table public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  initial_balance_cents bigint default 0 not null,
  currency text default 'EUR' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, name)
);

-- 2. Add account_id to transactions
alter table public.transactions add column account_id uuid references public.accounts(id) on delete set null;

-- 3. Enable RLS on accounts
alter table public.accounts enable row level security;

-- 4. RLS Policies for accounts
create policy "Users can manage own accounts" on public.accounts
  for all using (auth.uid() = user_id);
