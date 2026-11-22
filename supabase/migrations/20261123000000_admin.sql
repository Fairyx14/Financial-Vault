-- Dream Vault admin area.
--
-- What admins can do: see usage totals, list accounts (email, dates, status and which
-- vaults are in use - never the financial data inside them), suspend, unsuspend and
-- delete accounts. Every action is written to an activity log.
--
-- How it's protected:
-- - The admin list and activity log live in the `private` schema, which the website's
--   API can't reach at all.
-- - The website can only call the public functions below. Each one runs with elevated
--   rights, so each one checks first that the caller is an admin, and refuses otherwise.
-- - Signed-out visitors can't call any of them.
--
-- Making someone an admin is done by hand in the SQL editor (see the end of this file);
-- there is deliberately no function for it.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.admins (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists private.admin_log (
  id           bigint      generated always as identity primary key,
  at           timestamptz not null default now(),
  admin_id     uuid        references auth.users (id) on delete set null,
  admin_email  text,
  action       text        not null check (action in ('suspend', 'unsuspend', 'delete')),
  target_id    uuid,
  target_email text
);

create index if not exists admin_log_at_idx on private.admin_log (at desc);

alter table private.admins enable row level security;
alter table private.admin_log enable row level security;

-- True when the signed-in caller is an admin.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;

revoke all on function private.is_admin() from public, anon, authenticated;

-- Stops with an error unless the caller is an admin.
create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_admin() from public, anon, authenticated;

/* ---------- Functions the admin pages call ---------- */

-- Lets the website decide whether to show the admin area. Reveals nothing else.
create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;

-- Usage totals. Counts only: no emails, no financial data.
create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result json;
begin
  perform private.require_admin();
  select json_build_object(
    'total',        (select count(*) from auth.users),
    'confirmed',    (select count(*) from auth.users where email_confirmed_at is not null),
    'suspended',    (select count(*) from auth.users where banned_until > now()),
    'new_7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'new_30d',      (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d',    (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active_30d',   (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'admins',       (select count(*) from private.admins),
    'vaults',       (select coalesce(json_object_agg(vault, users), '{}'::json)
                     from (select vault, count(*) as users from public.vault_documents group by vault) v),
    'signups_by_week', (
      select json_agg(json_build_object('week', to_char(w.week, 'YYYY-MM-DD'), 'count', coalesce(c.count, 0)) order by w.week)
      from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as w(week)
      left join (
        select date_trunc('week', created_at) as week, count(*) as count
        from auth.users
        group by 1
      ) c on c.week = w.week
    )
  ) into result;
  return result;
end;
$$;

-- One page of accounts, newest first, optionally filtered by email.
-- Shows account details and which vaults are in use, never what's in them.
create or replace function public.admin_list_users(search text default '', page_number int default 1, page_size int default 25)
returns table (
  id               uuid,
  email            text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  confirmed        boolean,
  suspended        boolean,
  is_admin         boolean,
  vaults           text[],
  data_updated_at  timestamptz,
  total_count      bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  page_size := least(greatest(page_size, 1), 100);
  page_number := greatest(page_number, 1);
  return query
    select
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at is not null,
      coalesce(u.banned_until > now(), false),
      exists (select 1 from private.admins a where a.user_id = u.id),
      coalesce((select array_agg(d.vault order by d.vault) from public.vault_documents d where d.user_id = u.id), '{}'),
      (select max(d.updated_at) from public.vault_documents d where d.user_id = u.id),
      count(*) over ()
    from auth.users u
    where coalesce(search, '') = '' or u.email ilike '%' || search || '%'
    order by u.created_at desc
    limit page_size offset (page_number - 1) * page_size;
end;
$$;

-- Suspends (blocks sign-in) or unsuspends an account. Admins can't suspend themselves or other admins.
create or replace function public.admin_set_suspended(target uuid, suspend boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
begin
  perform private.require_admin();
  if target = (select auth.uid()) then
    raise exception 'You can''t suspend your own account.';
  end if;
  if exists (select 1 from private.admins where user_id = target) then
    raise exception 'Admins can''t be suspended here.';
  end if;
  update auth.users
     set banned_until = case when suspend then 'infinity'::timestamptz else null end
   where id = target
  returning email into target_email;
  if target_email is null then
    raise exception 'Account not found.';
  end if;
  -- Signs a suspended account out everywhere straight away. If Supabase doesn't allow
  -- this, the suspension still stands: their current sign-in simply runs out (within an hour).
  if suspend then
    begin
      delete from auth.sessions where user_id = target;
    exception when others then
      null;
    end;
  end if;
  insert into private.admin_log (admin_id, admin_email, action, target_id, target_email)
  values ((select auth.uid()), (select email from auth.users where id = (select auth.uid())),
          case when suspend then 'suspend' else 'unsuspend' end, target, target_email);
end;
$$;

-- Permanently deletes an account and all its vault data. Not for your own account or other admins.
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
begin
  perform private.require_admin();
  if target = (select auth.uid()) then
    raise exception 'Use the Account page to delete your own account.';
  end if;
  if exists (select 1 from private.admins where user_id = target) then
    raise exception 'Admins can''t be deleted here.';
  end if;
  select email into target_email from auth.users where id = target;
  if target_email is null then
    raise exception 'Account not found.';
  end if;
  insert into private.admin_log (admin_id, admin_email, action, target_id, target_email)
  values ((select auth.uid()), (select email from auth.users where id = (select auth.uid())), 'delete', target, target_email);
  delete from auth.users where id = target;
end;
$$;

-- The most recent admin actions.
create or replace function public.admin_activity(max_rows int default 50)
returns table (at timestamptz, admin_email text, action text, target_email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select l.at, l.admin_email, l.action, l.target_email
    from private.admin_log l
    order by l.at desc
    limit least(greatest(max_rows, 1), 200);
end;
$$;

-- Only signed-in users can call these, and each checks for admin itself.
revoke all on function public.am_i_admin() from public, anon;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_list_users(text, int, int) from public, anon;
revoke all on function public.admin_set_suspended(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
revoke all on function public.admin_activity(int) from public, anon;
grant execute on function public.am_i_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_set_suspended(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_activity(int) to authenticated;

-- To make an account an admin, run this ONCE in the Supabase SQL editor with the real email
-- (kept out of this file so no email address is stored in the code):
--
--   insert into private.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
