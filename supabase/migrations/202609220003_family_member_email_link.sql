-- Link an authenticated user to a family by exact email without exposing the
-- auth user directory to the browser.

alter table public.family_members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists family_members_user_auth_unique
  on public.family_members (user_id, auth_user_id)
  where auth_user_id is not null;

create or replace function public.add_family_member_by_email(target_email text)
returns table (
  status text,
  linked_user_id uuid,
  linked_display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  caller_family_id uuid;
  matched_user_id uuid;
  matched_display_name text;
  matched_family_id uuid;
  matched_family_size integer;
  matched_family_has_messages boolean;
begin
  if caller_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select m.family_id
  into caller_family_id
  from public.family_chat_members m
  where m.user_id = caller_user_id;

  if caller_family_id is null then
    return query select 'no_family'::text, null::uuid, null::text;
    return;
  end if;

  select u.id,
         coalesce(
           nullif(btrim(p.full_name), ''),
           nullif(split_part(u.email, '@', 1), ''),
           'Family member'
         )
  into matched_user_id, matched_display_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(target_email))
  limit 1;

  if matched_user_id is null then
    return query select 'not_found'::text, null::uuid, null::text;
    return;
  end if;

  if matched_user_id = caller_user_id then
    return query select 'self'::text, null::uuid, null::text;
    return;
  end if;

  select m.family_id
  into matched_family_id
  from public.family_chat_members m
  where m.user_id = matched_user_id
  for update;

  if matched_family_id = caller_family_id then
    return query select 'already_member'::text, matched_user_id, matched_display_name;
    return;
  end if;

  if matched_family_id is not null then
    select count(*)::integer
    into matched_family_size
    from public.family_chat_members m
    where m.family_id = matched_family_id;

    select exists (
      select 1
      from public.family_messages fm
      where fm.family_id = matched_family_id
    )
    into matched_family_has_messages;

    -- Never merge or take over an established family. Only the target's empty,
    -- one-person family created at signup can be replaced automatically.
    if matched_family_size > 1 or matched_family_has_messages then
      return query select 'target_has_family'::text, null::uuid, null::text;
      return;
    end if;

    update public.family_chat_members
    set family_id = caller_family_id,
        joined_at = now()
    where user_id = matched_user_id;

    delete from public.family_chat_families f
    where f.id = matched_family_id
      and not exists (
        select 1 from public.family_chat_members m where m.family_id = f.id
      )
      and not exists (
        select 1 from public.family_messages fm where fm.family_id = f.id
      );
  else
    insert into public.family_chat_members (user_id, family_id)
    values (matched_user_id, caller_family_id);
  end if;

  return query select 'linked'::text, matched_user_id, matched_display_name;
end;
$$;

revoke all on function public.add_family_member_by_email(text) from public;
grant execute on function public.add_family_member_by_email(text) to authenticated;
