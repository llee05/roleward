# Milestone 1 product contract

This document fixes the user-facing vocabulary, routes, storage behavior, page
states, and counting rules for Milestone 1. The TypeScript sources of truth are
[`role-levels.ts`](../src/domain/role-levels.ts),
[`application-statuses.ts`](../src/domain/application-statuses.ts),
[`routes.ts`](../src/routing/routes.ts), and
[`local-database.ts`](../src/persistence/local-database.ts).

## Product and persistence model

Roleward is a local-first, single-person workspace. Domain data is stored in the
current browser's IndexedDB database through Dexie. Jobs, applications, durable
workspace settings, document metadata, and document `Blob` values use IndexedDB;
`localStorage` is limited to small, non-sensitive presentation preferences.

A workspace belongs to one browser profile on one exact site origin. Sharing the
deployed URL shares the application, not its data: a friend, recruiter, or employer
opens an independent fresh or sample workspace and cannot see the owner's records.
Milestone 1 has no accounts, server database, cloud copy, cross-device sync, or
automatic cloud backup.

“Local” does not mean encrypted or access-controlled by Roleward. Someone who can
use the browser profile, or script running on the same origin, may be able to read
its data. Clearing site data, losing the device or profile, or moving to another
origin can make the workspace unavailable. The app requests persistent browser
storage when supported, but browsers may refuse the request and storage quotas
still apply. A stable production URL matters because each preview URL has a
separate origin and therefore a separate IndexedDB database.

IndexedDB makes records available without a server; it does not by itself make the
deployed app load offline. Offline application-shell caching is a separate PWA
feature and is not promised in Milestone 1.

## Main journey

```text
open Roleward
  -> choose a fresh workspace or load deterministic sample data
  -> find or manually add a job
  -> save the job
  -> mark the application as submitted
  -> attach a CV or cover letter
  -> update the current status
  -> review progress
  -> export a backup
```

A **job** is a role in the local catalogue or one added manually. A **tracked
application** links the local workspace to one job. While that record has the
`saved` status, the UI calls it a saved job and reporting does not count it as a
submitted application.

On first use, `/` offers **Start fresh** and **Load sample workspace**. Sample
data is deterministic, is copied into that browser's database, and can then be
edited like any other data. Seeding is idempotent and never overwrites an
established workspace during an upgrade. Returning visitors with an initialized
workspace continue to `/dashboard`.

## Routes

| Route | Responsibility |
| --- | --- |
| `/` | Explain browser-local storage and let a first-time visitor start fresh or load sample data; otherwise continue to the existing workspace. |
| `/jobs` | Search by title or company, filter by role level, and open the manual-job form. Search state lives in `q`, `level`, and `page` query parameters. |
| `/jobs/[id]` | Show one local job and let the user save it or mark its application as submitted. |
| `/applications` | List saved jobs and submitted applications, open an in-page detail panel, and edit status or notes. |
| `/documents` | Upload, list, download, and delete local CVs and cover letters associated with an application. |
| `/dashboard` | Show the submitted total, submitted-only status breakdown, and applications by week. |
| `/settings` | Show local-storage information and provide backup, restore, sample-reset, and workspace-reset controls. |

There are no protected routes or authentication redirects. Until workspace setup
is complete, a direct visit to any data-bearing route returns to `/`. Every
data-bearing page opens IndexedDB through a client boundary before deciding its
data state; `/jobs/[id]` therefore presents a client-side local not-found state.
The manual-job form stays on `/jobs`, and application detail stays on
`/applications`, so neither interaction requires another product route.

## Local database contract

Dexie owns the versioned IndexedDB database named `roleward`. Version 1 has four
tables:

| Table | Contents and invariants |
| --- | --- |
| `jobs` | Stable UUID, job facts, role level, source, and creation date. Title/company substring search filters the small local result set; ordinary Dexie indexes do not provide arbitrary substring search. |
| `applications` | Stable UUID, a unique indexed `jobId`, current status, original `appliedAt`, notes, and update date. There is at most one application for a job in a workspace. |
| `documents` | Stable UUID, `applicationId`, kind, filename, media type, size, upload date, and an unindexed file `Blob`. |
| `settings` | Durable workspace metadata such as initialization and sample-data versions. It is distinct from disposable UI preferences in `localStorage`. |

