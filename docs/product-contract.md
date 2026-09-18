# V1 product contract

Roleward is a personal job-search tracking website hosted on GitHub Pages. V1 has three core features:
locally stored CV versions, email-connected application tracking, and useful
application statistics. Finding jobs and calculating job matches are outside v1.

This document describes the intended v1 behavior. The initial prototype aligns
route, status, and persistence declarations with this vision and supports manual
application entry alongside Gmail review. Email field extraction is manual in the
prototype; production readiness still requires a real-provider check and deployment.
See the [README](../README.md) for runnable features and current limits.

## Main journey

```text
open Roleward
  -> upload a CV and keep additional versions as needed
  -> connect an email account
  -> sync and review application details and replies
  -> associate an application with the CV version used
  -> review total applications and daily activity
```

CV upload and email connection can happen in either order. Uploading a CV does
not require an application or a connected mailbox. Previously stored data remains
viewable when email is disconnected or a sync fails.

## V1 scope

| Feature                  | Required behavior                                                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CV versions              | Upload, list, download, and delete CV files; retain multiple versions independently; associate the version used with an application.                                                                                   |
| Email-connected tracking | Authorize access through an email provider API, retrieve relevant application messages, and display company, role when available, application date, and replies. Allow review and correction of extracted information. |
| Statistics               | Display total applications, applications per calendar day, and counts by current application status using the local application records.                                                                               |

Search, job discovery, a job match calculator, CV parsing or rewriting,
cover-letter management, reminders, and advanced analytics are not v1 delivery
requirements. Sample workspaces, full-workspace backup/restore, cloud sync, and
collaborative accounts are also outside this release's core scope.

## Storage and integration boundary

The [tech stack](tech-stack.md) selects React, TypeScript, and Vite for a static
website. All application logic and data processing run in the browser. There is
no application backend, server database, or scheduled sync service.

CV bytes, version metadata, application records, and relevant email information
use IndexedDB through Dexie. Domain records and files do not use `localStorage`,
and neither CVs nor mailbox data are uploaded to GitHub.

A workspace belongs to one browser profile and exact site origin. Sharing the
URL does not share its records. Repository paths on the same GitHub Pages host
share an origin; paths do not isolate browser storage. Clearing site data or
losing the profile can remove local data. There is no promised cloud backup,
cross-device sync, or offline app-shell cache.

