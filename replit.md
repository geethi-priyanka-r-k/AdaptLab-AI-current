# AdaptLab AI

AdaptLab AI maps external systems under test and stores Phase 2 resilience configuration.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env for live Phase 2 persistence/auth: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/adaptlab-ai/src/lib/supabase-auth.ts` — browser Supabase Auth session client
- `artifacts/api-server/src/middlewares/auth.ts` — bearer-token verification and ownership identity
- `artifacts/api-server/src/services/workspace-store.ts` — authenticated persistence service with Supabase REST and test adapter
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `supabase/migrations/` — Supabase PostgreSQL schema and RLS source of truth

## Architecture decisions

- Supabase Auth access tokens are verified by the API through Supabase Auth, and every data request uses the same bearer token against PostgREST so RLS remains authoritative.
- The process-memory adapter is enabled only when `NODE_ENV=test`; production/development without Supabase configuration fails explicitly instead of silently losing data.
- Phase 2 remains configuration-only: test runs are created as `queued` records and no browser execution or result fabrication is performed.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
