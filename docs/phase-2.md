# Phase 2 foundation

Phase 2 adds the configuration layer that future browser execution will consume. It does not start Playwright, make requests to user-provided SUT URLs, or run Groq analysis.

## Adaptive contracts

Each project can save one adaptive contract. A contract references a reusable Low, Medium, or High profile and stores explicit network, image, JavaScript, feature, resource-size, and LCP rules.

## Test configuration

Test profiles explain the operating conditions a future run should use. A test configuration stores:

- the selected profile
- the testing method (`adaptive_behavior`, `performance`, `resource`, or `full_validation`)
- optional JSON configuration
- a `queued` status

Queued records are configuration artifacts only. They never imply a pass, violation, or completed browser run.

## Persistence boundary

The Supabase migration in `supabase/migrations/0002_phase_2_testing.sql` adds adaptive contracts, reusable profiles, and test runs with project-ownership RLS policies. The preview server keeps these records in memory until the Supabase connection is attached and the runtime service layer is switched to PostgreSQL.