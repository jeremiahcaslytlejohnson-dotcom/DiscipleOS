# DiscipleOS

**Discipline that moves mountains.**

DiscipleOS is a local-first Bible reading and Christian discipline app designed to help users build consistency, track progress, and stay engaged with their daily walk.

The app began as a Next.js project, later moved through database and mobile experiments, and is now organized as a Vite/React workspace. The current product direction is a stable, installable PWA with local persistence and a dark mountain-dashboard interface.

---

## Current Status

DiscipleOS is in a **late-MVP / early-validation** stage.

Core product behavior has been substantially implemented:

- Bible reading plans
- Consecutive and randomized reading assignments
- Daily reading views
- Chapter and day completion tracking
- Verse of the day
- Reading progress and remaining assignments
- On-track and consistency indicators
- Calendar integration
- Prayer, fasting, church, event, and birthday markers
- Timed reminders
- Plan editing and deletion
- Duplicate-plan protection
- Local persistence
- Installable PWA behavior
- 30-Day Consistency Reset preset

The current priority is to verify the migrated workspace, preserve the stable product logic, complete the interface redesign, and test with real users.

---

## Product Direction

DiscipleOS is not intended to be only a Bible reading checklist.

Its purpose is to help users build repeatable spiritual discipline through:

- Clear daily assignments
- Visible progress
- Calendar awareness
- Reminders
- Consistency tracking
- Practical, low-friction interaction

### Primary message

> Build the discipline to move mountains.

### Primary headline

> Discipline that moves mountains.

---

## Current Architecture

The repository is organized as a pnpm workspace.

```text
DiscipleOS/
├── artifacts/
│   ├── discipleos/          # Main Vite/React frontend
│   ├── api-server/          # API/backend experiments and services
│   └── mockup-sandbox/      # Replit preview/design workspace
├── lib/                     # Shared packages or code
├── scripts/                 # Workspace utilities
├── .migration-backup/       # Previous Next.js application
├── package.json
└── pnpm-workspace.yaml
```

### Main frontend

The active frontend is located at:

```text
artifacts/discipleos
```

### Previous architecture

The original application used:

- Next.js App Router
- React
- TypeScript
- Vercel
- Neon PostgreSQL experiments
- API routes
- Service workers
- Web push
- Expo/React Native proof-of-concept work

The project was later simplified into a local-first PWA because database hydration and multi-source synchronization introduced unnecessary instability for the MVP.

---

## Local Development

### Requirements

- Node.js
- pnpm
- PowerShell, Command Prompt, Git Bash, or another terminal
- A modern browser

### Install dependencies

From the repository root:

```bash
pnpm install
```

### Start the main frontend in PowerShell

```powershell
$env:PORT=5173
$env:BASE_PATH="/"
pnpm --dir artifacts\discipleos dev
```

### Start the main frontend in Bash

```bash
PORT=5173 BASE_PATH=/ pnpm --dir artifacts/discipleos dev
```

The frontend currently expects `BASE_PATH` to be defined. If it is missing, Vite may fail with:

```text
BASE_PATH environment variable is required but was not provided
```

---

## Data Model and Persistence

The stable MVP uses browser local storage as its primary source of truth.

Primary storage key:

```text
discipleos-data
```

This local-first approach keeps the app usable without:

- User accounts
- A database connection
- Authentication
- Backend availability
- Multi-device synchronization

### Important rule

React state and local storage should remain the primary authority for the current MVP.

Avoid reintroducing automatic API hydration or background database reloads that overwrite newer local state.

---

## Core Features

### Reading plans

Users can create and manage Bible reading plans using:

- Consecutive assignment order
- Randomized assignment order
- Selected books
- Start dates
- Reading times
- Editable plan settings

### Daily reading

The daily dashboard supports:

- Today's assigned chapters
- Chapter-level completion
- Whole-day completion
- Progress indicators
- Remaining assignments
- On-track status

### Calendar

Calendar entries may use the following markers:

| Marker | Meaning |
|---|---|
| P | Prayer |
| F | Fasting |
| C | Church |
| E | Event |
| B | Birthday |

The day-detail view combines manual calendar events with reading-plan assignments and completion state.

### New-user experience

When no reading plan exists:

- The Welcome card should appear first.
- The Today dashboard should be hidden or minimized.
- Creating the first reading plan should be the primary action.

A new user should not be shown an empty daily dashboard that implies missed activity before a plan has been created.

---

## PWA and Notifications

DiscipleOS has included work around:

- `manifest.webmanifest`
- App icons
- Service-worker registration
- `/sw.js`
- Browser notification permission
- Push subscription logic
- Timed reminder checks
- Installable PWA behavior

### Notification limitation

Browser and PWA notifications are not equally reliable across all browsers and devices.

Reliable reminders while the application is fully closed may eventually require:

- User accounts
- A backend scheduler
- Stored push tokens
- Native mobile notification support

That work is not required for the local-first MVP.

