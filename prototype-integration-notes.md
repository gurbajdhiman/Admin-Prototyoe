# Prototype Integration Notes

Reference document for integrating the ExamTree admin prototype's patterns, components, and structure into the live ExamTree application.

## 1. Route Structure

All routes are defined in `src/App.tsx` using React Router v6 `createBrowserRouter` (data router). Every route is wrapped in `AdminLayout` via a layout route with `<Outlet />`. The data router is required for `useBlocker`-based in-app navigation blocking.

```
/                                    → redirects to /dashboard
/dashboard                           → DashboardPage
/content/questions                   → QuestionBankPage
/content/questions/:id               → QuestionDetailPage
/content/studio                      → QuestionStudioPage
/content/review                      → ContentReviewPage
/content/taxonomy                    → TaxonomyPage
/content/sets                        → DiPassageSetsPage
/content/media                       → MediaLibraryPage
/tests                               → TestsPage
/tests/builder                       → TestBuilderPage (new test)
/tests/test-builder                  → TestBuilderPage (edit existing test)
/tests/series                        → TestSeriesPage
/tests/blueprints                    → ExamBlueprintsPage
/tests/calendar                      → PublishingCalendarPage
/tests/:id                           → TestDetailPage
/commerce/packages                   → PackagesPage
/commerce/packages/:id               → PackageDetailPage
/commerce/orders                     → OrdersPaymentsPage
/commerce/orders/:id                 → OrderDetailPage
/commerce/coupons                    → CouponsPage
/commerce/entitlements               → EntitlementsPage
/users/students                      → StudentsPage
/users/students/:id                  → StudentDetailPage
/users/team                          → AdminTeamPage
/users/support                       → SupportRequestsPage
/users/support/:id                   → SupportDetailPage
/users/notifications                 → NotificationsPage
/analytics/business                  → BusinessAnalyticsPage
/analytics/tests                     → TestAnalyticsPage
/analytics/questions                 → QuestionAnalyticsPage
/analytics/content-quality           → ContentQualityPage
/analytics/system-health             → SystemHealthPage
/settings/exam-config                → ExamConfigurationPage
/settings/languages                  → LanguagesPage
/settings/roles                      → RolesPermissionsPage
/settings/branding                   → BrandingPage
/settings/audit-logs                 → AuditLogsPage
/settings/integrations               → IntegrationsPage
*                                    → NotFoundPage
```

Navigation metadata lives in `src/app/nav/navigation.ts` as `NAV_GROUPS` (7 groups with items, icons, badge counts) and `NAV_LOOKUP` (flat map by path for breadcrumbs). To add a route: add a route object in `App.tsx`, add the nav item to the appropriate group in `navigation.ts`, and create the page file.

## 2. Reusable Components

### Layout Shell
- **AdminLayout** (`src/app/layout/AdminLayout.tsx`) — wraps sidebar, topbar, breadcrumbs, and `<Outlet>`. Manages collapsed and mobileOpen sidebar state.
- **Sidebar** — renders `NAV_GROUPS` with collapsible sections. Active state via `NavLink`. Replace the brand header and status footer with live branding.
- **Topbar** — search input (mock), Prototype Mode badge, theme toggle, notifications dropdown (mock), profile menu (mock). Wire search to a real search API and notifications to a live feed.
- **Breadcrumbs** — auto-generates from `NAV_LOOKUP` using `useLocation().pathname`. No changes needed when adding routes if nav metadata is kept in sync.

### Theme System
- **ThemeProvider** (`src/app/theme/ThemeProvider.tsx`) — context-based replacement for `next-themes`. Persists to `localStorage` under `examtree-theme`. Reads/writes the `dark` class on `document.documentElement`.
- If the live app uses `next-themes` (Next.js), replace this provider with `next-themes`'s `ThemeProvider` — the CSS variable contract is identical.

### Shared Components (`src/components/shared/`)

