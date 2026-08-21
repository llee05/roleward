# Milestone 1 GitHub Project backlog

Create each entry below as a separate GitHub Project item. Every item starts in
**Backlog**, moves to **Development** when implementation begins, and is closed
when its **Done when** statement is satisfied. Closed items do not need a third
project view.

The order below is the recommended delivery order. A task may move earlier when
its listed dependencies are complete. Focused tests belong in each implementation
task; the later test tasks cover cross-feature behavior and regressions.

Paste each **Subtasks** checklist into its parent issue. Keep the parent in
**Development** until every required checkbox and its **Done when** condition are
complete.

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

**Subtasks:**

- [ ] Scaffold a Next.js App Router project with strict TypeScript and commit the
      selected package manager's lockfile.
- [ ] Configure Tailwind CSS and shadcn/ui, then install the contracted runtime
      dependencies.
- [ ] Configure ESLint and formatting with documented check scripts.
- [ ] Configure Vitest, React Testing Library, and `fake-indexeddb`, including one
      passing component smoke test.
- [ ] Configure Playwright with one passing application smoke test.
- [ ] Build a responsive, keyboard-accessible application shell with navigation
      and a visible current-page state.
- [ ] Add placeholders for every contracted route, including `/jobs/[id]`, using
      the existing route constants.
- [ ] Establish and verify a client-only IndexedDB boundary; document commands and
      prove the app builds without credentials or `.env`.

**Done when:** A clean checkout installs, starts, lints, formats, type-checks,
tests, and builds without backend credentials; every contracted route renders.

**Depends on:** Product, route, and persistence contracts — complete.

Full card: [Bootstrap the local-first application](02-bootstrap-local-first-application.md).

### 2. `[M1] Create the versioned Dexie database and typed records`

**Task:** Define typed job, application, document, and workspace-setting records;
open Dexie database version 1 with the contracted stores and indexes; and generate
stable IDs with `crypto.randomUUID()`.

**Subtasks:**

- [ ] Define TypeScript record types for jobs, applications, documents, and
      workspace settings.
- [ ] Create the typed `roleward` Dexie database class with all four contracted
      tables.
- [ ] Declare immutable version-1 stores and the exact contracted indexes,
      including unique `&jobId`.
- [ ] Add a shared ID factory backed by `crypto.randomUUID()`.
- [ ] Implement browser-only database creation plus explicit open, close, and
      reopen behavior.
- [ ] Verify a correctly shaped `workspace` settings record can be written, read,
      and retained after reopening.
- [ ] Add `fake-indexeddb` tests for fresh creation, table access, indexes,
      uniqueness, and close/reopen persistence.

**Done when:** Fresh creation, close/reopen, table access, indexes, and the required
`workspace` settings record pass against `fake-indexeddb`.

**Depends on:** Task 1.

### 3. `[M1] Implement local repositories, validation, and transactions`

**Task:** Put all domain reads and writes behind feature repositories. Enforce
references, one application per job, allowed statuses, real `YYYY-MM-DD` dates,
status/date pairing, original `appliedAt` preservation, and transactional related
changes.

**Subtasks:**

- [ ] Define Zod schemas for every record and validate all data entering repository
      write boundaries.
- [ ] Add strict validation for known statuses, valid `YYYY-MM-DD` calendar dates,
      and status/`appliedAt` pairing.
- [ ] Implement typed repositories for jobs, applications, documents, and
      workspace settings.
- [ ] Enforce existing job/application references and translate unique-`jobId`
      failures into a domain error.
- [ ] Implement status transitions that preserve the original `appliedAt` and
      prohibit submitted-to-saved transitions.
- [ ] Implement multi-table operations as Dexie transactions, including
      application-and-document removal.
- [ ] Expose repository/query APIs so feature UI does not import or mutate raw
      Dexie tables.
- [ ] Test invalid inputs, constraints, successful transactions, and complete
      rollback after an injected failure.

**Done when:** UI code does not write to raw Dexie tables, invalid runtime input is
rejected, and focused tests prove constraints and transaction rollback.

**Depends on:** Task 2.

