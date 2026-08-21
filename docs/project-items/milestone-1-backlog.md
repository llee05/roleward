# Milestone 1 GitHub Project backlog

Create each entry below as a separate GitHub Project item. Every item starts in
**Backlog**, moves to **Development** when implementation begins, and is closed
when its **Done when** statement is satisfied. Closed items do not need a third
project view.

The order below is the recommended delivery order. A task may move earlier when
its listed dependencies are complete. Focused tests belong in each implementation
task; the later test tasks cover cross-feature behavior and regressions.

## Quick-entry titles

```text
[M1] Bootstrap the local-first Roleward application
[M1] Create the versioned Dexie database and typed records
[M1] Implement local repositories, validation, and transactions
[M1] Build fresh and sample workspace onboarding
[M1] Handle browser-storage persistence and failure states
[M1] Export complete versioned workspace backups
[M1] Restore and reset the local workspace safely
[M1] Build manual job capture
[M1] Build job search, filters, and pagination
[M1] Implement the application status lifecycle
[M1] Build application management and removal
[M1] Add browser-local document management
[M1] Build the application statistics dashboard
[M1] Complete storage and domain integration coverage
[M1] Test the end-to-end journey, accessibility, and mobile layouts
[M1] Add continuous integration
[M1] Deploy to a stable production origin and document operations
```

## Copy-ready task details

### 1. `[M1] Bootstrap the local-first Roleward application`

**Task:** Scaffold the strict-TypeScript Next.js application, dependencies, app
shell, contracted placeholder routes, and baseline unit/browser test tooling. Keep
IndexedDB behind a client-only boundary.

**Done when:** A clean checkout installs, starts, lints, formats, type-checks,
tests, and builds without backend credentials; every contracted route renders.

**Depends on:** Product, route, and persistence contracts — complete.

Full card: [Bootstrap the local-first application](02-bootstrap-local-first-application.md).

### 2. `[M1] Create the versioned Dexie database and typed records`

**Task:** Define typed job, application, document, and workspace-setting records;
open Dexie database version 1 with the contracted stores and indexes; and generate
stable IDs with `crypto.randomUUID()`.

**Done when:** Fresh creation, close/reopen, table access, indexes, and the required
`workspace` settings record pass against `fake-indexeddb`.

**Depends on:** Task 1.

### 3. `[M1] Implement local repositories, validation, and transactions`

**Task:** Put all domain reads and writes behind feature repositories. Enforce
references, one application per job, allowed statuses, real `YYYY-MM-DD` dates,
status/date pairing, original `appliedAt` preservation, and transactional related
changes.

**Done when:** UI code does not write to raw Dexie tables, invalid runtime input is
rejected, and focused tests prove constraints and transaction rollback.

**Depends on:** Task 2.

### 4. `[M1] Build fresh and sample workspace onboarding`

**Task:** On `/`, offer **Start fresh**, **Load sample workspace**, and **Restore
backup**. Store workspace mode and initialization metadata, create deterministic
fictional sample data idempotently, and route initialized visitors to
`/dashboard`.

**Done when:** First use is explicit, sample data never overwrites an existing
workspace, deep links handle uninitialized storage correctly, and both modes
survive refresh.

**Depends on:** Task 3.

### 5. `[M1] Handle browser-storage persistence and failure states`

**Task:** Request persistent storage after a user gesture and implement UI states
for denial, unavailable or blocked IndexedDB, quota failures, migration failures,
and upgrades blocked by another Roleward tab.

**Done when:** Each failure has an actionable, non-destructive state; retry works
where safe; and persistent-storage denial shows backup guidance without pretending
data was lost.

**Depends on:** Tasks 2 and 4.

### 6. `[M1] Export complete versioned workspace backups`

**Task:** Use `dexie-export-import` to download all four tables and document blobs
as `.roleward-backup.json`. Include the required Roleward backup marker and warn
that the downloaded data and documents are not encrypted.

**Done when:** An export contains database/add-on metadata, the Roleward format
version, every record, and byte-identical document blobs.

**Depends on:** Tasks 3 and 4.

### 7. `[M1] Restore and reset the local workspace safely`

**Task:** Restore from first-run and settings flows by staging and validating the
backup before a confirmed transactional replacement. Add confirmed workspace and
sample reset actions with an export reminder.

**Done when:** Restore uses `clearTablesBeforeImport` with transactions enabled;
invalid, cancelled, or failed operations preserve current data; workspace reset
returns to first use; and sample reset restores the deterministic sample.

