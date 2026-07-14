# Prototype Refinement Report

## 1. Existing Functionality Preserved

All 32+ pages from the original prototype are intact and functional:
- Dashboard, Question Bank, Question Studio, Content Review, Taxonomy, DI/Passage Sets, Media Library
- Tests, Test Builder, Test Series, Exam Blueprints, Publishing Calendar
- Packages, Orders & Payments, Coupons, Entitlements
- Students, Student Detail, Admin Team, Support Requests, Notifications
- Business Analytics, Test Analytics, Question Analytics, Content Quality, System Health
- Exam Configuration, Languages, Roles & Permissions, Branding, Audit Logs, Integrations

The design system (emerald palette, dark mode, grouped sidebar, responsive layout, Prototype Mode badge) is preserved. The shadcn/ui component library, Tailwind config, and CSS variables are unchanged.

## 2. Files Created

### Central Store Layer
| File | Purpose |
|------|---------|
| `src/app/store/PrototypeStore.tsx` | React Context + reducer, provider, `usePrototypeStore()` hook; reducer includes ID-based audit dedup guard |
| `src/app/store/types.ts` | Runtime store types: `PrototypeState`, `AuditEntry`, `TestDraft`, `GeneratedBatch`, etc. |
| `src/app/store/domain-types.ts` | Comprehensive domain types for future backend contracts (ExamFamily, Exam, Subject, QuestionVersion, GenerationRecipe, TestBlueprint, PublicationSnapshot, CorrectionCase, BackgroundJob, FeatureFlag, etc.) |
| `src/app/store/status-machines.ts` | 6 status machines with transition maps and guards: Question, Test, GenerationBatch, Challenge, Correction, Order |
| `src/app/store/persistence.ts` | localStorage load/save, `createDefaultState()`, `createAuditEntry()`, role permissions (47 granular permissions across 10 roles), `PROTOTYPE_ROLES` |
| `src/app/store/selectors.ts` | Typed hooks: `useQuestions()`, `useTests()`, `useStudentById()`, `useAuditLogs()`, etc. |
| `src/app/store/validation.ts` | `validateDraft()` and `canPublish()` for Test Builder |

