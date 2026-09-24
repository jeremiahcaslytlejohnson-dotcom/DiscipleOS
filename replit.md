# DiscipleOS

A system for your daily walk with God — a PWA for Bible reading plans, spiritual event scheduling, and daily discipline tracking.

## Run & Operate

- Workflows manage both services automatically; use the Replit preview pane to view the app
- `pnpm --filter @workspace/api-server run dev` — run the API server manually
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/discipleos/`) at path `/`
- API: Express 5 (`artifacts/api-server/`) at path `/api`
- DB: PostgreSQL + Drizzle ORM
- Authentication: first-party passwordless email-code auth with Postgres-backed httpOnly sessions
- Verification email delivery: connected Resend connector via `@replit/connectors-sdk`; `RESEND_FROM` supplies the verified sender address
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- CSS: Tailwind v4, dark theme (`#09090f` background)

## Where things live

- Main app UI: `artifacts/discipleos/src/pages/Home.tsx` (single-page React component)
- PWA install button: `artifacts/discipleos/src/install-button.tsx`
- Push subscribe: `artifacts/discipleos/src/pages/Home.tsx` and `artifacts/discipleos/src/lib/push-subscription.ts`
- Service worker: `artifacts/discipleos/public/sw.js`
- DB schema: `lib/db/src/schema/` (events, reading_plans, push_subscriptions)
- Auth schema: `lib/db/src/schema/auth.ts` (local users and anonymous app-state sessions)
- API routes: `artifacts/api-server/src/routes/` (events, reading, push, track)
- OpenAPI spec: `lib/api-spec/openapi.yaml`

## Architecture decisions

- Single-page app: entire UI lives in `Home.tsx` (~2700 lines) with tab-based navigation (Today, Calendar, Plans, Create Plan)
- Push notifications use VAPID — set `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` env vars to enable
- Reading plans and events are stored in Postgres; the frontend also uses localStorage as a fast-read cache
- Verification emails use the project Resend connector; do not add a Resend API key to app code
- Service worker (`sw.js`) enables PWA install and offline support in production

## Product

- **Today tab**: Dashboard with verse of the day, today's readings and schedule, quick stats
- **Calendar tab**: Add/edit/delete spiritual events (prayer, fasting, church, custom) with reminders and repeat options
- **Plans tab**: View active Bible reading plans with progress tracking and per-chapter completion
- **Create Plan tab**: Build custom reading plans by book, date range, and reading mode (consecutive/random)

## User preferences

_Populate as you build._

## Gotchas

- `VITE_VAPID_PUBLIC_KEY` must be set for push notification subscribe to work (the app degrades gracefully without it)
- The `Home.tsx` component is a single large file by design (ported from the original Next.js app)
- Do NOT run `pnpm dev` at workspace root — use the artifact workflows

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
