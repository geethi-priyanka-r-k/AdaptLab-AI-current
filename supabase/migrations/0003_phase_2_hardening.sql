-- Phase 2 hardening: keep timestamps accurate for every mutable configuration row.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists project_settings_set_updated_at on public.project_settings;
create trigger project_settings_set_updated_at
before update on public.project_settings
for each row execute function public.set_updated_at();

drop trigger if exists adaptive_contracts_set_updated_at on public.adaptive_contracts;
create trigger adaptive_contracts_set_updated_at
before update on public.adaptive_contracts
for each row execute function public.set_updated_at();

drop trigger if exists test_profiles_set_updated_at on public.test_profiles;
create trigger test_profiles_set_updated_at
before update on public.test_profiles
for each row execute function public.set_updated_at();

drop trigger if exists test_runs_set_updated_at on public.test_runs;
create trigger test_runs_set_updated_at
before update on public.test_runs
for each row execute function public.set_updated_at();