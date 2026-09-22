-- Authenticated family chat. Financial family_members remain unchanged: they are
-- finance labels, while family_chat_members links real auth.users accounts.

create table if not exists public.family_chat_families (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null default 'Family',
  created_at timestamptz not null default now()
);

create table if not exists public.family_chat_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references public.family_chat_families(id) on delete cascade,
  joined_at timestamptz not null default now()
);

create table if not exists public.family_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_chat_families(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  message_text text not null check (char_length(btrim(message_text)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists family_chat_members_family_idx on public.family_chat_members (family_id);
create index if not exists family_messages_family_created_idx on public.family_messages (family_id, created_at desc);

create or replace function public.is_family_chat_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_chat_members
    where family_id = target_family_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_family_chat_member(uuid) from public;
grant execute on function public.is_family_chat_member(uuid) to authenticated;

create or replace function public.prepare_family_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or not public.is_family_chat_member(new.family_id) then
    raise exception 'Not a member of this family' using errcode = '42501';
  end if;

  new.sender_id := current_user_id;
  new.message_text := btrim(new.message_text);
  select coalesce(
    nullif(btrim(p.full_name), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Family member'
  )
  into new.sender_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = current_user_id;

  return new;
end;
$$;

revoke all on function public.prepare_family_message() from public;

drop trigger if exists prepare_family_message on public.family_messages;
create trigger prepare_family_message
  before insert on public.family_messages
  for each row execute function public.prepare_family_message();

-- Extend the existing signup initializer without adding finance/demo records.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_family_id uuid;
  display_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
begin
  insert into public.profiles (id, full_name)
  values (new.id, display_name)
  on conflict (id) do update set full_name = excluded.full_name;

  if not exists (select 1 from public.family_chat_members where user_id = new.id) then
    insert into public.family_chat_families (owner_user_id, name)
    values (new.id, coalesce(nullif(display_name, ''), 'Family') || ' family')
    returning id into created_family_id;

    insert into public.family_chat_members (user_id, family_id)
    values (new.id, created_family_id);
  end if;

  return new;
end;
$$;

-- Give every existing account a private chat family. No accounts are grouped
-- automatically because the existing finance labels do not identify auth users.
do $$
declare
  account record;
  created_family_id uuid;
  display_name text;
begin
  for account in
    select u.id, u.email, u.raw_user_meta_data, p.full_name
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.family_chat_members m on m.user_id = u.id
    where m.user_id is null
  loop
    display_name := coalesce(
      nullif(btrim(account.full_name), ''),
      nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(account.email, '@', 1), ''),
      'Family'
    );

    insert into public.family_chat_families (owner_user_id, name)
    values (account.id, display_name || ' family')
    returning id into created_family_id;

    insert into public.family_chat_members (user_id, family_id)
    values (account.id, created_family_id);
  end loop;
end;
$$;

alter table public.family_chat_families enable row level security;
alter table public.family_chat_members enable row level security;
alter table public.family_messages enable row level security;

drop policy if exists family_chat_members_select_own on public.family_chat_members;
create policy family_chat_members_select_own
  on public.family_chat_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists family_messages_select_family on public.family_messages;
create policy family_messages_select_family
  on public.family_messages
  for select
  to authenticated
  using (public.is_family_chat_member(family_id));

drop policy if exists family_messages_insert_family on public.family_messages;
create policy family_messages_insert_family
  on public.family_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_family_chat_member(family_id)
  );

revoke all on public.family_chat_families from anon, authenticated;
revoke all on public.family_chat_members from anon, authenticated;
revoke all on public.family_messages from anon, authenticated;
grant select on public.family_chat_members to authenticated;
grant select, insert on public.family_messages to authenticated;

-- Supabase Realtime only broadcasts rows that pass the subscriber's RLS policy.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'family_messages'
  ) then
    alter publication supabase_realtime add table public.family_messages;
  end if;
end;
$$;
