# Phase 1 foundation

Phase 1 makes an external system under test explicit without pretending that test execution already exists.

## Product model

Projects represent external systems under test and include a name, description, application type, URL, owner boundary, status, and timestamps.

## Security boundary

The target production model is Supabase Auth with PostgreSQL Row Level Security. Project records must be scoped by `owner_id` (or a workspace membership boundary) so users can only access their own records. The preview session is intentionally local and is not a production authentication implementation.

## API boundary

The current API keeps the future route groups stable:

- `/api/health` and `/api/healthz`
- `/api/projects`
- `/api/dashboard/summary`
- future `/api/tests`
- future `/api/ai`

## Honest states

The dashboard renders `No test runs yet` and does not fabricate pass rates, violations, or run history. The UI labels test execution and AI analysis as phased capabilities.