| Component | Purpose | Integration Notes |
|-----------|---------|-------------------|
| **PageHeader** | Title, description, icon, action buttons | Drop-in for every page header |
| **StatCard** | Metric with value, delta, sublabel, tone | Wire `value`/`delta` to live API responses |
| **StatusBadge** | Tone-based badge with 7 tones | Domain helpers (`questionStatusTone`, `testStatusTone`, `supportStatusTone`, `difficultyTone`) map domain statuses to tones |
| **DataTable<T>** | Generic table: search, sort, pagination, bulk selection | Replace mock data arrays with API fetch results. Props: `data`, `columns`, `searchKeys`, `selectable`, `onRowClick`. Column type: `{ key, header, render?, sortable?, className? }` |
| **FilterBar** | Select-based filter row with active count + clear | Pass filter definitions `{ key, label, options }`. Wire `onChange` to query params or state |
| **ConfirmDialog** | AlertDialog wrapper for destructive confirmations | Use before delete/refund/revoke actions |
| **EmptyState** | Empty and error illustrations | Show when API returns empty or errors |
| **Skeleton** | Shimmer placeholder | Show during API loading states |
| **toast.ts** | `showToast.success/error/info/warning` | Wraps Sonner. Already wired — no changes needed |

### Tone System
`StatusBadge` supports 7 tones: `success`, `warning`, `info`, `destructive`, `neutral`, `primary`, `accent`. Helper functions map domain statuses:
- `questionStatusTone(status)` — Draft→neutral, In Review→info, Approved→success, Rejected→destructive, Published→primary
- `testStatusTone(status)` — Draft→neutral, Scheduled→info, Live→primary, Completed→success, Archived→warning
- `supportStatusTone(status)` — New→info, Investigating→warning, Resolved→success, Rejected→destructive
- `difficultyTone(level)` — Easy→success, Medium→info, Hard→warning, Expert→destructive

## 3. Mock Data Layer → API Contracts

Each mock data file in `src/data/` corresponds to a domain. The shapes defined there are the proposed API response contracts.

### `data/exams.ts`
| Export | Type | Live API Equivalent |
|--------|------|---------------------|
| `EXAMS` | `Exam[]` | `GET /api/exams` |
| `SUBJECTS` | `string[]` | `GET /api/subjects` |
| `DIFFICULTIES`, `LANGUAGES`, `QUESTION_TYPES`, `QUESTION_STATUSES`, `TEST_STATUSES`, `TEST_TYPES` | `string[]` | Enum endpoints or constants |
| `ADMIN_NAMES`, `REVIEWERS` | `string[]` | `GET /api/admins` (filtered) |
| `EXAM_FAMILIES` | `string[]` | Derived from exams |

### `data/questions.ts`
| Export | Type | Live API Equivalent |
|--------|------|---------------------|
| `QUESTIONS` | `Question[]` (48 items) | `GET /api/questions` (paginated, filterable) |
| `QUESTION_FILTER_OPTIONS` | filter option arrays | Derived from question data |

**Question shape:**
```typescript
interface Question {
  id: string;
  exam: string;
  subject: string;
  topic: string;
  difficulty: string;
  language: string;
  type: string;
  status: string;
  stem_en: string;
  stem_hi?: string;
  stem_pa?: string;
  options: { id: string; text_en: string; text_hi?: string; text_pa?: string }[];
  correctOptionId: string;
  explanation_en: string;
  explanation_hi?: string;
  explanation_pa?: string;
  marks: number;
  negativeMarks: number;
  createdAt: string;
  createdBy: string;
  reviewedBy?: string;
}
```

### `data/tests.ts`
| Export | Type | Live API Equivalent |
|--------|------|---------------------|
| `TESTS` | `Test[]` (32 items) | `GET /api/tests` |
| `TEST_SERIES` | `TestSeries[]` (8 items) | `GET /api/test-series` |
| `BLUEPRINTS` | `Blueprint[]` (6 items) | `GET /api/blueprints` |

### `data/commerce.ts`
| Export | Type | Live API Equivalent |
|--------|------|---------------------|
| `PACKAGES` | `Package[]` (6 items) | `GET /api/packages` |
| `ORDERS` | `Order[]` (40 items) | `GET /api/orders` |
| `COUPONS` | `Coupon[]` (6 items) | `GET /api/coupons` |
| `ENTITLEMENTS` | `Entitlement[]` (24 items) | `GET /api/entitlements` |

### `data/users.ts`
| Export | Type | Live API Equivalent |
|--------|------|---------------------|
| `STUDENTS` | `Student[]` (60 items) | `GET /api/students` |
| `ADMIN_TEAM` | `AdminMember[]` (10 items) | `GET /api/admin-team` |
| `ADMIN_ROLES` | `AdminRole[]` | `GET /api/roles` |
| `SUPPORT_REQUESTS` | `SupportRequest[]` (28 items) | `GET /api/support` |

