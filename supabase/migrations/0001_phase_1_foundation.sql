-- AdaptLab AI Phase 1 schema for Supabase PostgreSQL.
-- Apply after enabling Supabase Auth. The preview app currently uses
-- in-memory project records until this migration is connected to runtime data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  application_type text not null check (application_type in ('ecommerce', 'news')),
  application_url text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  default_timeout_ms integer not null default 30000,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists projects_status_idx on public.projects(status);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_settings enable row level security;

create policy "profiles are owner-readable"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are owner-writable"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "projects are owner-readable"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "projects are owner-writable"
  on public.projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "project settings follow project ownership"
  on public.project_settings for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_settings.project_id
        and projects.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_settings.project_id
        and projects.owner_id = auth.uid()
    )
  );