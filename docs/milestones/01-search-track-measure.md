# Milestone 1: Search, track, and measure

## Outcome

A first-time visitor can choose a fresh or sample browser-local workspace, find or
manually add a job, record an application, attach a CV or cover letter, update the
application's status, see accurate progress statistics, reload without losing
their data, and export a complete backup from a deployed version of Roleward.

This is the first complete product journey:

`start locally -> find a job -> track it -> apply -> attach documents -> see progress -> back it up`

## Important assumptions

In this milestone, search runs against jobs stored in the current Roleward
workspace. A visitor may explicitly load deterministic fictional sample jobs or
add a job manually. Searching live job boards is a separate milestone because it
requires choosing a licensed data source and handling imports, duplicates, expired
listings, and provider limits.

Roleward is intentionally local-first for Milestone 1. Dexie stores domain records
and document blobs in IndexedDB for one browser profile, device, and exact origin.
There are no accounts, backend database, cloud backup, or cross-device sync.
Sharing the deployed URL gives each visitor an independent workspace; it does not
share the owner's data. Clearing site data, losing the device or profile, or using
a different origin can make data unavailable, so export/import is part of the
milestone rather than an optional extra. Real data should use one stable production
origin because preview deployments have separate storage.

Automatic email reply tracking is also deferred. It requires provider-specific
OAuth, secure token storage, background syncing, and message-to-application
matching. Applications can still be updated manually in Milestone 1.

## In scope

- Next.js App Router application using strict TypeScript
- Tailwind CSS and shadcn/ui
- IndexedDB persistence through Dexie and reactive queries through
  `dexie-react-hooks`
- Fresh and deterministic sample workspace setup without accounts
- Versioned full-workspace backup and restore through `dexie-export-import`
- Seeded jobs and manual job entry
- Search by job title or company
- Role-level filters: internship, graduate, junior, and other
- Application statuses: saved, applied, interview, offer, rejected, and withdrawn
- Browser-local PDF or DOCX CV and cover-letter storage
- Total application count and current-status breakdown without a chart
- Zod and React Hook Form validation
- Vitest, React Testing Library, Playwright, and `fake-indexeddb` coverage
- GitHub Actions and a Vercel deployment on a stable production origin

## Out of scope

- Accounts, authentication, shared workspaces, and multi-user collaboration
- Cloud database, cloud file storage, automatic backup, and cross-device sync
- Dexie Cloud or a speculative backend adapter
- Application-level encryption
- Offline application-shell caching or PWA installation
- Live job-board aggregation or scraping
- Applying to jobs from inside Roleward
- Gmail or Outlook connection and automatic reply detection
- AI job matching, CV parsing, or generated cover letters
- Notifications, reminders, and advanced analytics

## Definition of “application count”

A saved job is not counted as an application. The total is the number of records
with a non-null `appliedAt` date. Changing a submitted application to interview,
offer, rejected, or withdrawn must not reduce that total. Statistics are derived
from current application records; there is no separate counter to keep in sync.

## Delivery steps

Each step should be small enough to complete as a separate pull request.

### 1. Confirm the product contract

Status: complete. See the [Milestone 1 product contract](../product-contract.md).

- Write the final role levels and application statuses as TypeScript constants.
- Define the routes: `/`, `/jobs`, `/jobs/[id]`, `/applications`,
  `/documents`, `/dashboard`, and `/settings`.
- Sketch the empty, loading, error, and populated state for each main page.
- Record the application-count and browser-local persistence rules in code and
  product documentation.

**Done when:** the main journey, storage boundary, and meaning of every status are
unambiguous.

### 2. Bootstrap the application

- Create the Next.js App Router project with strict TypeScript.
- Add Tailwind CSS and shadcn/ui.
- Add Zod, React Hook Form, `dexie`, `dexie-react-hooks`, and
  `dexie-export-import`.
- Configure ESLint, Vitest, React Testing Library, `fake-indexeddb`, and
  Playwright.
- Create a responsive application shell and a client boundary for IndexedDB-backed
  content. Server rendering may provide the shell or loading state but does not
  read IndexedDB.

**Done when:** a clean checkout can install, lint, type-check, test, and start
locally without backend credentials.

### 3. Create the Dexie foundation