### VAPID keys

The VAPID public key may appear in frontend code because the browser requires it to create a push subscription.

The VAPID private key must never be committed or exposed in client-side code.

- Public key in frontend: expected
- Private key in frontend or Git history: security issue
- Secret environment files should remain untracked

---

## Design Direction

The current visual direction is a dark mountain-dashboard interface.

### Visual system

- Deep charcoal or near-black backgrounds
- Large mountain imagery
- White typography
- Violet, green, and gold accents
- Glass-like cards
- Bold dashboard presentation
- Minimal decorative church-app styling

### Recommended redesign order

1. Establish the global theme and design tokens.
2. Redesign the header and navigation.
3. Rebuild the Today dashboard.
4. Restyle reading-plan cards and progress displays.
5. Unify the calendar, plan builder, statistics, and secondary screens.
6. Add a public landing page with the mountain imagery and Get Started action.

### Redesign constraint

Do not replace the stable data model, reading-plan calculations, local-storage behavior, or navigation merely to achieve the visual redesign.

The redesign should be component-by-component rather than another architectural reset.

---

## Historical Technical Lessons

The database-backed version exposed several recurring problems:

- Local storage loaded plans.
- API hydration loaded plans again.
- Background refreshes replaced newer state with stale state.
- Mutations were followed by full reloads.
- Completion state disappeared after refresh.
- Plans appeared to vanish.
- Visibility and focus handlers caused additional reloads.
- A synchronization interval repeatedly reloaded stale data.
- Incomplete database records caused runtime crashes.
- Large UI and application logic were concentrated in one file.

The main lesson is that local storage, React state, and a remote database cannot all act as equal sources of truth.

For the current MVP, keep one clear authority.

---

## Locked Product Decisions

These decisions should remain in place unless there is a strong reason to change them:

- DiscipleOS is a discipline-building app, not only a reading tracker.
- The primary message is “Discipline that moves mountains.”
- The MVP must remain usable without accounts.
- Local storage is acceptable for initial validation.
- Stable reading-plan and calendar logic should survive the redesign.
- New users should create a plan before seeing an empty Today dashboard.
- Browser notification limitations should be communicated honestly.
- Native mobile development should return only if reliable closed-app reminders become essential.
- The interface should continue toward the dark mountain-dashboard concept.

---

## Immediate Work

### Technical verification

- [ ] Confirm the migrated Vite frontend runs correctly.
- [ ] Confirm local-storage data saves and reloads.
- [ ] Test creating, editing, completing, and deleting plans.
- [ ] Test randomized and consecutive plan generation.
- [ ] Test the calendar and day-detail view.
- [ ] Test notification permission and reminder behavior.
- [ ] Test installation as a PWA after migration.
- [ ] Confirm service-worker paths work with `BASE_PATH`.
- [ ] Review which API-server routes are still active.
- [ ] Confirm no private VAPID key or other secret entered Git history.
- [ ] Review and commit migration-related package changes.
- [ ] Decide when `.migration-backup` can be removed.

### Product work

- [ ] Complete the dark mountain-dashboard redesign.
- [ ] Break large screens into maintainable components.
- [ ] Improve onboarding.
- [ ] Test desktop, Android, mobile browser, and installed-PWA modes.
- [ ] Add real users.
- [ ] Observe where users become confused or disengaged.
- [ ] Decide whether cloud accounts and cross-device synchronization are justified.
- [ ] Reconsider native mobile development only after validation.

---

## Superseded Directions

The following approaches are no longer part of the active MVP direction:

- Treating Neon as the mandatory source of truth
- Reloading plans from the API every few seconds
- Reloading all data after every completion update
- Maintaining simultaneous local and database authority
- Building the native mobile app before validating the web product
- Keeping all application logic in one oversized page component
- Using the original root Next.js startup command after migration
- Replacing product logic during the visual redesign

Some code from these experiments may remain in the repository for reference, but it should not control current development.

---

## Security Notes

- Never commit `.env`, `.env.local`, or secret configuration files.
- Never expose private VAPID keys.
- Review Git history if a private key may have been committed.
- Treat frontend environment variables as public unless proven otherwise.
- Keep authentication and backend work isolated from the stable local-first flow.

---

## Deployment

The original application was deployed through Vercel.

The current migrated workspace should be revalidated before production deployment. Confirm:

- Build command
- Output directory
- `BASE_PATH`
- Service-worker paths
- Manifest paths
- Static assets
- PWA installation
- Local-storage persistence
- API dependencies

Do not assume the original Next.js deployment configuration applies to the Vite workspace.

---

## Project Handoff

DiscipleOS is a functioning local-first Bible reading discipline PWA with reading plans, completion tracking, calendar markers, reminders, and installability.

It has been migrated from Next.js into a Replit-managed Vite/React workspace and now needs:

1. Migration verification
2. Interface redesign
3. Regression testing
4. Real-user validation

It does not need another architectural rebuild.
