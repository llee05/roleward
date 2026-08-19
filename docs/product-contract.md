# Milestone 1 product contract

This document fixes the user-facing vocabulary, routes, page states, and counting
rules for Milestone 1. The TypeScript sources of truth are
[`role-levels.ts`](../src/domain/role-levels.ts),
[`application-statuses.ts`](../src/domain/application-statuses.ts), and
[`routes.ts`](../src/routing/routes.ts).

## Main journey

```text
sign up or sign in
  -> find or manually add a job
  -> save the job
  -> mark the application as submitted
  -> attach a CV or cover letter
  -> update the current status
  -> review progress
```

A **job** is a role that can be discovered in the catalogue or added manually. A
**tracked application** is the user-owned record that links a user to a job. While
that record has the `saved` status, the UI calls it a saved job and reporting does
not count it as a submitted application.

## Routes

| Route | Access | Responsibility |
| --- | --- | --- |
| `/login` | Public | Sign up and sign in. An authenticated visitor is redirected to `/jobs`. |
| `/jobs` | Protected | Search by title or company, filter by role level, and open the manual-job form. Search state lives in `q`, `level`, and `page` query parameters. |
| `/jobs/[id]` | Protected | Show one job and let the user save it or mark its application as submitted. |
| `/applications` | Protected | List saved jobs and submitted applications, open an in-page detail panel, and edit status or notes. |
| `/documents` | Protected | Upload, list, download, and delete private CVs and cover letters associated with an application. |
| `/dashboard` | Protected | Show the submitted total, submitted-only status breakdown, and applications by week. |

An unauthenticated visit to a protected route redirects to `/login` with the
original destination retained. After authentication the user returns there; a
direct login without a retained destination continues to `/jobs`. The root route
and the authentication callback are implementation routes to settle during the
application bootstrap, not additional Milestone 1 product pages.

The manual-job form stays on `/jobs`, and application detail stays on
`/applications`, so neither interaction requires an additional product route.

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

| Value | Meaning | `applied_at` |
| --- | --- | --- |
| `saved` | The user tracks the job but has not submitted an application. | Must be `null`. |
| `applied` | The application was submitted and no later milestone or outcome is recorded. | Required. |
| `interview` | The employer moved the application into its interview process, including later interview rounds or awaiting the interview outcome. | Required and unchanged. |
| `offer` | The employer made an offer. Acceptance is not modelled separately in Milestone 1. | Required and unchanged. |
| `rejected` | The employer ended the candidacy. | Required and unchanged. |
| `withdrawn` | The user ended the candidacy, including by declining an offer. | Required and unchanged. |

A new tracked record starts as `saved`. Marking it applied changes the status to
`applied` and sets `applied_at` once. Later status updates preserve that original
date. Submitted statuses may be corrected or changed to another submitted status,
but a submitted record cannot return to `saved`. A user who no longer wants an
unsubmitted saved job should untrack it rather than mark it `withdrawn`.

## Application metrics

`applied_at` is the source of truth for every submitted-application metric:

```sql
-- Total submitted applications
count(*) filter (where applied_at is not null)
```

The total is never inferred from current status and there is no mutable counter.
Changing a submitted application to `interview`, `offer`, `rejected`, or
`withdrawn` therefore cannot reduce the total.

The status breakdown filters to `applied_at is not null` before grouping by current
status. It has no `saved` segment and its segments always sum to the submitted
total. The applications-over-time chart also uses the original `applied_at` date,
with weekly buckets beginning on Monday; it never uses a status-change or update
timestamp.

For example, one saved record and one rejected record with an application date
produce a total of one and a breakdown of one rejected application.

## Page-state sketches

An empty collection state is a successful response with no relevant data. It is
distinct from loading and failure. The job-detail page has no collection-empty
state, so its no-record outcome appears under **Empty** as a not-found response.
Protected pages resolve authentication before rendering their data state.

| Route | Empty | Loading | Error | Populated |
| --- | --- | --- | --- | --- |
| `/login` | Show blank sign-in/sign-up forms. | Disable the submitted form and announce session checking or submission progress. | Keep entered values and show the validation or authentication error beside the relevant field or form. | A valid session redirects to the retained destination or `/jobs`; there is no signed-in login screen. |
| `/jobs` | Explain either that the catalogue is empty or that no jobs match. Offer **Add a job**, and offer **Clear filters** for no matches. | Keep the heading and filters visible; show result-card skeletons. | Show an inline retry action while preserving URL filters. | Show paginated job cards, active filters, **Clear filters**, and **Add a job**. |
| `/jobs/[id]` | Treat an unknown or inaccessible ID as not found, with a link back to `/jobs`. | Show a job-detail skeleton with the page heading retained. | Show a retry action for a failed lookup; do not present it as not found. | Show job facts and exactly one current action state: **Save job**, **Mark applied**, or a link to its tracked application. |
| `/applications` | Explain that no jobs are tracked and link to `/jobs`. | Show application-row skeletons. | Show an inline retry action without discarding the current view controls. | Show saved and submitted rows with current status, company, role, and application date; selection opens the detail editor. |
| `/documents` | If no application can receive a document, link to jobs/applications. Otherwise explain that no files are uploaded and show **Upload document**. | Show file-row skeletons and disable upload actions. | Show a retry action for the list or a specific upload error without removing successful files. | Show private file rows with type, related application, upload date, download, and delete actions. |
| `/dashboard` | When no record has `applied_at`, show a zero-submissions message and link to `/jobs`; saved jobs do not suppress this state. | Show skeletons for the total, breakdown, and chart. | Show an inline retry action and no stale totals presented as current. | Show the submitted total, submitted-only status breakdown, and weekly series derived from `applied_at`. |

All loading states retain the application shell and page heading. Errors are
announced accessibly and offer a retry when the operation is safe to repeat. Empty
states explain why the page is empty and provide the next useful action.
