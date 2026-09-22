-- Phase 3 evidence tables. Each record belongs to a test run and is protected
-- by the same project ownership policy as test_runs.

create table if not exists public.test_signals (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null unique references public.test_runs(id) on delete cascade,
  configuration jsonb not null default '{}'::jsonb,
  detected jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_resources (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references public.test_runs(id) on delete cascade,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_metrics (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null unique references public.test_runs(id) on delete cascade,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_violations (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references public.test_runs(id) on delete cascade,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists test_resources_run_idx on public.test_resources(test_run_id);
create index if not exists test_violations_run_idx on public.test_violations(test_run_id);

alter table public.test_signals enable row level security;
alter table public.test_resources enable row level security;
alter table public.test_metrics enable row level security;
alter table public.test_violations enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['test_signals', 'test_resources', 'test_metrics', 'test_violations']
  loop
    execute format(
      'create policy "%s follow test run ownership" on public.%I for all using (
        exists (
          select 1 from public.test_runs
          join public.projects on projects.id = test_runs.project_id
          where test_runs.id = %I.test_run_id and projects.owner_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.test_runs
          join public.projects on projects.id = test_runs.project_id
          where test_runs.id = %I.test_run_id and projects.owner_id = auth.uid()
        )
      )',
      table_name,
      table_name,
      table_name,
      table_name
    );
  end loop;
end $$;

drop trigger if exists test_signals_set_updated_at on public.test_signals;
create trigger test_signals_set_updated_at before update on public.test_signals
for each row execute function public.set_updated_at();