### `data/analytics.ts`
| Export | Type | Live API Equivalent |
|--------|------|---------------------|
| `REVENUE_TREND` | monthly revenue data | `GET /api/analytics/revenue` |
| `STUDENT_ACTIVITY_TREND` | daily active/new users | `GET /api/analytics/activity` |
| `TEST_PERFORMANCE` | per-test attempts + completion | `GET /api/analytics/tests` |
| `SECTION_PERFORMANCE` | section accuracy + skip rates | `GET /api/analytics/sections` |
| `OPTION_DISTRIBUTION` | answer option counts | `GET /api/analytics/options` |
| `PACKAGE_SALES` | sales by package | `GET /api/analytics/package-sales` |
| `CONVERSION_FUNNEL` | funnel stage data | `GET /api/analytics/funnel` |
| `CONTENT_COVERAGE` | coverage by exam | `GET /api/analytics/coverage` |

### `data/auxiliary.ts`
| Export | Type | Live API Equivalent |
|--------|------|---------------------|
| `DI_SETS` | `DiSet[]` (8 items) | `GET /api/di-sets` |
| `MEDIA_ASSETS` | `MediaAsset[]` (8 items) | `GET /api/media` |
| `NOTIFICATIONS` | `Notification[]` (6 items) | `GET /api/notifications` |
| `AUDIT_LOGS` | `AuditLog[]` (10 items) | `GET /api/audit-logs` |

## 4. Database Entities (Proposed)

Based on the mock data shapes, the live database should include:

| Table | Key Fields | Notes |
|-------|------------|-------|
| `exams` | id, name, family, stages[], languages[] | Exam catalog |
| `subjects` | id, name, exam_id | Linked to exams |
| `questions` | id, exam_id, subject, topic, difficulty, language, type, status, stem_*, options (JSONB), correct_option_id, explanation_*, marks, negative_marks, created_by, reviewed_by | Bilingual columns for en/hi/pa |
| `tests` | id, exam_id, title, type, status, duration, total_marks, sections (JSONB), scheduled_at, created_by | Test definitions |
| `test_series` | id, name, exam_id, test_ids[], price, status | Grouped test bundles |
| `blueprints` | id, exam_id, name, sections[] (subject, question_count, marks, difficulty) | Exam pattern templates |
| `packages` | id, name, exam_ids[], price, discount, duration, test_count, status | Sellable bundles |
| `orders` | id, student_id, package_id, amount, status, payment_method, txn_id, created_at | Payment records |
| `coupons` | id, code, type, value, max_uses, used, expires_at, active | Discount codes |
| `entitlements` | id, student_id, package_id, source, expires_at, status | What students have access to |
| `students` | id, name, phone, email, target_exam, language, registered_at, last_active, account_status, active_packages, tests_attempted, avg_score | Student accounts |
| `admin_team` | id, name, email, role, permissions[], last_active, status | Admin users |
| `admin_roles` | id, name, description, permissions[], color | Role definitions |
| `support_requests` | id, type, student_id, related_test_id, related_question_id, language, priority, status, assigned_agent, created_at | Support tickets |
| `notifications` | id, title, channel, audience, template, scheduled_at, status, delivered, opened, clicked | Campaign records |
| `di_sets` | id, title, exam, language, passage, linked_questions[] | Comprehension/DI groups |
| `media_assets` | id, name, type, url, size, uploaded_by, uploaded_at | Uploaded media |
| `audit_logs` | id, timestamp, admin_id, action, entity, old_value, new_value, reason, ip, approval_status | Immutable audit trail |

## 5. Permission Model

### Roles
The prototype defines roles in `data/users.ts` as `ADMIN_ROLES`. The permission matrix is visualized in `RolesPermissionsPage` and `AdminTeamPage`.