### 4. `[M1] Build fresh and sample workspace onboarding`

**Task:** On `/`, offer **Start fresh**, **Load sample workspace**, and **Restore
backup**. Store workspace mode and initialization metadata, create deterministic
fictional sample data idempotently, and route initialized visitors to
`/dashboard`.

**Subtasks:**

- [ ] Build `/` with explicit **Start fresh**, **Load sample workspace**, and
      **Restore backup** entry points.
- [ ] Implement fresh-workspace initialization that writes the required
      personal-mode settings record.
- [ ] Create deterministic fictional job/application fixtures with a recorded
      sample-data version and no real personal files.
- [ ] Seed the sample workspace atomically and idempotently.
- [ ] Refuse fresh or sample initialization when an established workspace already
      exists.
- [ ] Add a workspace initialization guard that redirects uninitialized deep links
      to `/`.
- [ ] Redirect initialized root visits to `/dashboard` and verify both workspace
      modes survive refresh.

**Done when:** First use is explicit, sample data never overwrites an existing
workspace, deep links handle uninitialized storage correctly, and both modes
survive refresh.

**Depends on:** Task 3.

### 5. `[M1] Handle browser-storage persistence and failure states`

**Task:** Request persistent storage after a user gesture and implement UI states
for denial, unavailable or blocked IndexedDB, quota failures, migration failures,
and upgrades blocked by another Roleward tab.

**Subtasks:**

- [ ] Add browser capability checks for IndexedDB and the Storage API without
      clearing or replacing existing data.
- [ ] Request `navigator.storage.persist()` only after an explicit user gesture
      and record the returned status.
- [ ] Show non-blocking backup guidance when persistent storage is unsupported or
      denied.
- [ ] Detect unavailable or blocked IndexedDB and present an actionable
      retry/close-other-tabs state.
- [ ] Handle Dexie version-change and blocked-upgrade events so stale tabs close
      safely and visitors can retry.
- [ ] Surface migration failures as recoverable errors without reseeding or
      resetting the workspace.
- [ ] Map quota/write failures to actionable UI while retaining existing records
      and pending input.
- [ ] Test persistence denial, unavailable storage, blocked upgrades, migration
      errors, quota errors, and safe retries.

**Done when:** Each failure has an actionable, non-destructive state; retry works
where safe; and persistent-storage denial shows backup guidance without pretending
data was lost.

**Depends on:** Tasks 2 and 4.

### 6. `[M1] Export complete versioned workspace backups`

**Task:** Use `dexie-export-import` to download all four tables and document blobs
as `.roleward-backup.json`. Include the required Roleward backup marker and warn
that the downloaded data and documents are not encrypted.

**Subtasks:**

- [ ] Implement an export service using `dexie-export-import` across all four
      tables.
- [ ] Verify the required workspace marker and supported Roleward backup-format
      version before export.
- [ ] Include Dexie/add-on metadata, every record, and document `Blob` values in
      one export.
- [ ] Download the result with the contracted `.roleward-backup.json` extension
      and revoke its temporary object URL.
- [ ] Add the settings-page export control with progress, success, and recoverable
      error states.
- [ ] Warn before download that the backup contains unencrypted application data
      and documents.
- [ ] Test exported metadata, complete record counts, and byte-identical document
      blobs.

**Done when:** An export contains database/add-on metadata, the Roleward format
version, every record, and byte-identical document blobs.

**Depends on:** Tasks 3 and 4.

### 7. `[M1] Restore and reset the local workspace safely`

**Task:** Restore from first-run and settings flows by staging and validating the
backup before a confirmed transactional replacement. Add confirmed workspace and
sample reset actions with an export reminder.

**Subtasks:**

- [ ] Expose the same restore workflow from first-run onboarding and `/settings`.
- [ ] Check the backup filename/content, Dexie export header, and supported
      Roleward format version before changing current data.
- [ ] Import into a disposable staging database and validate every record, status,
      date, reference, and required `workspace` setting.
- [ ] Show validated job, application, document, and settings counts before
      requesting replacement confirmation.
- [ ] Replace the current workspace using `clearTablesBeforeImport` with Dexie
      transactions enabled.