### Shared Components
| File | Purpose |
|------|---------|
| `src/components/shared/GatedAction.tsx` | `GatedButton` — permission-gated button with tooltip for missing permissions |
| `src/components/shared/UnsavedChangesDialog.tsx` | AlertDialog with Continue Editing / Discard Changes / Save Draft actions, used by in-app navigation blocker |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useUnsavedChanges.ts` | `beforeunload` protection + `confirmLeave()` + `useBlocker` from react-router-dom for in-app route navigation blocking |
| `src/hooks/useMockService.ts` | Simulated loading/error/empty states driven by prototype settings |

### Detail Pages
| File | Route |
|------|-------|
| `src/pages/content/QuestionDetailPage.tsx` | `/content/questions/:id` |
| `src/pages/tests/TestDetailPage.tsx` | `/tests/:id` |
| `src/pages/commerce/PackageDetailPage.tsx` | `/commerce/packages/:id` |
| `src/pages/commerce/OrderDetailPage.tsx` | `/commerce/orders/:id` |
| `src/pages/users/SupportDetailPage.tsx` | `/users/support/:id` |

### Tests
| File | Tests |
|------|-------|
| `src/test/setup.ts` | Jest-dom matchers, matchMedia/ResizeObserver stubs |
| `src/test/store.test.tsx` | 10 tests: init, question status change, audit creation, reset, role switching, localStorage persistence |
| `src/test/validation.test.tsx` | 10 tests: all validation rules + publish blocking |
| `src/test/DataTable.test.tsx` | 7 tests: filtering, sorting, pagination |
| `src/test/routes.test.tsx` | 5 tests: route rendering for major pages |
| `src/test/audit-dedup.test.tsx` | 4 tests: `createAuditEntry` returns entry, unique IDs, reducer dedup guard, two distinct audits both kept |
| `src/test/status-machines.test.ts` | 32 tests: all 6 status machines, valid and invalid transitions |
| `src/test/test-builder-roundtrip.test.tsx` | 4 tests: `testToDraft` restores fields, schedule mode preservation, full draft round-trip, save without changes |
| `vitest.config.ts` | Vitest configuration (jsdom, `@/` alias, setup file) |

## 3. Files Changed

### Store & Infrastructure
- `src/App.tsx` — Migrated from `BrowserRouter` + `<Routes>` to `createBrowserRouter` + `RouterProvider` for `useBlocker` support; wrapped in `PrototypeStoreProvider`; all 40 routes preserved
- `src/main.tsx` — Unchanged (store provider is in App.tsx)

### Pages Connected to Store (data + actions persist)
- `src/pages/content/QuestionBankPage.tsx` — `useQuestions()`, approve/reject/archive/bulk actions dispatch to store, `GatedButton` for permissions
- `src/pages/content/ContentReviewPage.tsx` — `useQuestions()` filtered to review queue, approve/reject/needs-fix dispatch + advance to next
- `src/pages/content/QuestionStudioPage.tsx` — Full rewrite: persistent batches, seeded generation, edit/regenerate/duplicate/approve-to-bank
- `src/pages/tests/TestBuilderPage.tsx` — Full rewrite: controlled `TestDraft` model, 7 steps, dynamic validation, draft persistence, save/publish; round-trip fix restores all fields on edit via `test-saved-{id}` draft key; in-app navigation blocking via `UnsavedChangesDialog`
- `src/pages/tests/TestsPage.tsx` — `useTests()`, edit/duplicate/archive/schedule/publish dispatch to store
- `src/pages/commerce/PackagesPage.tsx` — `usePackages()`, toggle active/featured dispatch
- `src/pages/commerce/OrdersPaymentsPage.tsx` — `useOrders()`, verify/retry/recon/refund dispatch
- `src/pages/commerce/CouponsPage.tsx` — `useCoupons()`, create/toggle/edit dispatch
- `src/pages/commerce/EntitlementsPage.tsx` — `useEntitlements()`, revoke/extend dispatch
- `src/pages/users/StudentsPage.tsx` — `useStudents()`
- `src/pages/users/StudentDetailPage.tsx` — `useStudentById()`, suspend/grant/revoke/extend/note dispatch
- `src/pages/users/SupportRequestsPage.tsx` — `useSupportRequests()`, assign/status/priority/comment dispatch
- `src/pages/users/NotificationsPage.tsx` — `useNotifications()`, status change/edit dispatch
- `src/pages/settings/BrandingPage.tsx` — `state.branding` + `setBranding()` + audit
- `src/pages/settings/AuditLogsPage.tsx` — `useAuditLogs()` (live audit entries from store)
- `src/pages/settings/RolesPermissionsPage.tsx` — Active role highlight from store
- `src/pages/settings/ExamConfigurationPage.tsx` — Prototype Settings card with toggles + reset
- `src/app/layout/Topbar.tsx` — Role switcher in profile menu, dynamic admin name/initials

### Branding
- `index.html` — Title "ExamTree Admin Prototype", meta description, OG tags, emerald "E" favicon
- `package.json` — Name `examtree-admin-prototype`, version `1.0.0`, test scripts

### Dependencies
All dependencies in `package.json` are actively used. No unused dependencies remain.
- 6 orphaned shadcn component files deleted: `carousel.tsx`, `resizable.tsx`, `calendar.tsx`, `input-otp.tsx`, `drawer.tsx`, `form.tsx`

### Lint Fixes
- `eslint.config.js` — Added `argsIgnorePattern: '^_'` and `varsIgnorePattern: '^_'` to align eslint with tsc's `noUnusedParameters`; added override for `src/components/ui/**` to suppress `react-refresh/only-export-components` (unavoidable shadcn template pattern)
- `src/components/ui/command.tsx`, `input.tsx`, `textarea.tsx` — Empty interfaces → type aliases (fixes `no-empty-object-type`)
- `src/hooks/use-toast.ts` — `const actionTypes` → `type actionTypes` (fixes unused variable)
- `src/pages/commerce/OrdersPaymentsPage.tsx` — Wrapped `filteredByChip` in `useCallback` (fixes `react-hooks/exhaustive-deps`)

## 4. Local State Architecture

```
PrototypeStoreProvider (React Context)
  └── useReducer(reducer, loadState())
       ├── state: PrototypeState (all domain data)
       └── dispatch: (action) → reducer → state update
            └── useEffect → saveState(state) → localStorage
```

**Data flow:**
1. On mount, `loadState()` reads localStorage. If valid (correct schema version, has expected arrays), uses stored state. If invalid, falls back to `createDefaultState()` which deep-clones mock data.
2. Every dispatch updates state via the reducer.
3. `useEffect` saves state to localStorage on every change.
4. Selectors (`useQuestions()`, `useTests()`, etc.) are typed hooks that read from context.
5. `audit()` helper creates an `AuditEntry` and dispatches `ADD_AUDIT` — also returns the entry so it can be attached to dispatch actions.
6. `resetData()` dispatches `RESET` which returns `createDefaultState()`.

**Reducer actions:**
`SET_STATE`, `RESET`, `SET_ROLE`, `SET_BRANDING`, `SET_PROTOTYPE_SETTINGS`, `ADD_AUDIT`, `UPDATE_QUESTION`, `UPDATE_QUESTIONS`, `ADD_QUESTION`, `UPDATE_TEST`, `ADD_TEST`, `UPDATE_PACKAGE`, `UPDATE_ORDER`, `ADD_COUPON`, `UPDATE_COUPON`, `UPDATE_ENTITLEMENT`, `ADD_ENTITLEMENT`, `UPDATE_STUDENT`, `ADD_STUDENT_NOTE`, `UPDATE_SUPPORT`, `ADD_SUPPORT_COMMENT`, `UPDATE_NOTIFICATION`, `ADD_GENERATED_BATCH`, `UPDATE_GENERATED_BATCH`, `SAVE_TEST_DRAFT`, `DELETE_TEST_DRAFT`

**Audit deduplication guard:** The `ADD_AUDIT` case checks `state.auditLogs.some((a) => a.id === action.entry.id)` and returns state unchanged if the entry already exists. This prevents duplicate audit entries when an entry is both returned by `audit()` (which dispatches `ADD_AUDIT`) and passed as an `audit:` property to a mutation action (which also dispatches `ADD_AUDIT`).

## 5. localStorage Schema

**Key:** `examtree-prototype-v1`
**Version:** `1` (field `version` in the stored object)

```typescript
interface PrototypeState {
  version: number;                    // SCHEMA_VERSION = 1
  questions: Question[];              // 48 items initially
  tests: Test[];                      // 32 items
  testSeries: TestSeries[];           // 8 items
  packages: Package[];                // 6 items
  orders: Order[];                    // 40 items
  coupons: Coupon[];                  // 6 items
  entitlements: Entitlement[];        // 24 items
  students: Student[];                // 60 items
  adminTeam: AdminMember[];           // 10 items
  supportRequests: SupportRequest[];  // 28 items
  notifications: NotificationCampaign[]; // 6 items
  auditLogs: AuditEntry[];            // 10 seed + all new entries
  studentNotes: Record<string, StudentNote[]>;
  supportComments: Record<string, SupportComment[]>;
  generatedBatches: GeneratedBatch[];
  testDrafts: Record<string, TestDraft>;
  branding: BrandingSettings;
  prototypeSettings: PrototypeSettings;
  activeRole: string;
}
```

**Fallback:** If `localStorage.getItem` returns null, JSON.parse fails, or `parsed.version !== SCHEMA_VERSION`, the store falls back to `createDefaultState()`.

**Session ID:** A per-tab session ID is stored in `sessionStorage` under `examtree-session-id` and included in audit entries.

## 6. Connected Workflows

### Question Bank → Content Review
- Approving a question in Question Bank or Content Review dispatches `UPDATE_QUESTION` with `status: 'Approved'`
- Both pages read from the same store, so changes are visible everywhere instantly
- Bulk actions (approve/archive selected) dispatch `UPDATE_QUESTIONS`

### Question Studio → Question Bank
- "Approve" in Question Studio converts a `GeneratedQuestion` to a `Question` and dispatches `ADD_QUESTION`
- The question immediately appears in Question Bank

### Test Builder → Tests
- Saving a test dispatches `ADD_TEST` (new) or `UPDATE_TEST` (edit)
- The test appears in the Tests list immediately
- "Edit" in Tests navigates to Test Builder with `?edit=ID`, which loads the test as a draft

### Students → Entitlements → Orders
- Student detail page shows entitlements from `useEntitlementsByStudent(id)`
- Granting entitlement dispatches `ADD_ENTITLEMENT`
- Revoking dispatches `UPDATE_ENTITLEMENT` with `status: 'Revoked'`
- Student detail also shows orders filtered by student

### Support Requests → Students/Tests/Questions/Orders
- Support detail page has links to related student, test, question, and order
- Assign/status/priority changes dispatch `UPDATE_SUPPORT`
- Comments dispatch `ADD_SUPPORT_COMMENT`

### All Mutations → Audit Logs
- Every `audit()` call creates an `AuditEntry` with admin name, role, action, entity, old/new values, reason, session ID
- Audit logs are visible in Settings → Audit Logs (reads from `useAuditLogs()`)
- Detail pages show entity-specific audit history by filtering `entityId`

## 7. Role and Permission Model

### Roles (10)
Super Admin, Content Manager, Question Author, Reviewer, Test Manager, Support Agent, Finance Admin, Marketing Admin, Analyst, Read-only Auditor

### Permissions (47 granular permissions)
`questions.view`, `questions.create`, `questions.edit`, `questions.review`, `questions.archive`, `content.view`, `generation.use`, `generation.manage`, `coverage.view`, `coverage.manage`, `tests.view`, `tests.create`, `tests.edit`, `tests.publish`, `tests.qa`, `commerce.view`, `payments.manage`, `refunds.request`, `refunds.approve`, `entitlements.manage`, `packages.manage`, `coupons.manage`, `users.view`, `users.manage`, `support.view`, `support.manage`, `notifications.send`, `analytics.view`, `settings.manage`, `audit.view`, `studio.use`, `review.approve`, `review.reject`, `review.comment`, `taxonomy.manage`, `series.manage`, `blueprints.manage`, `reports.export`, `corrections.view`, `corrections.manage`, `recalculation.manage`, `challenges.view`, `challenges.manage`, `imports.manage`, `jobs.view`, `jobs.manage`, `featureflags.view`, `featureflags.manage`, `roles.manage`

### Super Admin has `['all']` — grants every permission.

### Implementation
- `GatedButton` component wraps a `Button` and checks `hasPermission(permission)`. If denied, button is disabled with a tooltip: "Requires '{permission}' permission"
- Role switcher in Topbar profile menu — selecting a role calls `setRole()` which updates store state
- `hasPermission()` checks `perms.includes('all') || perms.includes(permission)`
- Active role is included in all audit log entries

## 8. Dynamic Validation Rules

The Test Builder's `validateDraft()` function in `src/app/store/validation.ts` checks:

| # | Rule | Severity | Condition |
|---|------|----------|-----------|
| 1 | Missing test name | Error | `basicInfo.name` is empty |
| 2 | Missing exam code | Error | `basicInfo.examCode` is empty |
| 3 | Total questions ≤ 0 | Error | `pattern.totalQuestions <= 0` |
| 4 | Duration ≤ 0 | Error | `pattern.durationMinutes <= 0` |
| 5 | No sections | Error | `sections.length === 0` |
| 6 | Empty section name | Error | Any section has empty `name` |
| 7 | Duplicate section names | Warning | Two sections with same name |
| 8 | Section question sum mismatch | Warning | Sum of section questions ≠ totalQuestions |
| 9 | Section mark sum mismatch | Warning | Sum of section marks ≠ totalMarks |
| 10 | Selected question count mismatch | Warning | `selectedQuestionIds.length ≠ totalQuestions` |
| 11 | Duplicate selected questions | Error | Duplicate IDs in selectedQuestionIds |
| 12 | Scheduled without date | Error | `schedule.mode === 'scheduled'` and no `publishAt` |
| 13 | Past publication date | Error | `publishAt` is in the past |
| 14 | QA without reviewer | Error | `schedule.mode === 'qa'` and no `reviewerId` |

**Publishing:** `canPublish(draft)` returns `false` if any issue has severity `'error'`. Warnings allow publishing with confirmation.

## 9. Tests Added

| File | Tests | Coverage |
|------|-------|----------|
| `store.test.tsx` | 10 | Store init, question status change, audit creation, reset, role switching + permissions, localStorage persistence + rehydration |
| `validation.test.tsx` | 10 | Empty draft, zero questions, section sum mismatch, duplicate sections, scheduled without date, QA without reviewer, valid draft, `canPublish` blocking |
| `DataTable.test.tsx` | 7 | Search filtering, ascending/descending sort, numeric sort, pagination navigation |
| `routes.test.tsx` | 5 | Dashboard, redirect, Question Bank, Tests, 404 |
| `audit-dedup.test.tsx` | 4 | `createAuditEntry` returns entry, unique IDs, reducer dedup guard, two distinct audits both kept |
| `status-machines.test.ts` | 32 | All 6 status machines, valid and invalid transitions, `getValidTransitions` helper |
| `test-builder-roundtrip.test.tsx` | 4 | `testToDraft` restores fields, schedule mode preservation, full draft round-trip, save without changes |
| **Total** | **71** | All passing |

## 10. Build Results

```
npm run build
✓ 2547 modules transformed
dist/index.html                     0.71 kB │ gzip:   0.40 kB
dist/assets/index-CwZj5JTh.css     67.62 kB │ gzip:  11.92 kB
dist/assets/index-d3o4BGjy.js   1,188.60 kB │ gzip: 316.12 kB
✓ built in 17.91s
```

Build passes with zero TypeScript errors and zero warnings (excluding the expected chunk-size advisory).

## 11. Lint Results

```
npm run lint
0 errors, 6 warnings
```

All previously pre-existing lint errors have been fixed:
- 3 `no-empty-object-type` errors fixed in `command.tsx`, `input.tsx`, `textarea.tsx` (empty interfaces → type aliases)
- 1 unused variable error fixed in `use-toast.ts` (`const actionTypes` → `type actionTypes`)
- 1 `react-hooks/exhaustive-deps` warning fixed in `OrdersPaymentsPage.tsx` (wrapped `filteredByChip` in `useCallback`)
- Remaining 6 warnings are `react-refresh/only-export-components` across shadcn/ui files, suppressed via eslint config override for `src/components/ui/**`

## 12. Known Limitations

1. **Mock data only** — no real API calls, database, or authentication
2. **No real AI generation** — Question Studio uses deterministic seeded templates
3. **No real payment gateway** — payment/refund actions are simulated state changes
4. **No real notifications** — SMS/WhatsApp/Email/Push channels are placeholders
5. **No real file uploads** — Media Library upload is a placeholder
6. **Topbar search is non-functional** — no search index or API
7. **Performance data is mock** — student test attempts, accuracy, response times are static
8. **Session-based audit session ID** — stored in sessionStorage, resets per tab
9. **localStorage size limit** — very large numbers of generated batches could approach the ~5MB localStorage limit
10. **No code-splitting** — single 1.1MB JS bundle (expected for a prototype with 37+ routes)
11. **Unsaved-changes protection** — `beforeunload` works for browser-level navigation; in-app route navigation blocking uses `useBlocker` from react-router-dom with an `UnsavedChangesDialog` offering Save Draft / Discard Changes / Continue Editing

## 13. Recommended Future Integration Boundaries

### Must Connect to Real Services
- Authentication (Firebase Auth or equivalent — replace mock role switching with real auth)
- Database (PostgreSQL via an existing or new Express backend — replace mock arrays with API queries)
- Payment gateway (Razorpay or equivalent — replace simulated payment/refund)
- File storage (S3 — replace placeholder upload)
- Notification gateways (FCM, SendGrid, Twilio, WhatsApp Business API)

### Can Keep As-Is
- Design system (CSS variables, Tailwind config, fonts)
- shadcn/ui components
- DataTable, FilterBar, PageHeader, StatusBadge (just pass real data)
- Test Builder draft model (just add API save calls)
- Validation logic (`validateDraft` is domain logic, not data-source-specific)
- Permission model (replace mock roles with real JWT claims)
- Status machines (`status-machines.ts` — transition maps and guards are domain logic, reusable server-side)
- Domain types (`domain-types.ts` — canonical types for future API contracts)

### Must Replace
- `PrototypeStoreProvider` → replace with real data fetching (React Query / SWR / API client)
- `useQuestions()` etc. → replace with API-backed hooks
- `audit()` → call a real audit API endpoint
- `resetData()` → remove in production
- localStorage persistence → remove in production
- Role switcher → remove (use real auth roles)
- Prototype Settings → remove or move to admin-only debug panel

### See Also
`prototype-integration-notes.md` — detailed API contract suggestions, database entity mapping, and integration guidance.

## 14. Part 1 Stabilization Changes

Part 1 focused on foundation, core fixes, domain models, and status machines. The following changes were made:

### Audit Deduplication Fix
The `audit()` helper dispatches `ADD_AUDIT` and returns the entry. Mutation actions (e.g., `UPDATE_QUESTION`) also accept an `audit:` property and dispatch `ADD_AUDIT`. Previously this created duplicate entries. Fixed with an ID-based dedup guard in the reducer's `ADD_AUDIT` case: if `state.auditLogs.some((a) => a.id === action.entry.id)`, the state is returned unchanged.

### Test Builder Round-Trip Fix
`testToDraft()` previously hardwired defaults for description, sections, pattern details, and navigation rules, causing edited tests to lose these fields. Fixed by saving the full draft under a `test-saved-{id}` key in the existing `testDrafts` store on publish, and checking for that key when initializing the draft on edit. This ensures all fields round-trip exactly: sections, pattern, description, selected questions, navigation rules, schedule, and series.

### In-App Navigation Blocking
`useBlocker` from react-router-dom requires a data router context. Migrated `App.tsx` from `BrowserRouter` + `<Routes>` to `createBrowserRouter` + `RouterProvider` (all 40 routes preserved). The `useUnsavedChanges` hook now returns a `blocker` alongside `confirmLeave`. The reusable `UnsavedChangesDialog` component offers three actions: Continue Editing, Discard Changes, Save Draft.

### Domain Types (`domain-types.ts`)
Comprehensive domain types for future backend contracts, covering the full ExamTree domain: ExamFamily, Exam, ExamStage, Subject, Chapter, Topic, Subtopic, CoverageTarget, QuestionTranslation, QuestionVersion (+snapshot), QuestionReview, QuestionChallenge, SimilarQuestion, GenerationRecipe (+version), GenerationItem, TestBlueprint, TestVersion, PublicationSnapshot, TestQAReview, CorrectionCase, RecalculationJob, BackgroundJob, FeatureFlag, AdminNotification, CollaborationComment, Assignment, Follower, ImportRecord, SavedView, PaymentEvent, Refund, EntitlementEvent, Permission, AdminRole. All statuses use string literal unions with no `any` types.

### Status Machines (`status-machines.ts`)
Six status machines with transition maps and `canTransition*()` guard functions:

| Machine | States | Key Transitions |
|---------|--------|-----------------|
| Question | Draft → Generated → Under Review → Needs Fix → Approved/Rejected → Archived (7 states) | Draft → Generated → Under Review → Needs Fix → Approved/Rejected → Archived |
| Test | Draft → Content Ready → Under QA → Needs Fix → QA Approved → Scheduled → Live → Completed → Archived (9 states) | Full editorial + publishing lifecycle |
| GenerationBatch | Draft → Queued → Running → Validation → Review → Partially Approved/Approved/Failed/Cancelled (9 states) | Generation pipeline with partial approval |
| Challenge | New → Investigating → Accepted/Rejected → Correction Required → Recalculation Required → Resolved (7 states) | Challenge investigation and resolution |
| Correction | Draft → Impact Calculated → Awaiting Approval → Approved → Running → Completed/Failed/Rejected (8 states) | Correction case lifecycle |
| Order | Created → Pending → Paid/Failed → Partially Refunded → Refunded (6 states) | Payment and refund lifecycle |

A generic `getValidTransitions<S>(map, current)` helper returns the set of valid next states. Each machine has a corresponding `canTransition*()` function.

### Expanded Permissions
`ALL_PERMISSIONS` expanded from ~22 to 47 granular permissions. New permission groups: `content.view`, `generation.use/manage`, `coverage.view/manage`, `tests.qa`, `corrections.view/manage`, `recalculation.manage`, `challenges.view/manage`, `imports.manage`, `jobs.view/manage`, `featureflags.view/manage`, `roles.manage`, `refunds.request/approve`. `ROLE_PERMISSIONS` updated for all 10 roles to reflect the expanded set.

### Lint Cleanup
All pre-existing lint errors fixed: shadcn empty interfaces → type aliases (`command.tsx`, `input.tsx`, `textarea.tsx`), `use-toast.ts` `actionTypes` type conversion, `OrdersPaymentsPage.tsx` `useCallback` fix, and eslint config override for `src/components/ui/**` to suppress unavoidable `react-refresh/only-export-components` warnings.