IndexedDB does not enforce foreign keys, cascades, or the status/date rule. UI code
does not write to raw Dexie tables directly: repository functions validate runtime
input, use transactions for related multi-table changes, and define delete
behavior. Imports pass through the same validation. Record IDs use
`crypto.randomUUID()` so exports remain portable and future sync is not blocked
by auto-incremented keys.

Each released schema change adds a new Dexie version and upgrade function; a
released migration is not rewritten. Upgrade tests begin from every supported
older version. A failed migration must leave the previous data intact and show a
recoverable migration error rather than silently reseeding or resetting it.

## Documents

Documents are PDF or DOCX files of at most 10 MiB. The browser validates size,
extension, and available media type before a repository write; an empty media type
uses the validated extension fallback. The file blob and metadata are stored
together, and the blob is never indexed. Downloads use a temporary object URL that
is revoked after use. Previewing or parsing document contents is out of scope.

Deleting an application and its documents is one Dexie transaction. A failed or
quota-exceeded write leaves existing records intact and shows an actionable error.
“Stored locally” does not imply encryption or protection from other users of the
same browser profile.

## Backup, restore, and reset

The settings page exports the complete database, including document blobs, as one
downloadable, versioned `.roleward-backup.json` file using
`dexie-export-import`. The backup identifies its Roleward format version and
database version so future releases can migrate or reject it deliberately. The UI
warns that the downloaded file contains unencrypted application data and documents.

Restore is a replacement, not an implicit merge. Before changing current data, the
app reads and validates the backup metadata, references, and every record; shows
record counts; reports an invalid or unsupported file; and asks for confirmation.
A successful restore replaces the workspace atomically. A cancelled or failed
restore leaves the current workspace unchanged and usable.

Reset is destructive and requires confirmation. The UI recommends exporting a
backup first. **Reset workspace** returns to first-run setup. **Reset sample
workspace** replaces the current data with the current deterministic sample only
after the same confirmation. Browser-storage persistence is best effort, so export
is the supported recovery and transfer mechanism.

## Role levels

Each job has exactly one role level.

| Value | Meaning |
| --- | --- |
| `internship` | Explicitly advertised as an internship or placement. |
| `graduate` | Explicitly advertised as a graduate role or program. |
| `junior` | Advertised as junior or entry-level, but not as an internship or graduate program. |
| `other` | Any other level, or a listing that cannot be classified from the available information. |

Classification follows the table from top to bottom. This makes an explicit
internship or graduate program more specific than generic entry-level wording;
`other` is the deliberate catch-all and not a second name for `junior`.

## Application statuses

An application status is the current snapshot of the user's candidacy, not an
event history.

| Value | Meaning | `appliedAt` |
| --- | --- | --- |
| `saved` | The job is tracked, but no application has been submitted. | Must be `null`. |
| `applied` | The application was submitted and no later milestone or outcome is recorded. | Required. |
| `interview` | The employer moved the application into its interview process, including later rounds or awaiting an outcome. | Required and unchanged. |
| `offer` | The employer made an offer. Acceptance is not modelled separately in Milestone 1. | Required and unchanged. |
| `rejected` | The employer ended the candidacy. | Required and unchanged. |
| `withdrawn` | The user ended the candidacy, including by declining an offer. | Required and unchanged. |

A new tracked record starts as `saved`. Marking it applied changes the status to
`applied` and sets `appliedAt` once. Later status updates preserve that
original date. Submitted statuses may be corrected or changed to another submitted
status, but a submitted record cannot return to `saved`. Someone who no longer
wants an unsubmitted saved job should untrack it rather than mark it `withdrawn`.