- [ ] Delete the staging database after success or failure and verify invalid,
      cancelled, and failed restores leave current data unchanged.
- [ ] Implement confirmed **Reset workspace** as a four-table transaction that
      returns the app to first-use setup.
- [ ] Implement confirmed **Reset sample workspace** only in sample mode and verify
      it restores the current deterministic sample.

**Done when:** Restore uses `clearTablesBeforeImport` with transactions enabled;
invalid, cancelled, or failed operations preserve current data; workspace reset
returns to first use; and sample reset restores the deterministic sample.

**Depends on:** Tasks 4 and 6.

### 8. `[M1] Build manual job capture`

**Task:** Add a React Hook Form and Zod flow for title, company, role level,
location, optional source URL, and optional notes. Persist manual provenance and
show validation and write errors without losing form state.

**Subtasks:**

- [ ] Define the shared Zod job-input schema for title, company, role level,
      location, optional source URL, and optional notes.
- [ ] Add the React Hook Form manual-job flow to `/jobs` without introducing
      another route.
- [ ] Trim and validate inputs, show field-level accessible errors, and reject
      unknown role levels or invalid URLs.
- [ ] Map valid input to a job with a UUID, creation date, and `manual` provenance
      through the job repository.
- [ ] Disable duplicate submissions while saving and show repository or quota
      errors without clearing entered values.
- [ ] On success, reset or close the form and make the stored job immediately
      available to open from `/jobs`.
- [ ] Test persistence across database reopen, form/repository rejection, and
      failed-write data preservation.

**Done when:** A valid real job is stored and reopened, invalid input is rejected
at form and repository boundaries, and failed writes leave existing data intact.

**Depends on:** Tasks 3 and 4.

### 9. `[M1] Build job search, filters, and pagination`

**Task:** Build `/jobs` search by case-insensitive title/company substring, a role
level filter, clear-filters behavior, and pagination. Preserve `q`, `level`, and
`page` in the URL and implement all page states.

**Subtasks:**

- [ ] Implement case-insensitive substring matching across job title and company
      for the small local dataset.
- [ ] Parse and validate the `q`, `level`, and `page` URL parameters, falling back
      safely for invalid values.
- [ ] Add the search field, role-level filter, active-filter display, and **Clear
      filters** action to `/jobs`.
- [ ] Apply search and role filtering together before paginating results and handle
      an out-of-range page deterministically.
- [ ] Keep filter and page state in the URL so refresh, back, and forward navigation
      restore the same view.
- [ ] Render distinct database-loading, catalogue-empty, no-match, populated,
      read-error, and retry states.
- [ ] Test combined filters, case handling, clearing, pagination boundaries, URL
      restoration, and safe retry.

**Done when:** Search and role filtering work together, URLs survive refresh and
browser navigation, and empty, loading, populated, read-error, and retry states are
covered.

**Depends on:** Tasks 4 and 8.

### 10. `[M1] Implement the application status lifecycle`

**Task:** Let a visitor save a job, mark it applied with an `appliedAt` date, and
move between submitted statuses without changing the original date or returning
to `saved`.

**Subtasks:**

- [ ] Centralize and type the allowed `saved` and submitted-status transitions.
- [ ] Add **Save job** to create one `saved` application with `appliedAt: null`.
- [ ] Add **Mark applied** with a validated local `YYYY-MM-DD` date defaulted to
      the current local date.
- [ ] Allow submitted applications to move among `applied`, `interview`, `offer`,
      `rejected`, and `withdrawn`.
- [ ] Preserve the original `appliedAt` during later changes and reject
      submitted-to-`saved` transitions.
- [ ] Enforce one application per job, including competing or repeated save
      actions.
- [ ] Make job-detail actions reactively show **Save job**, **Mark applied**, or the
      existing tracked-application link.
- [ ] Test every status/date pairing and transition, duplicate prevention,
      saved-count exclusion, and date preservation.

**Done when:** The complete status transition contract is enforced, a job has at
most one application, saved records are excluded from counts, and focused tests
cover every status/date combination.

**Depends on:** Tasks 3 and 8.

