-- AdaptLab AI database schema for Supabase (PostgREST + RLS).
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  application_type text not null,
  application_url text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_owner_id_idx on public.projects (owner_id);

create table if not exists public.project_settings (
  project_id uuid primary key references public.projects (id) on delete cascade,
  default_timeout_ms integer not null default 30000,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.adaptive_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  profile text not null,
  network_profile text not null,
  image_policy text not null,
  javascript_policy text not null,
  feature_policy text not null,
  max_resource_size_kb integer not null,
  max_lcp_ms integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_profiles (
  key text primary key,
  name text not null,
  description text not null,
  network_profile text not null,
  image_policy text not null,
  javascript_policy text not null,
  feature_policy text not null,
  max_resource_size_kb integer not null,
  max_lcp_ms integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  profile text not null,
  method text not null,
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists test_runs_project_id_idx on public.test_runs (project_id);

create table if not exists public.test_signals (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null unique references public.test_runs (id) on delete cascade,
  configuration jsonb not null default '{}'::jsonb,
  detected jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error text,
  analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_resources (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references public.test_runs (id) on delete cascade,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists test_resources_test_run_id_idx on public.test_resources (test_run_id);

create table if not exists public.test_metrics (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null unique references public.test_runs (id) on delete cascade,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_violations (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references public.test_runs (id) on delete cascade,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists test_violations_test_run_id_idx on public.test_violations (test_run_id);

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'projects', 'project_settings', 'adaptive_contracts',
    'test_profiles', 'test_runs', 'test_signals'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- Row Level Security: every row is reachable only through its owning user.
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_settings enable row level security;
alter table public.adaptive_contracts enable row level security;
alter table public.test_profiles enable row level security;
alter table public.test_runs enable row level security;
alter table public.test_signals enable row level security;
alter table public.test_resources enable row level security;
alter table public.test_metrics enable row level security;
alter table public.test_violations enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists projects_owner on public.projects;
create policy projects_owner on public.projects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists test_profiles_read on public.test_profiles;
create policy test_profiles_read on public.test_profiles
  for select to authenticated
  using (true);

do $$
declare
  t text;
begin
  foreach t in array array['project_settings', 'adaptive_contracts', 'test_runs']
  loop
    execute format('drop policy if exists %I_via_project on public.%I', t, t);
    execute format(
      'create policy %I_via_project on public.%I
         for all to authenticated
         using (exists (select 1 from public.projects p
                        where p.id = %I.project_id and p.owner_id = auth.uid()))
         with check (exists (select 1 from public.projects p
                             where p.id = %I.project_id and p.owner_id = auth.uid()))',
      t, t, t, t);
  end loop;

  foreach t in array array['test_signals', 'test_resources', 'test_metrics', 'test_violations']
  loop
    execute format('drop policy if exists %I_via_run on public.%I', t, t);
    execute format(
      'create policy %I_via_run on public.%I
         for all to authenticated
         using (exists (select 1 from public.test_runs r
                        join public.projects p on p.id = r.project_id
                        where r.id = %I.test_run_id and p.owner_id = auth.uid()))
         with check (exists (select 1 from public.test_runs r
                             join public.projects p on p.id = r.project_id
                             where r.id = %I.test_run_id and p.owner_id = auth.uid()))',
      t, t, t, t);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.test_profiles to anon;

-- Profile row for each auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed the shared resilience profiles used by Phase 2.
insert into public.test_profiles (
  key, name, description, network_profile, image_policy,
  javascript_policy, feature_policy, max_resource_size_kb, max_lcp_ms
) values
  ('low', 'Low',
   'A constrained environment for checking graceful degradation under reduced bandwidth and limited resources.',
   'Slow 3G', 'low', 'minimal', 'reduced', 800, 4000),
  ('medium', 'Medium',
   'A balanced baseline for release checks across typical network and device conditions.',
   'Fast 3G', 'medium', 'deferred', 'normal', 1400, 3000),
  ('high', 'High',
   'A full-fidelity profile for validating the complete application experience and performance budget.',
   '4G', 'high', 'full', 'full', 2400, 2000)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  network_profile = excluded.network_profile,
  image_policy = excluded.image_policy,
  javascript_policy = excluded.javascript_policy,
  feature_policy = excluded.feature_policy,
  max_resource_size_kb = excluded.max_resource_size_kb,
  max_lcp_ms = excluded.max_lcp_ms;
