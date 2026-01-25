-- Tables Definition

-- 1. Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  currency text default 'EUR',
  locale text default 'it-IT',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Chat Messages
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text check (type in ('expense', 'income')) not null,
  amount_cents bigint not null,
  currency text default 'EUR',
  merchant text,
  notes text,
  occurred_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  message_id uuid references public.chat_messages(id) on delete set null
);

-- 4. Insights
create table public.insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  kind text not null, -- es: 'too_many_pizzas'
  payload_json jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.chat_messages enable row level security;
alter table public.transactions enable row level security;
alter table public.insights enable row level security;

-- RLS Policies

create policy "Users can view/update own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users can manage own messages" on public.chat_messages
  for all using (auth.uid() = user_id);

create policy "Users can manage own transactions" on public.transactions
  for all using (auth.uid() = user_id);

create policy "Users can manage own insights" on public.insights
  for all using (auth.uid() = user_id);

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
