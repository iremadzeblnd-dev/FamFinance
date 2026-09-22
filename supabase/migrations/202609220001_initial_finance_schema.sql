-- Run this file in the Supabase SQL Editor for the project used by the Vite app.
-- Authentication remains in auth.users. No public password or duplicate users table is created.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  role text,
  archived boolean not null default false,
  income numeric,
  expense numeric,
  member_since date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  icon text not null default 'wallet',
  type text,
  opening_balance numeric,
  legacy_balance numeric,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount >= 0),
  category text not null,
  description text not null default '',
  occurred_on date not null,
  account_id text not null,
  family_member_id text,
  expense_scope text check (expense_scope is null or expense_scope in ('personal', 'shared')),
  attachments jsonb not null default '[]'::jsonb,
  receipt_attachment jsonb,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  category text not null,
  amount_limit numeric not null check (amount_limit >= 0),
  month text check (month is null or month ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.debts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  total_amount numeric not null check (total_amount >= 0),
  monthly_payment numeric not null check (monthly_payment >= 0),
  remaining numeric not null check (remaining >= 0),
  next_payment date not null,
  type text not null check (type in ('installment', 'personal')),
  status text not null check (status in ('owed', 'owed_to_me')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.savings_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  target_amount numeric not null check (target_amount >= 0),
  current_saved numeric,
  target_date date,
  linked_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shopping is an existing app feature and is kept in the same private backend.
create table if not exists public.shopping_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  quantity numeric not null check (quantity > 0),
  category text not null,
  estimated_unit_price numeric,
  note text,
  added_by_family_member_id text not null,
  status text not null check (status in ('pending', 'purchased')),
  purchased_by_family_member_id text,
  purchased_at timestamptz,
  actual_total_price numeric,
  expense_transaction_id text,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index if not exists transactions_user_account_idx on public.transactions (user_id, account_id);
create index if not exists transactions_user_member_idx on public.transactions (user_id, family_member_id);
create index if not exists budgets_user_month_idx on public.budgets (user_id, month);
create index if not exists debts_user_payment_idx on public.debts (user_id, next_payment);
create index if not exists shopping_items_user_status_idx on public.shopping_items (user_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'family_members', 'accounts', 'transactions', 'budgets', 'debts', 'savings_goals', 'user_settings', 'shopping_items']
  loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || table_name || '_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'set_' || table_name || '_updated_at', table_name);
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set full_name = excluded.full_name;
  return new;
end;
$$;

insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.debts enable row level security;
alter table public.savings_goals enable row level security;
alter table public.user_settings enable row level security;
alter table public.shopping_items enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['family_members', 'accounts', 'transactions', 'budgets', 'debts', 'savings_goals', 'user_settings', 'shopping_items']
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.debts to authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.shopping_items to authenticated;