### Permission Scopes (47 granular permissions)
| Permission Group | Permissions | Scope |
|------------------|------------|-------|
| Questions | `questions.view`, `questions.create`, `questions.edit`, `questions.review`, `questions.archive` | Question CRUD and review |
| Content | `content.view` | View content module |
| Generation | `generation.use`, `generation.manage` | AI question generation |
| Coverage | `coverage.view`, `coverage.manage` | Exam coverage planning |
| Tests | `tests.view`, `tests.create`, `tests.edit`, `tests.publish`, `tests.qa` | Test CRUD, publishing, and QA review |
| Commerce | `commerce.view`, `payments.manage`, `refunds.request`, `refunds.approve`, `entitlements.manage`, `packages.manage`, `coupons.manage` | Payments, packages, orders, coupons, entitlements |
| Users | `users.view`, `users.manage` | Student and admin team management |
| Support | `support.view`, `support.manage` | Support ticket queue |
| Notifications | `notifications.send` | Campaign management |
| Analytics | `analytics.view` | All analytics dashboards |
| Settings | `settings.manage` | Platform configuration |
| Audit | `audit.view` | View audit logs |
| Studio/Review | `studio.use`, `review.approve`, `review.reject`, `review.comment` | Question studio and content review |
| Taxonomy | `taxonomy.manage` | Exam/subject/chapter/topic tree |
| Series | `series.manage` | Test series bundles |
| Blueprints | `blueprints.manage` | Exam pattern templates |
| Corrections | `corrections.view`, `corrections.manage`, `recalculation.manage` | Correction cases and score recalculation |
| Challenges | `challenges.view`, `challenges.manage` | Student question challenges |
| Imports | `imports.manage` | Bulk data imports |
| Jobs | `jobs.view`, `jobs.manage` | Background job monitoring |
| Feature Flags | `featureflags.view`, `featureflags.manage` | Feature flag configuration |
| Roles | `roles.manage` | Admin role and permission management |
| Reports | `reports.export` | Data export |

### Integration Notes
- In the live app, permissions should be enforced server-side (RBAC middleware on every API endpoint).
- The frontend should check permissions to show/hide nav items and action buttons. Replace the mock `permissions[]` array on `AdminTeam` with the decoded JWT claims or a `/api/me/permissions` response.
- Super Admin has all permissions; other roles have scoped subsets.

## 6. Integration Areas

### Content Module
- **Question Bank** → replace `QUESTIONS` mock with paginated API. Filters map to query params (`?exam=&subject=&status=&difficulty=&language=`).
- **Question Studio** → wire "Generate" to the AI generation endpoint. The batch list and validation panel reflect the generation job status. Replace the simulated loading with real SSE/WebSocket progress.
- **Content Review** → wire to review queue API. Approve/reject/correct actions call `POST /api/reviews/{id}/{action}`.
- **Taxonomy** → tree view reads from `GET /api/taxonomy`. Rename/archive/merge/move call respective endpoints.
- **DI/Passage Sets** → CRUD for grouped questions sharing a passage.
- **Media Library** → wire upload to S3 presigned URL flow. Replace mock Pexels image URLs with actual uploaded asset URLs.

### Tests Module
- **Tests list** → `GET /api/tests` with filters.
- **Test Builder** → 7-step wizard. Each step's data should be saved as a draft (auto-save). The final step publishes via `POST /api/tests`.
- **Test Series** → CRUD for series bundles.
- **Exam Blueprints** → CRUD for pattern templates.
- **Publishing Calendar** → `GET /api/tests?status=scheduled` filtered by month.

### Commerce Module
- **Packages** → CRUD. Detail sheet toggles (active/featured) map to `PATCH /api/packages/{id}`.
- **Orders & Payments** → integrate with Razorpay/Cashfree webhooks for payment status sync. Refund action calls `POST /api/orders/{id}/refund`.
- **Coupons** → CRUD with validation UI.
- **Entitlements** → revoke action calls `POST /api/entitlements/{id}/revoke`.

### Users Module
- **Students** → `GET /api/students` with search and filters. Detail page aggregates entitlements, payments, attempts, performance, support, sessions, notes, timeline.
- **Admin Team** → CRUD for admin members. Permission matrix is read from roles. Role assignment updates `PATCH /api/admin-team/{id}`.
- **Support Requests** → queue with assignment workflow. Actions: assign, investigate, resolve, reject.
- **Notifications** → campaign management. SMS/WhatsApp channels need real gateway integration (Twilio, WhatsApp Business API).

### Analytics Module
- All analytics pages read from aggregated API endpoints. Charts use `REVENUE_TREND`, `STUDENT_ACTIVITY_TREND`, `TEST_PERFORMANCE`, `SECTION_PERFORMANCE`, `OPTION_DISTRIBUTION`, `PACKAGE_SALES`, `CONVERSION_FUNNEL`, `CONTENT_COVERAGE`.
- Date range and exam filters should map to query params.
- **System Health** → wire to monitoring service (status page API, health checks).

