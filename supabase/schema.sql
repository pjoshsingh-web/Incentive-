-- Run once in your Supabase project's SQL editor. No service-role key is needed in this app.
create table if not exists public.incentive_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.incentive_workspaces enable row level security;
drop policy if exists "Users own their workspace" on public.incentive_workspaces;
create policy "Users own their workspace" on public.incentive_workspaces for all to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.incentive_workspaces to authenticated;
revoke all on public.incentive_workspaces from anon;
-- Revision compare-and-swap prevents stale devices from overwriting newer saved data.
create or replace function public.save_incentive_workspace(p_data jsonb, p_expected_revision integer)
returns integer language plpgsql security invoker set search_path = public as $$
declare new_revision integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_expected_revision = 0 then
  insert into public.incentive_workspaces(user_id,data,revision) values(auth.uid(),p_data,1)
  on conflict (user_id) do nothing returning revision into new_revision;
 else
  update public.incentive_workspaces set data=p_data,revision=revision+1,updated_at=now()
  where user_id=auth.uid() and revision=p_expected_revision returning revision into new_revision;
 end if;
 if new_revision is null then raise exception 'A newer cloud version exists. Export your changes, then load the latest workspace.'; end if;
 return new_revision;
end $$;
revoke all on function public.save_incentive_workspace(jsonb,integer) from public, anon;
grant execute on function public.save_incentive_workspace(jsonb,integer) to authenticated;