- Define typed job, application, document, and workspace-setting records.
- Create the versioned `roleward` Dexie database with `jobs`, `applications`,
  `documents`, and `settings` tables.
- Use stable string IDs from `crypto.randomUUID()`.
- Add only query-backed indexes, including role level, dates, document relations,
  and a unique application `jobId`.
- Put reads and writes behind feature repositories/hooks rather than importing raw
  tables throughout the UI.
- Validate job/application references and status/date invariants at every write and
  import boundary.
- Use transactions for multi-table changes such as deleting an application and its
  documents.
- Add an immutable Dexie version-1 declaration, an idempotent fictional sample
  seed, and fresh-create/reopen tests. Add fixture-based upgrade tests when version
  2 introduces the first real migration path.

Suggested minimum relationships:

- A local workspace contains jobs, applications, documents, and durable settings.
- A job has at most one tracked application in a workspace.
- An application belongs to one job and may have CV or cover-letter attachments.
- IndexedDB does not provide foreign keys or cascade deletes; repositories enforce
  those rules.

**Done when:** typed CRUD, constraints, transactions, seed idempotence, and a
database reopen all pass against `fake-indexeddb`.

### 4. Add local workspace setup and recovery

- Build first-run choices for **Start fresh**, **Load sample workspace**, and
  **Restore backup**; never seed silently.
- Store a required `workspace` settings record containing initialization, mode,
  sample version, and Roleward backup-format version. Keep only small,
  non-sensitive UI preferences in `localStorage`.
- Redirect an uninitialized deep link to `/`; send an initialized root visit to
  `/dashboard`.
- Request persistent browser storage after a user gesture. Treat denial as a
  non-blocking warning and explain the value of backups.
- Handle unavailable or blocked IndexedDB, migration failures, storage quotas, and
  failed writes without silently clearing data.
- Export all tables and document blobs in a versioned
  `.roleward-backup.json` file with `dexie-export-import`; include Roleward's
  format version in the required workspace settings record and warn that the file
  is not encrypted.
- Check the add-on header, stage the backup in a disposable database, and validate
  its Roleward marker, records, and references before offering a confirmed,
  full-workspace replacement. Enable `clearTablesBeforeImport`, keep transactions
  enabled, and never use `noTransaction`. Invalid, cancelled, or failed imports
  must leave current data unchanged.
- Add confirmed **Reset sample workspace** and **Reset workspace** actions, with an
  export reminder before deletion. Show sample reset only in sample mode. Run each
  reset across all four tables in one transaction so failure restores the previous
  workspace.

**Done when:** setup is explicit, data survives refresh, a backup including a blob
round-trips successfully, and destructive recovery actions cannot run without
confirmation.

### 5. Build job capture and search

- Build a manual job form for title, company, role level, location, source URL, and
  optional notes.
- Validate input with shared Zod schemas at form and repository boundaries.
- Build a results page with case-insensitive title/company substring search,
  role-level filter, clear-filters action, and pagination.
- Prefilter by indexed role level where useful, then scan the small local result set
  for substring search.
- Store filters in URL parameters so refresh and browser navigation preserve them.
- Add accessible database-loading, empty, read-error, and quota/write-error states.

**Done when:** a visitor can add a real job, search by title or company, combine
that search with a role-level filter, and reopen the same filtered URL.

### 6. Build the application tracker

- Let a visitor save a job without counting it as submitted.
- Let the visitor mark it applied and capture `appliedAt`.
- Build an application list and in-page detail view.
- Allow status and notes to be updated.
- Enforce one application per job in the local workspace.
- Preserve the original application date across all later status changes and
  prevent a submitted record from returning to saved.
- Expose a confirmed **Untrack** action for saved records and **Delete application**
  for submitted records. Keep the job, delete related documents transactionally,
  and remove a deleted submitted record from metrics.

**Done when:** one job can move through saved, applied, and a later status while the
original application date and count remain intact, and confirmed removal keeps the
job while deleting the application and its documents.

### 7. Add browser-local documents

- Build CV and cover-letter upload forms with React Hook Form and Zod.
- Accept PDF and DOCX files up to 10 MiB.
- Match `.pdf` with `application/pdf` and `.docx` with
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
  Permit a valid-extension fallback only when the media type is empty; reject
  non-empty mismatches and all other types before repository writes.