### Settings Module
- All settings pages need persistent storage. Each toggle/form should `PATCH` the relevant settings endpoint.
- **Audit Logs** → read-only, immutable. `GET /api/audit-logs` with filters.
- **Integrations** → OAuth/API key flows for each service. Webhook URL management.

## 7. Isolation Areas (What Stays Prototype-Only)

These features are simulated and must not be wired to real services without proper review:

| Feature | Prototype Behavior | Live Integration Required |
|---------|-------------------|--------------------------|
| Authentication | None — all pages accessible | Firebase Auth or equivalent (JWT-based) |
| Data persistence | In-memory mock arrays | PostgreSQL via an existing or new Express backend |
| Payment processing | Toast notification only | Razorpay or equivalent gateway + webhooks |
| SMS notifications | Placeholder, not sent | Twilio API integration |
| WhatsApp notifications | Placeholder, not sent | WhatsApp Business API |
| Push notifications | Mock status shown | Firebase Cloud Messaging |
| Email notifications | Mock status shown | SendGrid/SES integration |
| AI question generation | Simulated loading + mock batch | OpenAI/generation service + queue |
| File uploads | Dashed placeholder, no upload | S3 presigned URL flow |
| Search (topbar) | Non-functional input | Elasticsearch or Postgres full-text |
| Theme | localStorage only | Same approach works for live |
| Audit log immutability | Mock data, no enforcement | DB-level immutability + append-only |

## 8. Design System Integration

The CSS variable contract in `src/index.css` is framework-agnostic. To integrate into the live app:

1. Copy the `:root` and `.dark` variable blocks into the live app's global CSS.
2. Ensure Tailwind config extends the same color tokens (`sidebar`, `chart-1` through `chart-6`, `success`, `warning`, `info`).
3. Import the same fonts (Inter, Plus Jakarta Sans).
4. The `ThemeProvider` can be replaced with `next-themes` if the live app is Next.js — the `dark` class strategy is identical.

## 9. Component Replacement Path

When integrating, replace mock data imports with API calls:

```typescript
// Prototype (refined — uses central store)
import { useQuestions } from "@/app/store/selectors";
const questions = useQuestions();

// Live
const { data, loading, error } = useQuery("/api/questions", { filters });
```

The `DataTable`, `FilterBar`, `StatCard`, `PageHeader`, `StatusBadge`, `ConfirmDialog`, and `GatedButton` components are production-ready and need no changes — just pass real data. `GatedButton` is permission-aware (see Section 10) and reads the active role's permissions from the store.

For loading states, wrap page content in a conditional that renders `<Skeleton>` while `loading` is true, `<ErrorState>` if `error` is true, and the page content otherwise.

## 10. Refinement Additions

The prototype was refined mid-build with a central store, detail routes, a permission-gated component, server-style audit logging, and a Test Builder draft/validation layer. This section documents those additions and how each maps to the live application.

### Central Store Architecture

All prototype state now flows through a single store in `src/app/store/` instead of being imported directly from `src/data/*`. Pages read state via selector hooks and mutate it via `dispatch` actions, with every mutation optionally writing an audit entry.