### 11. `[M1] Build application management and removal`

**Task:** Build `/applications` with saved/submitted rows, an in-page editor for
status and notes, confirmed **Untrack** for saved records, and confirmed **Delete
application** for submitted records.

**Subtasks:**

- [ ] Query and render saved and submitted application rows reactively on
      `/applications`.
- [ ] Show company, role, current status, and application date with the contracted
      empty, loading, and read-error states.
- [ ] Open an in-page detail editor without adding a new route.
- [ ] Persist valid submitted-status and notes edits while preserving the original
      application date.
- [ ] Show confirmed **Untrack** only for saved records and confirmed **Delete
      application** only for submitted records.
- [ ] Delete the application and all related documents in one transaction while
      retaining its job.
- [ ] Preserve the complete prior state and show an actionable error if any removal
      step fails.
- [ ] Test reactive list/metric updates, cancellation, document cascades, retained
      jobs, and transaction rollback.

**Done when:** Changes persist reactively; removal keeps the job, deletes related
documents transactionally, updates metrics, and rolls back fully on failure.

**Depends on:** Task 10.

### 12. `[M1] Add browser-local document management`

**Task:** Upload PDF and DOCX CVs or cover letters up to 10 MiB, enforce the
contracted extension/MIME rules, store metadata and Blob together, download via a
revoked object URL, and support deletion.

**Subtasks:**

- [ ] Add upload controls that select an application and classify the file as a CV
      or cover letter.
- [ ] Validate the 10 MiB limit and case-insensitive PDF/DOCX extension and MIME
      combinations, including the permitted empty-MIME fallback.
- [ ] Store the file `Blob` and its UUID, application reference, kind, filename,
      media type, size, and upload date in one record.
- [ ] Render the `/documents` empty, loading, populated, invalid-file, quota-error,
      database-error, and retry states.
- [ ] List documents reactively and verify their metadata survives reload and
      database reopen.
- [ ] Download exact stored bytes through a temporary object URL and revoke it
      after use.
- [ ] Add confirmed document deletion without affecting its application or job.
- [ ] Test byte-identical round trips, rejection without partial writes,
      quota-error preservation, and absence of orphans after application removal.

**Done when:** Upload, reload, download, delete, and quota-error behavior work;
document bytes round-trip unchanged; and no orphaned documents remain after
application removal.

**Depends on:** Tasks 3 and 11.

### 13. `[M1] Build the application statistics dashboard`

**Task:** Derive reactive submitted totals, a submitted-only current-status
breakdown from original `appliedAt` values, then render them as summary cards or a
plain list without a chart.

**Subtasks:**

- [ ] Implement pure metric functions for submitted total, submitted-only status
      breakdown.
- [ ] Define submitted records solely by non-null `appliedAt` and exclude `saved`
      from every metric.
- [ ] Subscribe the dashboard to local application changes so totals and counts
      update without a refresh.
- [ ] Render the submitted total as a clear summary.
- [ ] Render submitted-only status counts as accessible cards or a plain list.
- [ ] Implement zero-submission, database-loading, read-error/retry, and populated
      dashboard states.
- [ ] Test totals, breakdown sums, later status changes, deletion updates, and
      persistence across refresh.

**Done when:** Saved records are excluded, breakdown segments sum to the total,
later statuses do not reduce counts, and zero/loading/error/populated states remain
correct after refresh.

**Depends on:** Task 10.

### 14. `[M1] Complete storage and domain integration coverage`

**Task:** Close cross-feature test gaps for typed CRUD, unique `jobId`, invalid
statuses/dates, Blob round-trips, seed idempotence, database reopen, transactional
cascades, backup replacement, reset rollback, and unsupported/corrupt imports.

**Subtasks:**

- [ ] Add a deterministic `fake-indexeddb` harness that clears state between tests
      and can snapshot all four tables.
- [ ] Cover typed CRUD, indexed queries, database close/reopen, and the unique
      application `jobId` constraint.
- [ ] Cover invalid statuses/dates, status/date pairing, and preservation of the
      original `appliedAt`.