- Store each blob and its filename, media type, size, kind, relation, and upload
  date together in the IndexedDB `documents` table. Never index the blob.
- Download through a temporary object URL and revoke it after use.
- Delete related records transactionally, preserve prior data on failed writes,
  and show actionable quota errors.
- Include document records and bytes in backup/restore coverage.

**Done when:** a visitor can upload, download, and delete a local document, its
bytes survive reload and backup/restore, and deleting an application cannot leave
orphaned documents.

### 8. Build the statistics dashboard

- Show total submitted applications.
- Show counts by current submitted status.
- Present the status counts as summary cards or a plain list, not a chart.
- Add a useful zero state for an empty or saved-only workspace.
- Derive aggregates reactively from IndexedDB application records using the
  original `appliedAt`; do not maintain a mutable counter.

**Done when:** adding or updating an application produces the expected dashboard
values and they remain correct after refresh.

### 9. Test the complete journey

- Use Vitest and `fake-indexeddb` for validation, filter parsing, typed CRUD,
  unique `jobId`, status/counting rules, blob round-trips, transactions, sample
  idempotence, and database create/reopen behavior. Include unknown statuses plus
  malformed and impossible `appliedAt` dates in runtime-boundary tests; add upgrade
  fixtures when a second schema version exists.
- Prove backup export -> clear -> import restores records and document bytes.
- Prove corrupt, unsupported, cancelled, and failed imports do not alter current
  data.
- Prove workspace/sample resets reach their contracted final state and roll back
  every table on failure.
- Use React Testing Library for setup, forms, filters, storage states, destructive
  confirmations, empty states, and errors.
- Add one Playwright happy path:
  start fresh -> add/filter a job -> save -> mark applied -> upload a file ->
  verify dashboard -> reload and verify persistence.
- Use separate fresh browser contexts to prove that visitors do not share a
  workspace.
- Check keyboard navigation, labels, focus, and mobile layouts.

**Done when:** the happy path and backup round-trip pass, and automated tests prove
browser-context isolation and non-destructive failure behavior.

### 10. Automate and deploy

- Add a GitHub Actions workflow for linting, type checking, tests, and production
  build.
- Deploy the client-backed Next.js application to Vercel without backend secrets.
- Establish one stable production URL for real work and document that preview URLs,
  browsers, profiles, and devices use separate IndexedDB data.
- Document local setup, architecture, backup/restore, reset, test, and deployment
  commands in the README.
- Run the Playwright journey or a manual smoke test against the deployed
  production origin, including refresh persistence and backup download.

**Done when:** a clean commit passes CI and the full milestone journey works on the
stable Vercel URL.

## Milestone acceptance checklist

- [ ] A first-time visitor can explicitly start fresh, load fictional sample data,
      or restore a valid backup.
- [ ] A returning visitor's workspace persists after refresh on the same browser
      profile and origin.
- [ ] A visitor can find a sample job or manually add a real one.
- [ ] Keyword and role-level filters work together and survive refresh.
- [ ] A visitor can save a job and later mark it as applied.
- [ ] A visitor can update the application's status and notes without changing its
      original application date.
- [ ] A visitor can untrack or delete an application with confirmation; its job is
      retained and its related documents are removed.
- [ ] A visitor can attach, download, and delete a browser-local CV or cover letter.
- [ ] The submitted total and current-status counts are correct.
- [ ] Export and replacement import restore all records and document bytes.
- [ ] Invalid or failed import, reset cancellation, and failed reset leave current
      data unchanged.
- [ ] A successful workspace reset returns to first-run setup, and a successful
      sample reset restores the current deterministic sample.
- [ ] Separate browser contexts receive independent workspaces.
- [ ] The main journey and storage invariants are covered by automated tests.
- [ ] CI passes and a working deployment uses a documented stable origin.

## Recommended next milestones

1. **Job discovery:** choose a lawful job-data provider, import listings, normalize
   role levels, deduplicate results, and handle expired jobs.
2. **Optional cloud access:** only if real demand appears, decide on accounts,
   encryption, backend storage, backup, synchronization, and conflict handling.
3. **Email reply tracking:** after the backend decision, connect one provider,
   store OAuth credentials securely, sync messages in the background, and match
   them to applications.
4. **Search quality and workflow:** saved searches, alerts, reminders, richer
   analytics, and document versioning.
