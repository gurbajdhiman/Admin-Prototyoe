# ExamTree Admin Prototype

A standalone frontend prototype of the ExamTree admin panel — a mock-test platform for SSC, Banking, Railway, and Punjab state exams. This prototype uses **mock data only** with no real backend, no real authentication, and no payment gateway. All changes persist locally to localStorage and can be reset.

## Quick Start

```bash
npm install
npm run dev
```

The dev server starts automatically. Open the URL shown in your terminal.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and create production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview the production build |

## Tech Stack

- **React 18** + **TypeScript** (strict mode)
- **Vite** — build tool and dev server
- **Tailwind CSS** — styling with HSL CSS variables
- **shadcn/ui** (new-york style) — UI component library
- **React Router v6** — client-side routing
- **Recharts** — data visualization
- **Sonner** — toast notifications
- **Lucide React** — icons
- **Vitest** + **React Testing Library** — testing

## Key Features

### Connected Local Workflows
- **Central prototype store** (`src/app/store/`) — all data lives in a React Context + reducer, initialized from mock datasets, persisted to localStorage with a versioned schema
- **Actions persist** — approving a question, creating a test, granting entitlements, resolving support tickets, and all other mutations update the store and survive page refresh
- **Audit logging** — every meaningful mutation creates an audit entry with admin name, role, action, entity, old/new values, reason, and session ID; a reducer-level deduplication guard prevents duplicate entries when an audit entry is both returned by `audit()` and passed to a mutation action
- **Reset prototype data** — restore all data to defaults from Settings → Exam Configuration → Prototype Settings

### Role-Based Access
- **10 prototype roles** switchable from the profile menu in the topbar
- **47 granular permissions** — each role has a defined subset of permissions spanning content, generation, coverage, tests, commerce, corrections, challenges, imports, jobs, feature flags, roles, and refunds
- **Permission enforcement** — `hasPermission()` checks for `['all']` wildcard or specific permission membership; unavailable actions are disabled with tooltips
- **Permission matrix** — visualized in Settings → Roles & Permissions

### Test Builder
- **Controlled draft model** — all 7 steps share a single draft state, values persist between steps
- **Full round-trip editing** — opening an existing test restores all fields exactly (sections, pattern, description, selected questions, navigation rules, schedule); saving without changes preserves the original values
- **Unsaved-changes protection** — in-app route navigation blocker with Save Draft / Discard Changes / Continue Editing dialog, plus browser beforeunload warning
- **Dynamic validation** — issues calculated from current draft data; publishing blocked when errors exist
- **Draft persistence** — drafts saved to localStorage and restored on return

### Question Studio
- **Mock AI generation** — deterministic seeded generation creates batches of questions
- **Full lifecycle** — generated questions can be edited, regenerated (stem/options/explanation), duplicated, approved into the Question Bank, or rejected
- **Batch summaries** — track approved/rejected/needs-fix/unreviewed counts per batch

### Detail Routes
- `/content/questions/:id` — question detail with audit history
- `/tests/:id` — test detail with performance tabs and audit history
- `/commerce/packages/:id` — package detail with orders and toggles
- `/commerce/orders/:id` — order detail with payment timeline and actions
- `/users/support/:id` — support detail with comments and status workflow

### Prototype Settings
- Simulate slow connection, API failure, or empty states
- Reset all prototype data to defaults
- Located in Settings → Exam Configuration

## Project Structure

```
src/
├── App.tsx                          # Router with all routes
├── app/
│   ├── store/                       # Central data layer
│   │   ├── PrototypeStore.tsx       # Context + reducer + provider
│   │   ├── types.ts                 # Runtime store types
│   │   ├── domain-types.ts          # Comprehensive domain types for future backend contracts
│   │   ├── status-machines.ts       # Transition maps + guards for 6 entity status machines
│   │   ├── persistence.ts           # localStorage, audit, roles, permissions
│   │   ├── selectors.ts             # Typed hooks for store data
│   │   └── validation.ts            # Test Builder validation
│   ├── theme/ThemeProvider.tsx
│   ├── nav/navigation.ts
│   └── layout/                      # AdminLayout, Sidebar, Topbar, Breadcrumbs
├── components/
│   ├── shared/                      # PageHeader, DataTable, FilterBar, GatedAction, UnsavedChangesDialog
│   └── ui/                          # shadcn/ui primitives
├── data/                            # Mock datasets (read-only)
├── pages/                           # 37+ pages across 7 modules
└── test/                            # Vitest test files (audit dedup, status machines, round-trip, etc.)
```

## Navigation Groups

| Group | Pages |
|-------|-------|
| **Overview** | Dashboard |
| **Content** | Question Bank, Question Studio, Content Review, Taxonomy, DI/Passage Sets, Media Library, Question Detail |
| **Tests** | Tests, Test Builder, Test Series, Exam Blueprints, Publishing Calendar, Test Detail |
| **Commerce** | Packages, Orders & Payments, Coupons, Entitlements, Package Detail, Order Detail |
| **Users** | Students, Student Detail, Admin Team, Support Requests, Support Detail, Notifications |
| **Analytics** | Business, Test, Question, Content Quality, System Health |
| **Settings** | Exam Configuration, Languages, Roles & Permissions, Branding, Audit Logs, Integrations |

## Important Notes

- **All data is mock.** No API calls, no database, no authentication, no payment processing.
- **Changes persist locally** — mutations save to localStorage and survive refresh. Use "Reset Prototype Data" to restore defaults.
- **Role switching is for prototype testing only** — no real authentication exists.
- Every Settings page includes a notice: "This standalone prototype is not connected to the live ExamTree application."