**Depends on:** Tasks 4 and 6.

### 8. `[M1] Build manual job capture`

**Task:** Add a React Hook Form and Zod flow for title, company, role level,
location, optional source URL, and optional notes. Persist manual provenance and
show validation and write errors without losing form state.

**Done when:** A valid real job is stored and reopened, invalid input is rejected
at form and repository boundaries, and failed writes leave existing data intact.

**Depends on:** Tasks 3 and 4.

### 9. `[M1] Build job search, filters, and pagination`

**Task:** Build `/jobs` search by case-insensitive title/company substring, a role
level filter, clear-filters behavior, and pagination. Preserve `q`, `level`, and
`page` in the URL and implement all page states.

**Done when:** Search and role filtering work together, URLs survive refresh and
browser navigation, and empty, loading, populated, read-error, and retry states are
covered.

**Depends on:** Tasks 4 and 8.

### 10. `[M1] Implement the application status lifecycle`

**Task:** Let a visitor save a job, mark it applied with an `appliedAt` date, and
move between submitted statuses without changing the original date or returning
to `saved`.

**Done when:** The complete status transition contract is enforced, a job has at
most one application, saved records are excluded from counts, and focused tests
cover every status/date combination.

**Depends on:** Tasks 3 and 8.

### 11. `[M1] Build application management and removal`

**Task:** Build `/applications` with saved/submitted rows, an in-page editor for
status and notes, confirmed **Untrack** for saved records, and confirmed **Delete
application** for submitted records.

**Done when:** Changes persist reactively; removal keeps the job, deletes related
documents transactionally, updates metrics, and rolls back fully on failure.

**Depends on:** Task 10.

### 12. `[M1] Add browser-local document management`

**Task:** Upload PDF and DOCX CVs or cover letters up to 10 MiB, enforce the
contracted extension/MIME rules, store metadata and Blob together, download via a
revoked object URL, and support deletion.

**Done when:** Upload, reload, download, delete, and quota-error behavior work;
document bytes round-trip unchanged; and no orphaned documents remain after
application removal.

**Depends on:** Tasks 3 and 11.

### 13. `[M1] Build the application statistics dashboard`

**Task:** Derive reactive submitted totals, a submitted-only current-status
breakdown, and Monday-based weekly application data from original `appliedAt`
values, then render the chart with Recharts.

**Done when:** Saved records are excluded, breakdown segments sum to the total,
later statuses do not reduce counts, and zero/loading/error/populated states remain
correct after refresh.

**Depends on:** Task 10.

### 14. `[M1] Complete storage and domain integration coverage`

**Task:** Close cross-feature test gaps for typed CRUD, unique `jobId`, invalid
statuses/dates, Blob round-trips, seed idempotence, database reopen, transactional
cascades, backup replacement, reset rollback, and unsupported/corrupt imports.

**Done when:** The storage and domain contract has deterministic regression tests,
including proof that failed destructive operations leave every table unchanged.

**Depends on:** Tasks 2–13.

### 15. `[M1] Test the end-to-end journey, accessibility, and mobile layouts`

**Task:** Add the Playwright journey: start fresh -> add/filter job -> save -> mark
applied -> upload document -> verify dashboard -> reload and verify persistence.
Test separate fresh browser contexts, keyboard navigation, labels, focus, and
mobile layouts.

**Done when:** The complete journey passes, separate contexts receive independent
workspaces, and critical screens have no known keyboard, labelling, focus, or
mobile-layout defects.

**Depends on:** Tasks 7 and 9–13.

### 16. `[M1] Add continuous integration`

**Task:** Add GitHub Actions for dependency installation, formatting checks, lint,
type-checking, unit/component tests, the production build, and the appropriate
Playwright smoke coverage.

**Done when:** A clean branch runs the documented checks in CI, failures block
merging, and dependency caching does not bypass lockfile correctness.

**Depends on:** Task 1. This can move forward while feature work continues.

### 17. `[M1] Deploy to a stable production origin and document operations`

**Task:** Deploy the client-backed Next.js application to one stable Vercel origin,
run the production smoke journey, and document setup, storage scope, backup,
restore, reset, testing, deployment, and preview-origin limitations.

**Done when:** CI passes, the full journey works on the stable URL without backend
secrets, refresh retains data on that origin, backup downloads successfully, and
the README explains that other origins, profiles, browsers, and devices have
independent workspaces.

**Depends on:** Tasks 14–16.
