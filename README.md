# AdaptLab AI

AdaptLab AI is a developer testing and resilience platform for teams that depend on external systems. It provides explicit project mapping, adaptive contract validation, automated browser testing, AI-powered analysis, and regression detection.

## Features

- **Project Management**: Create, configure, and track external systems under test
- **Adaptive Contracts**: Define resilience thresholds with Low, Medium, and High profiles
- **Automated Testing**: Playwright-based browser execution with performance metrics
- **AI Analysis**: Groq-powered intelligent analysis of test results and violations
- **Regression Detection**: Compare test runs to identify performance degradation
- **Security**: Row-level security, SSRF protection, input validation, and secure secret handling

## Architecture

This pnpm workspace maps the product boundaries to the repository's shared structure:

```text
artifacts/adaptlab-ai/     React + Vite web application
artifacts/api-server/      Express API boundary (worker-compatible)
lib/api-spec/              OpenAPI source of truth
lib/api-client-react/      Generated React Query client
lib/api-zod/               Generated request/response validation
lib/db/                    Drizzle/PostgreSQL package
supabase/migrations/       Supabase Auth/RLS migrations
docs/                      Product and rollout notes
```

### Production Architecture

```text
Browser
 ↓
Cloudflare
 ├── React Frontend
 └── Hono Worker
       ├── Supabase (PostgreSQL + Auth)
       ├── Groq AI
       └── Playwright / Browser Run
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account (for production)
- Groq API key (for AI analysis)
- Cloudflare account (for Worker deployment)

### Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
# Supabase (required for production auth)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_URL=your-supabase-url
SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Groq AI (optional, for analysis)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile

# Cloudflare (optional, for deployment)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

4. Start the API server:
```bash
pnpm --filter @workspace/api-server run dev
```

5. Start the web app:
```bash
pnpm --filter @workspace/adaptlab-ai run dev
```

### Supabase Setup

1. Create a new Supabase project
2. Run the migrations in order:
```bash
supabase db push
```
Or apply migrations manually via the Supabase dashboard:
- `0001_phase_1_foundation.sql`
- `0002_phase_2_testing.sql`
- `0003_phase_2_hardening.sql`
- `0004_phase_3_results.sql`
- `0005_phase_4_groq_analysis.sql`

3. Enable Row Level Security (RLS) is already configured in migrations
4. Copy your Supabase URL and publishable key to `.env`

### Groq Setup

1. Get an API key from [Groq Console](https://console.groq.com)
2. Add to `.env` as `GROQ_API_KEY`
3. The default model is `llama-3.3-70b-versatile`

### Playwright Setup

Playwright is included for browser automation. Install browsers:
```bash
pnpm --filter @workspace/api-server exec playwright install
```

## Environment Variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (frontend) | Production |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (frontend) | Production |
| `SUPABASE_URL` | Supabase project URL (server) | Production |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (server) | Production |
| `GROQ_API_KEY` | Groq API key for AI analysis | Optional |
| `GROQ_MODEL` | Groq model name | Optional |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Deployment |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | Deployment |

**Security Notes:**
- Never commit `.env` files
- Never expose `GROQ_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Use environment-specific secrets in production

## Development Commands

```bash
# Type checking
pnpm run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/adaptlab-ai run typecheck

# Building
pnpm run build
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/adaptlab-ai run build

# API server
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run start

# Web app
pnpm --filter @workspace/adaptlab-ai run dev
pnpm --filter @workspace/adaptlab-ai run serve

# Testing
pnpm run test:phase2
```

## Deployment

### Cloudflare Worker Deployment

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Authenticate with Cloudflare:
```bash
wrangler login
```

3. Set secrets:
```bash
wrangler secret put GROQ_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

4. Deploy:
```bash
wrangler deploy
```

5. Configure your domain in `wrangler.toml`

### React Frontend Deployment

Build the frontend:
```bash
pnpm --filter @workspace/adaptlab-ai run build
```

Deploy the `artifacts/adaptlab-ai/dist` directory to:
- Cloudflare Pages
- Vercel
- Netlify
- Any static hosting service

## Security

### Authentication & Authorization
- Supabase Auth for user authentication
- Row Level Security (RLS) on all database tables
- Project ownership enforced at database level
- Test user mode for development testing only

### Input Validation
- UUID validation for all ID parameters
- Request body size limits (1MB)
- Input sanitization to prevent injection attacks
- Schema validation with Zod

### SSRF Protection
- SUT URL validation blocks private/local addresses
- Blocked: localhost, private IPs, internal networks
- Only HTTP/HTTPS protocols allowed

### Secret Handling
- Server-side only: Groq API key, Supabase service role key
- Environment variables for all secrets
- Never exposed to browser or logs

### Error Handling
- Graceful degradation for service failures
- Generic error messages to prevent information leakage
- Structured logging for debugging
- UI remains stable on errors

## Testing

### Manual Testing Flow

1. **Create Project**: Register an external system under test
2. **Configure Contract**: Set adaptive contract thresholds
3. **Run Test**: Execute browser-based resilience test
4. **View Results**: See performance metrics and violations
5. **AI Analysis**: Get intelligent insights (if Groq configured)
6. **Compare**: Check for regressions against previous runs

### Mock SUT Testing

For testing without a real SUT, use the mock SUT option:
```json
{
  "mockSut": "high"
}
```

This simulates a test with predefined results.

## Known Limitations

- AI analysis requires Groq API key; falls back gracefully if unavailable
- Browser execution requires Playwright installation
- Cloudflare Worker deployment requires additional configuration
- Real-time test execution may timeout on slow networks
- Regression comparison requires at least 2 test runs

## Troubleshooting

### Supabase Connection Issues
- Verify URL and key in `.env`
- Check RLS policies in Supabase dashboard
- Ensure migrations are applied

### Groq Analysis Unavailable
- Check `GROQ_API_KEY` is set
- Verify API key is valid
- Check rate limits on Groq console

### Browser Execution Failures
- Ensure Playwright browsers are installed
- Check SUT URL is accessible
- Verify network connectivity
- Check timeout settings

### Build Errors
- Run `pnpm install` to ensure dependencies
- Clear node_modules and reinstall
- Check TypeScript version compatibility

## Contributing

This is a private beta. Contact the maintainers for contribution guidelines.

## License

MIT