`appliedAt` is an ISO 8601 calendar-date string (`YYYY-MM-DD`). It records the
user's local submission date, whether initially defaulted or entered for an older
application. The discriminated TypeScript type describes valid stored values, and
the repository and import boundaries call `hasValidSubmissionState` to reject
invalid runtime combinations. Status transitions also preserve an existing
`appliedAt` and reject submitted-to-saved changes.

Any tracked record can receive a CV or cover letter, including a saved job or a
submitted application in any current status. Changing status never removes its
documents.

## Application metrics

`appliedAt` is the source of truth for every submitted-application metric. The
submitted total is the number of application records whose `appliedAt` is not
`null`; it is derived from current IndexedDB data and is never a mutable counter.
Changing a submitted application to `interview`, `offer`, `rejected`, or
`withdrawn` therefore cannot reduce the total.

The status breakdown filters to the same submitted subset before grouping by
current status. It has no `saved` segment and its segments always sum to the
submitted total. The applications-over-time chart also uses original `appliedAt`
values, with calendar-week buckets beginning on Monday. Because `appliedAt` is a
date and not an instant, bucketing does not apply a timezone conversion. The chart
never uses a status-change or update timestamp.

For example, one saved record and one rejected record with an application date
produce a total of one and a breakdown of one rejected application.

## Page-state sketches

An empty collection state means IndexedDB opened successfully but contains no
relevant records. It is distinct from database opening/migration, an in-progress
write, and a storage failure. All states keep the application shell and page
heading visible where a workspace exists.

| Route | Empty | Loading | Error | Populated |
| --- | --- | --- | --- | --- |
| `/` | Explain local storage and offer **Start fresh** or **Load sample workspace**. | Show workspace database opening or migration progress and disable setup actions. | Explain storage unavailability or migration failure without offering a destructive reset as the first action. | Continue to `/dashboard`; the setup screen is not shown over existing data. |
| `/jobs` | Explain either that the catalogue is empty or that no jobs match. Offer **Add a job**, and **Clear filters** for no matches. | Keep heading and filters visible; show result-card skeletons while the database/query opens. | Show an inline retry while preserving URL filters; distinguish quota/write failure on add. | Show paginated job cards, active filters, **Clear filters**, and **Add a job**. |
| `/jobs/[id]` | Treat an ID absent from the local database as not found, with a link to `/jobs`. | Show a detail skeleton while IndexedDB opens and the job is queried. | Show retry for database/query failure; do not present it as not found. | Show job facts and exactly one action state: **Save job**, **Mark applied**, or a link to its tracked application. |
| `/applications` | Explain that no jobs are tracked and link to `/jobs`. | Show row skeletons while the local query opens. | Show inline retry without discarding current view controls; identify failed writes. | Show saved and submitted rows with current status, company, role, and application date; selection opens the editor. |
| `/documents` | If no application can receive a document, link to jobs/applications. Otherwise explain that no files are stored and show **Upload document**. | Show file-row skeletons and disable upload actions during reads/writes. | Preserve successful files and distinguish invalid file, quota, and database failures. | Show browser-local files with type, related application, upload date, download, and delete actions. |
| `/dashboard` | When no record has `appliedAt`, show zero submissions and link to `/jobs`; saved jobs do not suppress this state. | Show skeletons for locally derived total, breakdown, and chart. | Show inline retry and do not present stale totals as current. | Show submitted total, submitted-only status breakdown, and weekly series derived from `appliedAt`. |
| `/settings` | With no records, still show storage scope, backup/import, and reset guidance. | Disable affected controls and announce storage estimation, export, import, or reset progress. | Keep current data intact where possible and report persistence denial, invalid backup, quota, migration, or operation failure with the relevant recovery action. | Show origin-scoped storage details, persistence status, export/import controls, and confirmed sample/workspace reset actions. |

Errors are announced accessibly and offer retry when the operation is safe to
repeat. Empty states explain why the page is empty and provide the next useful
action. A denied persistent-storage request is a warning with export guidance, not
proof that current data was lost.