| Store File | Prototype Responsibility | Live App Equivalent |
|------------|---------------------------|---------------------|
| `PrototypeStore.tsx` | React Context + `useReducer`; defines all `Action` types and the reducer (including ID-based audit dedup guard); exposes `usePrototypeStore()` with `state`, `dispatch`, `activeRole`, `activePermissions`, `hasPermission()`, `audit()`, `resetData()`, `setRole()`, and test-draft helpers | Replace with a server cache (React Query / SWR) for reads and mutation hooks for writes. Each reducer action becomes an API call + cache invalidation. The Context provider becomes an auth/session provider. The audit dedup guard becomes a server-side unique constraint on audit entry IDs. |
| `domain-types.ts` | Comprehensive domain types for future backend contracts: ExamFamily, Exam, Subject, QuestionVersion, GenerationRecipe, TestBlueprint, PublicationSnapshot, CorrectionCase, BackgroundJob, FeatureFlag, etc. | Use as the canonical TypeScript types for API contracts. Generate OpenAPI schema types from these, or use them directly as shared types between frontend and backend. |
| `status-machines.ts` | Six status machines (Question, Test, GenerationBatch, Challenge, Correction, Order) with transition maps and `canTransition*()` guard functions | Mirror server-side as the authoritative transition logic. Each `canTransition*()` function maps to a server-side state-transition guard; `getValidTransitions()` can drive UI to show valid next actions. |
| `persistence.ts` | localStorage persistence under `examtree-prototype-v1` with `SCHEMA_VERSION`; `createDefaultState()` seeds from mock data; `ROLE_PERMISSIONS` map (10 roles, 47 granular permissions) and `ALL_PERMISSIONS`; `hasPermission()`; audit ID + session ID generation; `createAuditEntry()` | localStorage → PostgreSQL. `SCHEMA_VERSION` → database migrations. `createDefaultState()` → seed/migration data. `ROLE_PERMISSIONS` → server RBAC tables or JWT claims (see Permission Model below). Session ID → server session/JWT `sid` claim. |
| `selectors.ts` | Hook-based selectors: `useQuestions`, `useTests`, `useTestById`, `useQuestionById`, `usePackages`, `useOrders`, `useOrderById`, `useCoupons`, `useEntitlements`, `useEntitlementsByStudent`, `useStudents`, `useStudentById`, `useSupportRequests`, `useSupportById`, `useNotifications`, `useAuditLogs`, `useAuditByEntity`, `useStudentNotes`, `useSupportComments`, `useGeneratedBatches`, `useTestDrafts` | Replace each with a React Query `useQuery` hook bound to the corresponding API endpoint. `use*ById` selectors map to `GET /api/{resource}/:id`; `useAuditByEntity` maps to `GET /api/audit-logs?entityId=`. |
| `validation.ts` | `validateDraft(draft)` returns `ValidationIssue[]` (severity `error` / `warning` / `info`); `canPublish(draft)` returns true when zero errors. Covers name, exam, totals, section sums, duplicate section names, selected-question count, duplicate question IDs, schedule, and QA-reviewer checks | Mirror as server-side validation (Zod schemas on the API). `canPublish` becomes a pre-publish server check. Keep the client copy for instant inline feedback, but the server is the source of truth. |
| `types.ts` | `PrototypeState`, `AuditEntry`, `EntityType`, `PrototypeRole`, `PrototypeSettings`, `BrandingSettings`, `StudentNote`, `SupportComment`, `GeneratedBatch`, `GeneratedQuestion`, `TestDraft`, `TestDraftSection`; re-exports domain types | Shared TypeScript types / generated OpenAPI schema types. `AuditEntry` and `TestDraft` become the canonical API contract types. |

### Audit Deduplication

The reducer's `ADD_AUDIT` case includes an ID-based dedup guard: `if (state.auditLogs.some((a) => a.id === action.entry.id)) return state`. This prevents duplicate entries when an audit entry is both returned by `audit()` (which dispatches `ADD_AUDIT`) and passed as an `audit:` property to a mutation action (which also dispatches `ADD_AUDIT`). In the live app, enforce this with a unique constraint on `audit_logs.id` and an INSERT-only access pattern.

### Test Builder Round-Trip

The Test Builder saves the full draft under a `test-saved-{id}` key in the `testDrafts` store on publish. When editing an existing test, the initializer checks for this key and restores the full draft (sections, pattern, description, selected questions, navigation rules, schedule, series). Without this key (e.g., tests created before the round-trip fix), it falls back to `testToDraft()` which maps from the simplified `Test` object and applies defaults. In the live app, the `GET /api/tests/:id` response should include the full test definition so the round-trip key is unnecessary.

### In-App Navigation Blocking

`useUnsavedChanges` now integrates `useBlocker` from react-router-dom, which requires the data router (`createBrowserRouter`). When the blocker triggers, the `UnsavedChangesDialog` component offers three actions: Continue Editing, Discard Changes, Save Draft. In the live app, this pattern works as-is — `useBlocker` is a standard React Router v6 feature. The `UnsavedChangesDialog` component is reusable across any form page.

### Status Machines

`status-machines.ts` defines six status machines with transition maps and guard functions:

| Machine | States | Guard Function |
|---------|--------|----------------|
| Question | 7 states (Draft → Generated → Under Review → Needs Fix → Approved/Rejected → Archived) | `canTransitionQuestion()` |
| Test | 9 states (Draft → Content Ready → Under QA → Needs Fix → QA Approved → Scheduled → Live → Completed → Archived) | `canTransitionTest()` |
| GenerationBatch | 9 states (Draft → Queued → Running → Validation → Review → Partially Approved/Approved/Failed/Cancelled) | `canTransitionGenerationBatch()` |
| Challenge | 7 states (New → Investigating → Accepted/Rejected → Correction Required → Recalculation Required → Resolved) | `canTransitionChallenge()` |
| Correction | 8 states (Draft → Impact Calculated → Awaiting Approval → Approved → Running → Completed/Failed/Rejected) | `canTransitionCorrection()` |
| Order | 6 states (Created → Pending → Paid/Failed → Partially Refunded → Refunded) | `canTransitionOrder()` |

`getValidTransitions<S>(map, current)` returns the set of valid next states for a given machine. In the live app, mirror these transition maps server-side as the authoritative state-transition logic; use the client-side guards for instant UI feedback.

### Detail Routes

Five new detail pages were added, each following the same pattern: load the entity by ID via a selector hook, render a read-only summary with tabs, gate destructive actions behind `GatedButton`, and write an audit entry on every mutation.

| Route | Page | Selector | Audit Entity Type |
|-------|------|----------|-------------------|
| `/content/questions/:id` | `QuestionDetailPage` | `useQuestionById` | `question` |
| `/tests/:id` | `TestDetailPage` | `useTestById` | `test` |
| `/commerce/packages/:id` | `PackageDetailPage` | `usePackages` + find | `package` |
| `/commerce/orders/:id` | `OrderDetailPage` | `useOrderById` | `order` |
| `/users/support/:id` | `SupportDetailPage` | `useSupportById` | `support` |

`/users/students/:id` (`StudentDetailPage`) pre-existed and aggregates entitlements, payments, attempts, performance, support tickets, session history, notes, and timeline. Add each new detail route to `NAV_LOOKUP` if it should appear in breadcrumbs (detail pages typically derive the crumb from the parent list route).

### Permission Model Integration Notes

The store derives permissions from `ROLE_PERMISSIONS` in `persistence.ts` and exposes `hasPermission(permission)` via `usePrototypeStore()`. The `activeRole` is a mock string the user can switch in the UI.

Integration steps for the live app:
- Replace the mock `activeRole` with the authenticated user's role decoded from JWT claims (or fetched from `/api/me/permissions`).
- Replace `ROLE_PERMISSIONS` with server-side RBAC: a `roles` table, a `permissions` table, and a `role_permissions` join table. Enforce every permission check server-side in API middleware; the frontend check is for UX only.
- Keep `GatedButton` (`src/components/shared/GatedAction.tsx`) as-is — it already reads `hasPermission` from the store, so once the store's permission source is swapped to JWT claims, every gated button updates automatically.
- `GatedAction` (the wrapper variant) wraps arbitrary children; `GatedButton` renders a disabled button with a tooltip explaining the missing permission. Both are production-ready.
- The `'all'` wildcard permission (Super Admin) should map to a server-side super-admin flag rather than a literal permission string.

### Audit Logging Schema

Every store mutation can carry an optional `audit` entry created via the store's `audit()` helper. `AuditEntry` (from `types.ts`) captures admin, role, action, entity, old/new values, reason, session ID, and approval status. In the live app this must be an append-only, immutable table.

