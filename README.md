# ExamTree Admin Prototype

A standalone frontend prototype of the ExamTree admin panel for SSC, Banking, Railway, and Punjab state exams. It uses mock data only: no real backend, authentication, database, or payment gateway is connected. Changes persist locally through a versioned localStorage store.

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview the production build |

## Technology

- React 18 and strict TypeScript
- Vite
- Tailwind CSS and shadcn/ui
- React Router v6
- Recharts
- Sonner
- Lucide React
- Vitest and React Testing Library

## Implemented prototype foundations

- Central Context/reducer store with localStorage persistence
- Mock role switching and granular frontend permissions
- Audit-history prototype
- Domain types and lifecycle status machines
- Saved views and advanced content tooling
- Global `Ctrl/Cmd + K` command palette
- Question versioning and similarity review
- Generation recipes and batch workflows
- Coverage Planner
- Exam Blueprints and rule-based auto-assembly
- Seven-step Test Builder with draft persistence
- In-app unsaved-change protection
- Test QA workspace with immutable publication versions

## Stabilization work

The current stabilization pass adds:

- one canonical Test QA implementation
- route-level lazy loading for Question Studio, Coverage Planner, Test Builder, Test QA, and analytics workspaces
- a shared route-loading fallback
- canonical `/tests/builder` routing with redirect from `/tests/test-builder`
- audit-log normalization during save, load, and selector reads
- audit persistence tests
- TypeScript pinned to `5.5.4`, which is supported by the current TypeScript ESLint parser
- lint configuration scoped so Fast Refresh warnings are only applied where they are meaningful

After pulling these changes, run `npm install` so the lockfile and local TypeScript installation match `package.json`.

## Test QA repair

The Test QA workspace is available at:

`/tests/qa`

It now:

- appears in Tests navigation
- resolves the selected test's saved Test Builder draft
- validates the actual assigned question IDs instead of taking arbitrary Question Bank rows
- checks missing and duplicate assignments
- validates correct answers, options, explanations, required language, section totals, and marks
- preserves the canonical `QA Approved` status
- calculates the next publication version number
- freezes real sections, assigned question IDs, instructions, and marking rules
- blocks publication when hard errors exist
- records QA comments and publication actions in the prototype audit trail

The legacy route `/tests/test-builder` redirects to the canonical `/tests/builder` route.

## Main routes

### Overview

- `/dashboard`

### Content

- `/content/questions`
- `/content/questions/:id`
- `/content/studio`
- `/content/review`
- `/content/coverage`
- `/content/taxonomy`
- `/content/sets`
- `/content/media`

### Tests

- `/tests`
- `/tests/builder`
- `/tests/qa`
- `/tests/series`
- `/tests/blueprints`
- `/tests/calendar`
- `/tests/:id`

### Commerce

- `/commerce/packages`
- `/commerce/packages/:id`
- `/commerce/orders`
- `/commerce/orders/:id`
- `/commerce/coupons`
- `/commerce/entitlements`

### Users

- `/users/students`
- `/users/students/:id`
- `/users/team`
- `/users/support`
- `/users/support/:id`
- `/users/notifications`

### Analytics

- `/analytics/business`
- `/analytics/tests`
- `/analytics/questions`
- `/analytics/content-quality`
- `/analytics/system-health`

### Settings

- `/settings/exam-config`
- `/settings/languages`
- `/settings/roles`
- `/settings/branding`
- `/settings/audit-logs`
- `/settings/integrations`

## Important prototype limitations

- All persistence is local to the browser.
- Role switching is a development/prototype tool, not authentication.
- Frontend permission checks are not security controls.
- Payment, notification, generation, analytics, and system-health data are simulated.
- Production audit records must be generated authoritatively by the backend.
- Audit normalization protects prototype storage and views; the future backend must write each audit event transactionally exactly once.
- A future backend must store explicit test-question assignments and immutable question-version references.
- Parts covering challenges, corrections, imports, background jobs, feature flags, advanced commerce, and final backend specifications are still pending.