- [ ] Verify document `Blob` metadata and bytes round-trip unchanged.
- [ ] Verify application removal transactionally deletes related documents while
      preserving the job.
- [ ] Prove deterministic sample seeding is idempotent and never overwrites an
      existing workspace.
- [ ] Test successful backup replacement plus rejection of unsupported and corrupt
      imports without changing current data.
- [ ] Inject failures into backup replacement and reset, then prove every table
      rolls back to its original contents.

**Done when:** The storage and domain contract has deterministic regression tests,
including proof that failed destructive operations leave every table unchanged.

**Depends on:** Tasks 2–13.

### 15. `[M1] Test the end-to-end journey, accessibility, and mobile layouts`

**Task:** Add the Playwright journey: start fresh -> add/filter job -> save -> mark
applied -> upload document -> verify dashboard -> reload and verify persistence.
Test separate fresh browser contexts, keyboard navigation, labels, focus, and
mobile layouts.

**Subtasks:**

- [ ] Configure Playwright fixtures so each test begins with a clean, isolated
      browser workspace.
- [ ] Automate starting fresh, adding a job, searching/filtering it, and saving it.
- [ ] Extend the journey to mark the job applied, upload a document, and verify
      dashboard totals and status data.
- [ ] Reload during the journey and verify job, application, document, and
      dashboard data persists.
- [ ] Open separate fresh browser contexts and prove their workspaces do not share
      data.
- [ ] Test keyboard-only navigation and visible, logical focus behavior across
      critical flows.
- [ ] Verify controls, fields, validation messages, dialogs, and page landmarks
      have accessible labels and focus handling.
- [ ] Run critical screens at supported mobile viewports and fix clipping,
      overflow, navigation, or interaction defects.

**Done when:** The complete journey passes, separate contexts receive independent
workspaces, and critical screens have no known keyboard, labelling, focus, or
mobile-layout defects.

**Depends on:** Tasks 7 and 9–13.

### 16. `[M1] Add continuous integration`

**Task:** Add GitHub Actions for dependency installation, formatting checks, lint,
type-checking, unit/component tests, the production build, and the appropriate
Playwright smoke coverage.

**Subtasks:**

- [ ] Add a GitHub Actions workflow for pull requests and pushes to the main
      branch.
- [ ] Configure the repository's pinned runtime and package manager versions in CI.
- [ ] Install dependencies from the lockfile and key dependency caching to that
      lockfile.
- [ ] Run formatting checks, linting, and TypeScript checks as required CI steps.
- [ ] Run unit and component tests in an isolated CI environment.
- [ ] Build the production application without backend credentials.
- [ ] Install the required Playwright browser and run the agreed smoke coverage.
- [ ] Configure the CI checks as required merge checks and document their
      equivalent local commands.

**Done when:** A clean branch runs the documented checks in CI, failures block
merging, and dependency caching does not bypass lockfile correctness.

**Depends on:** Task 1. This can move forward while feature work continues.

### 17. `[M1] Deploy to a stable production origin and document operations`

**Task:** Deploy the client-backed Next.js application to one stable Vercel origin,
run the production smoke journey, and document setup, storage scope, backup,
restore, reset, testing, deployment, and preview-origin limitations.

**Subtasks:**

- [ ] Connect the repository to Vercel and configure one stable production URL
      without backend secrets.
- [ ] Deploy a commit that has passed every required CI check.
- [ ] Run the core production journey from workspace setup through dashboard
      verification.
- [ ] Reload the production application and verify its IndexedDB workspace persists
      on the stable origin.
- [ ] Download a production backup and verify it contains the expected workspace
      records and document.
- [ ] Document local installation, development, testing, build, and deployment
      commands.
- [ ] Document browser/origin storage scope and why previews, profiles, browsers,
      and devices have independent workspaces.
- [ ] Document backup, restore, reset, and recovery procedures, including the
      unencrypted-backup warning.

**Done when:** CI passes, the full journey works on the stable URL without backend
secrets, refresh retains data on that origin, backup downloads successfully, and
the README explains that other origins, profiles, browsers, and devices have
independent workspaces.

**Depends on:** Tasks 14–16.
