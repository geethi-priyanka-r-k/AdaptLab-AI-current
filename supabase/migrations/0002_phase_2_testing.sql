-- AdaptLab AI Phase 2 schema for adaptive contracts and queued test runs.

create table if not exists public.adaptive_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  profile text not null check (profile in ('low', 'medium', 'high')),
  network_profile text not null,
  image_policy text not null,
  javascript_policy text not null,
  feature_policy text not null,
  max_resource_size_kb integer not null check (max_resource_size_kb > 0),
  max_lcp_ms integer not null check (max_lcp_ms > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_profiles (
  key text primary key check (key in ('low', 'medium', 'high')),
  name text not null,
  description text not null,
  network_profile text not null,
  image_policy text not null,
  javascript_policy text not null,
  feature_policy text not null,
  max_resource_size_kb integer not null check (max_resource_size_kb > 0),
  max_lcp_ms integer not null check (max_lcp_ms > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile text not null check (profile in ('low', 'medium', 'high')),
  method text not null check (
    method in ('adaptive_behavior', 'performance', 'resource', 'full_validation')
  ),
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'passed', 'violated', 'failed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adaptive_contracts_project_id_idx
  on public.adaptive_contracts(project_id);
create index if not exists test_runs_project_id_idx
  on public.test_runs(project_id);
create index if not exists test_runs_status_idx
  on public.test_runs(status);

insert into public.test_profiles (
  key,
  name,
  description,
  network_profile,
  image_policy,
  javascript_policy,
  feature_policy,
  max_resource_size_kb,
  max_lcp_ms
)
values
  ('low', 'Low', 'A constrained environment for graceful degradation checks.', 'Slow 3G', 'low', 'minimal', 'reduced', 800, 4000),
  ('medium', 'Medium', 'A balanced baseline for common release checks.', 'Fast 3G', 'medium', 'deferred', 'normal', 1400, 3000),
  ('high', 'High', 'A full-fidelity profile for complete experience validation.', '4G', 'high', 'full', 'full', 2400, 2000)
on conflict (key) do nothing;

alter table public.adaptive_contracts enable row level security;
alter table public.test_profiles enable row level security;
alter table public.test_runs enable row level security;

create policy "adaptive contracts follow project ownership"
  on public.adaptive_contracts for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = adaptive_contracts.project_id
        and projects.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = adaptive_contracts.project_id
        and projects.owner_id = auth.uid()
    )
  );

create policy "test profiles are readable by authenticated users"
  on public.test_profiles for select
  using (auth.uid() is not null);

create policy "test runs follow project ownership"
  on public.test_runs for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = test_runs.project_id
        and projects.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = test_runs.project_id
        and projects.owner_id = auth.uid()
    )
  );