-- Dream Vault: one saved copy of each vault per user.
--
-- Each row holds one vault (savings, investments, investment goals or budget) as JSON,
-- in exactly the shape the app already uses in the browser. Row-level security means a
-- signed-in user can only ever read, write or delete their own rows.
--
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.vault_documents (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  vault      text        not null check (vault in ('savings', 'investments', 'investment-goals', 'budget')),
  data       jsonb       not null,
  -- Counts every save. The app only overwrites the version it last saw, so two devices
  -- can't silently overwrite each other's changes.
  revision   bigint      not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, vault),
  -- Generous cap (5 MB per vault) so one account can't fill the database.
  constraint vault_documents_size check (octet_length(data::text) < 5 * 1024 * 1024)
);

comment on table public.vault_documents is 'One JSON document per user per Dream Vault vault.';

-- The server, not the browser, sets the save time and revision.
create or replace function public.vault_documents_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists vault_documents_touch on public.vault_documents;
create trigger vault_documents_touch
  before insert or update on public.vault_documents
  for each row execute function public.vault_documents_touch();

-- Row-level security: without a matching policy, nobody can see or change anything.
alter table public.vault_documents enable row level security;

drop policy if exists "Users read their own vaults" on public.vault_documents;
create policy "Users read their own vaults"
  on public.vault_documents for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own vaults" on public.vault_documents;
create policy "Users add their own vaults"
  on public.vault_documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own vaults" on public.vault_documents;
create policy "Users update their own vaults"
  on public.vault_documents for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own vaults" on public.vault_documents;
create policy "Users delete their own vaults"
  on public.vault_documents for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-out visitors get no access at all.
revoke all on public.vault_documents from anon;
grant select, insert, update, delete on public.vault_documents to authenticated;

-- Lets a signed-in user permanently delete their own account (and, through the
-- foreign key above, all their vault data). It can only ever delete the caller.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