Suggested schema (refines the `audit_logs` table from Section 4 to match the prototype's `AuditEntry` shape):

```sql
CREATE TABLE audit_logs (
  id              TEXT PRIMARY KEY,          -- e.g. "AL-<epoch>-<seq>"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_id        UUID REFERENCES admin_team(id) ON DELETE SET NULL,
  admin_name      TEXT NOT NULL,             -- denormalized for history
  role            TEXT NOT NULL,             -- denormalized for history
  action          TEXT NOT NULL,             -- e.g. QUESTION_APPROVED, ORDER_REFUNDED
  entity_type     TEXT NOT NULL,             -- question | test | order | ...
  entity_id       TEXT NOT NULL,
  entity_name     TEXT NOT NULL,
  old_value       TEXT,                      -- JSON snapshot or scalar
  new_value       TEXT,                      -- JSON snapshot or scalar
  reason          TEXT NOT NULL,
  session_id      TEXT NOT NULL,             -- ties to auth session / JWT sid
  ip_address      INET,
  approval_status TEXT NOT NULL DEFAULT 'Auto'  -- Auto | Approved | Pending
);

-- Append-only: deny UPDATE and DELETE to all roles.
-- Use a trigger or GRANT only INSERT + SELECT.
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION raise_immutable('audit_logs is append-only');
```

Query pattern for entity-scoped audit trails (used by detail pages): `GET /api/audit-logs?entityId={id}` returns newest-first, matching `useAuditByEntity`.

### Test Builder Draft Integration Notes

The Test Builder's 7-step wizard now persists drafts through the store rather than local component state:

- `saveTestDraft(key, draft)` and `deleteTestDraft(key)` are called on auto-save and on publish/discard. `getTestDraft(key)` hydrates the wizard on reload. Drafts survive page refresh via the store's localStorage persistence.
- `validateDraft(draft)` runs on every render via `useMemo` and drives the inline validation panel. `canPublish(draft)` gates the publish button.
- The draft key is derived from the route (`:id` for edits, a generated key for new tests).

Live integration:
- Replace `saveTestDraft` / `deleteTestDraft` with `PUT /api/test-drafts/:key` and `DELETE /api/test-drafts/:key` (autosave debounced). Persist drafts in a `test_drafts` table keyed by admin + draft key.
- Move `validateDraft` to the server as the publish endpoint's validation layer; keep the client copy for instant feedback.
- On publish, `POST /api/tests` consumes the finalized draft, writes the `tests` row, and emits an audit entry server-side. The client then `deleteTestDraft(key)`.

### Suggested New API Contracts (Connected Workflows)

The connected workflows (detail pages, audit trails, notes/comments, generation batches, test drafts) require endpoints beyond the list CRUD contracts in Section 3:

| Endpoint | Method | Purpose | Source Workflow |
|----------|--------|---------|-----------------|
| `/api/questions/:id` | GET | Single question with options + explanations | QuestionDetailPage |
| `/api/tests/:id` | GET | Single test with sections | TestDetailPage |
| `/api/packages/:id` | GET | Single package with series + pricing | PackageDetailPage |
| `/api/orders/:id` | GET | Single order with payment + entitlement links | OrderDetailPage |
| `/api/support/:id` | GET | Single support request with assignment + history | SupportDetailPage |
| `/api/audit-logs` | GET | Filterable audit log; `?entityId=` for entity-scoped trails | All detail pages |
| `/api/students/:id/notes` | GET, POST | Internal staff notes on a student | StudentDetailPage |
| `/api/support/:id/comments` | GET, POST | Threaded comments on a support ticket | SupportDetailPage |
| `/api/test-drafts/:key` | GET, PUT, DELETE | Autosave / load / discard Test Builder drafts | TestBuilderPage |
| `/api/generation/batches` | GET, POST | AI question-generation batches and their status | QuestionStudioPage |
| `/api/generation/batches/:id` | PATCH | Update batch status / approve / reject | QuestionStudioPage |

### Mock Service Layer Replacement Notes

The store effectively acts as an in-memory mock service layer. To go live, replace it layer by layer without touching page components:

1. **Reads** — swap each selector hook in `selectors.ts` for a React Query `useQuery` wrapper hitting the matching `GET` endpoint. Page components import from `selectors.ts`, so only that file changes.
2. **Writes** — swap each `dispatch({ type: 'UPDATE_*', ... })` call for a `useMutation` hook that calls the matching `PATCH` / `POST` endpoint and invalidates the relevant query cache. Keep the `audit()` call but move it server-side: the API writes the audit row as part of the mutation transaction.
3. **Auth/permissions** — replace `activeRole` / `getRolePermissions` with JWT-claim-driven permissions. `hasPermission()` and `GatedButton` stay unchanged.
4. **Drafts** — replace `saveTestDraft` / `getTestDraft` / `deleteTestDraft` with the `/api/test-drafts/:key` endpoints above.
5. **Persistence** — remove `persistence.ts`'s localStorage read/write; the server is now the source of truth. Keep `createAuditEntry` logic server-side.
6. **Validation** — keep `validation.ts` on the client for inline feedback; duplicate its rules server-side as the authoritative check.

Because pages depend on selector hooks and `GatedButton` rather than on `src/data/*` directly, this migration is localized to the store module and the mutation call sites.
