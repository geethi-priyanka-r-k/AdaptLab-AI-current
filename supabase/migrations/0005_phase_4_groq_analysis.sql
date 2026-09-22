-- Phase 4: Add AI analysis storage to test_signals table

alter table public.test_signals
  add column if not exists analysis jsonb;

-- Add index for analysis queries
create index if not exists test_signals_analysis_idx 
  on public.test_signals using gin (analysis);