Gmail is the first supported provider, using Google Identity Services and the
Gmail API directly from the browser. Follow the [email design](tech-stack.md#gmail-integration)
for authorization, token lifetime, revocation, and provider setup. Sync is
user-triggered while the site is open. The prototype discovers up to 100 matching threads from the last 180 days and
refreshes previously tracked threads. Other providers are outside v1.

## CV versions

Each upload creates a distinct CV version with a stable ID, a user-editable label,
original filename, media type, byte size, upload timestamp, and file bytes. A new
upload never silently replaces an older version, even when filenames match.

Accept PDF and DOCX files up to 10 MiB. Validate the extension, size, and media
type before storage; allow a valid extension when the browser supplies no media
type, but reject a non-empty conflicting type. Store metadata and bytes together,
and preserve existing versions on validation or storage failure.

A CV version exists independently of applications. One version can be associated
with multiple applications; an application may have one selected version or none.
The user selects the version used rather than the app guessing from message text.
Changing that association does not modify the stored CV.

Downloads return the original bytes. Deleting a version requires confirmation;
if linked, explain that those associations will be cleared while retaining the
applications. Deleting an application never deletes a CV version. Parsing,
previewing, comparing contents, and scoring CVs are outside v1.

## Email-connected application tracking

The user explicitly connects Gmail using the browser authorization flow in the
tech stack. Roleward reads relevant application correspondence; sending mail or
changing the mailbox is outside v1. Only the public OAuth client ID is build-time
configuration. Access tokens stay in memory, and secrets must never enter the
bundle, persisted records, or logs. Local features work without email authorization.

The application list shows company, role when known, application date, current
status, and latest reply information. Its detail view shows associated replies
with sender, timestamp, subject, and relevant message text, plus the selected CV
version. Render email content safely as untrusted input.

An **application** is one submitted candidacy, not one email. Confirmations and
later replies attach to the same application. Provider account, message, and
thread identifiers support deduplication. Repeating a sync must not create extra
applications or replies, and company name alone is insufficient to merge records:
a person can apply for several roles at the same company.

Uncertain messages or extracted fields need review. Missing company, role, or
submission date must remain visibly unknown until confirmed; do not invent them
or treat a reply's arrival date as the submission date. Users can correct fields,
status, and message associations. Later syncs must preserve those corrections.
Unrelated messages and unresolved candidate messages do not count as applications.

Show connection state, sync progress, last successful sync, and recoverable errors.
Handle expired authorization, denied access, provider limits, and partial failures
without losing existing records. Disconnecting stops future access and removes
in-memory authorization while keeping locally tracked data. Attempt remote grant
revocation and disclose failure as described in the tech stack.

Confirmed deletion removes an application and its local reply associations,
updates statistics, and preserves all CV versions. Retain enough sync exclusion
information to prevent the next sync from silently recreating a deleted record.
Deleting local records never deletes messages from the user's mailbox.

## Application records and statuses

An application stores a stable ID, company and role where known, submission date
(`appliedAt`), current status, optional CV-version reference, source references,
and creation/update timestamps. Replies retain provider identifiers and their
application association separately from the application itself.

| Status      | Meaning                                                 |
| ----------- | ------------------------------------------------------- |
| `applied`   | Submitted, with no later milestone or outcome recorded. |
| `interview` | The application has progressed to interviews.           |
| `offer`     | The employer has made an offer.                         |
| `rejected`  | The employer has ended the candidacy.                   |
| `withdrawn` | The user has ended the candidacy.                       |

Saved jobs are not part of v1. All confirmed application records represent
submitted applications, even if their submission date is still unknown.
`appliedAt` is a valid `YYYY-MM-DD` calendar date or null when unknown. Normal
status changes and incoming replies preserve it; an explicit user correction may
change it and must update the daily statistics.

The local data model needs applications, CV versions, relevant email messages,
and workspace/sync metadata. The prototype defines these tables and indexes in
`src/persistence/local-database.ts`. The old jobs catalogue, unique `jobId` constraint, and documents
owned by a single application are not requirements of the revised model.

## Statistics

Statistics are derived from confirmed application records, never from email or
CV counts and never from a separately maintained counter.

- **Total applications:** Count each confirmed application once, including ones
  whose submission date is unknown.
- **Applications per day:** Group applications by their known `appliedAt`
  calendar date. Show zero for days without applications in the displayed period,
  and report undated applications separately.
- **Current status counts:** Group the same applications by current status. These
  counts sum to the total.

Use a consistent workspace timezone to interpret email timestamps when deriving
calendar dates. Preserve the stored submission date on later syncs. Daily figures
use the submission date, never the upload date, reply date, or sync date.

For example, two applications submitted on the same day, three replies to one of
them, and one confirmed application with an unknown date produce a total of three,
a count of two on that day, and one undated application. Later rejection of one
application changes the status counts, not the total or its submission day.

## Routes and page states

| Route           | Responsibility                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `/`             | Introduce the tracker and open the local workspace; returning users continue to the dashboard. |
| `/documents`    | Manage the CV version library, including uploads before any applications exist.                |
| `/applications` | Review application details and replies, correct fields, and select the CV version used.        |
| `/dashboard`    | Show total applications, applications per day, and current status counts.                      |
| `/settings`     | Connect or disconnect email, trigger sync, and explain connection and local-storage state.     |

These are logical paths inside React Router's `HashRouter`: the deployed
application route is `/roleward/#/applications`, for example. Hash links must
survive refresh and direct navigation on Pages. Gmail authorization uses a popup
and browser callback, with no server callback endpoint. `/jobs` and `/jobs/[id]`
are not v1 routes. See the [routing design](tech-stack.md#routing-and-deployment).

Each data page distinguishes loading, empty, populated, and error states. An empty
CV library offers upload; an empty tracker offers email connection or sync; an
empty dashboard shows zero statistics. Unknown dates and fields are displayed
explicitly. A failed sync retains existing records and shows when data was last
updated. A local storage failure must not be presented as an empty workspace.

## V1 acceptance

- Multiple CV versions survive reload and download with unchanged bytes.
- A configured Gmail account can connect, sync relevant
  application details and replies, and disconnect.
- Repeated syncs preserve corrections and do not inflate application counts.
- The user can see which CV version was used for an application.
- Total applications, daily counts, and status counts follow the rules above.
- Storage and email failures preserve existing data and offer useful next steps.
- The core journey works on mobile and with keyboard navigation.
- The static build works on GitHub Pages, including direct hash links and reload.
