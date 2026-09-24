---
name: DiscipleOS stack
description: Key decisions and quirks from porting DiscipleOS from Vercel/Next.js to Replit pnpm_workspace.
---

# DiscipleOS Stack Notes

**Why:** Ported from Vercel Next.js. Key decisions to stay consistent with.

**CSS approach:** The app uses Tailwind v4 direct utility classes (`bg-[#09090f]`, `text-white`, `bg-white/5`, etc.) rather than HSL CSS variables. The `src/index.css` is minimal: plain hex `:root` vars + the `.discipleos-shell` hero background gradient pseudo-element. Do NOT add a complex HSL theme system — it will conflict with the inline styles in Home.tsx.

**DB:** @workspace/db (Drizzle + node-postgres) with three tables: `events`, `reading_plans` (JSONB blob), `push_subscriptions`. Push is web-push (VAPID). The public key is supplied through `VITE_VAPID_PUBLIC_KEY`; private key/subject remain server-only env vars.

**API routes:** All in artifacts/api-server/src/routes/. Key endpoints: /api/events (CRUD), /api/reading/plans (CRUD), /api/reading/complete (JSONB update), /api/push (subscribe), /api/verse (daily verse via bible-api.com, in-memory cached), /api/track (no-op logger).

**Email delivery:** Passwordless verification emails use the connected Replit Resend connector through `@replit/connectors-sdk`; the app does not store a Resend API key. `RESEND_FROM` is the required verified sender setting, and the connection may be send-only.

**Why:** The project-level connector handles Resend authentication securely, while the sender identity remains an explicit deployment setting. A send-only connection can legitimately reject domain-listing reads.

**How to apply:** Keep delivery calls on the connector's `/emails` endpoint, require `RESEND_FROM`, and do not treat a 401 from read-only Resend endpoints as evidence that sending is unavailable.

**Frontend:** Single massive page component at artifacts/discipleos/src/pages/Home.tsx (~2976 lines). All state is in-memory / fetched from API. PWA service worker registered in production only.

**How to apply:** Keep the CSS simple. If adding new components, use direct Tailwind classes matching the dark theme (#09090f, #090d12 backgrounds, white/10 borders, amber/gold accents).
