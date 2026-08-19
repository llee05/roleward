# Milestone 1: Search, track, and measure

## Outcome

A new user can sign in, find or manually add a job, record an application, attach
a CV or cover letter, update the application's status, and see accurate progress
statistics in a deployed version of Roleward.

This is the first complete product journey:

`find a job -> track it -> apply -> attach documents -> see progress`

## Important assumption

In this milestone, search runs against jobs stored in Roleward. Development starts
with seeded jobs and users can add a job manually. Searching live job boards is a
separate milestone because it requires choosing a licensed data source and handling
imports, duplicates, expired listings, and provider limits.

Automatic email reply tracking is also deferred. It requires provider-specific
OAuth, secure token storage, background syncing, and message-to-application matching.
Applications can still be updated manually in Milestone 1.

## In scope

- Next.js App Router application using TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Auth, PostgreSQL, and private Storage
- Protected application routes
- Seeded jobs and manual job entry
- Search by job title or company
- Role-level filters: internship, graduate, junior, and other
- Application statuses: saved, applied, interview, offer, rejected, and withdrawn
- Private PDF or DOCX CV and cover-letter uploads
- Total application count, status breakdown, and applications-over-time chart
- Zod and React Hook Form validation
- Vitest, React Testing Library, and Playwright coverage
- GitHub Actions and a Vercel deployment

## Out of scope

- Live job-board aggregation or scraping
- Applying to jobs from inside Roleward
- Gmail or Outlook connection and automatic reply detection
- AI job matching, CV parsing, or generated cover letters
- Notifications, reminders, collaboration, and advanced analytics

## Definition of "application count"

A saved job is not counted as an application. The total is the number of records
with an `applied_at` date. Changing a submitted application to interview, offer, or
rejected must not reduce that total. Statistics are derived from application data;
there is no separate counter to keep in sync.

## Delivery steps

Each step should be small enough to complete as a separate pull request.

### 1. Confirm the product contract

Status: complete. See the [Milestone 1 product contract](../product-contract.md).

- Write the final role levels and application statuses as TypeScript constants.
- Sketch the routes: `/login`, `/jobs`, `/jobs/[id]`, `/applications`,
  `/documents`, and `/dashboard`.
- Sketch the empty, loading, error, and populated state for each main page.
- Record the application-count rule above in the code or schema documentation.

**Done when:** the main user journey and the meaning of every status are unambiguous.

### 2. Bootstrap the application

- Create the Next.js App Router project with strict TypeScript.
- Add Tailwind CSS and shadcn/ui.
- Add Zod, React Hook Form, Recharts, and the Supabase JavaScript clients.
- Configure ESLint, Vitest, React Testing Library, and Playwright.
- Add `.env.example` and validate required environment variables at startup.
- Create a responsive public layout and protected app shell.

**Done when:** a clean checkout can install, lint, type-check, test, and start locally.

### 3. Create the Supabase foundation

- Add versioned migrations and deterministic development seed data.
- Create `profiles`, `jobs`, `applications`, and `documents`.
- Give manually entered jobs an owner; catalogue jobs can be readable by all signed-in
  users.
- Add indexes for title/company search, role level, application status, and dates.
- Create a private `documents` Storage bucket.
- Add Row Level Security policies to every user-owned table and Storage path.
- Generate TypeScript database types from the schema.

Suggested minimum relationships:

- A user owns applications and documents.
- A job can have many applications, but only one per user.
- An application belongs to one job and may have CV or cover-letter attachments.

**Done when:** the database can be rebuilt from migrations, includes sample jobs, and
two test users cannot read or change one another's records or files.

### 4. Add authentication

- Build sign-up, sign-in, sign-out, and auth callback flows with Supabase Auth.
- Keep the session in secure cookies.
- Redirect unauthenticated users away from protected routes.
- Show validation and authentication errors without losing form state.

**Done when:** a user can sign in, refresh the page without losing the session, and
cannot open app pages after signing out.

### 5. Build job capture and search

- Build a manual job form for title, company, role level, location, source URL, and
  optional notes.
- Validate the form with one shared Zod schema on both client and server.
- Build a results page with keyword search, role-level filter, clear-filters action,
  and pagination.
- Store filters in URL parameters so refresh and browser navigation preserve them.
- Add accessible loading, empty, and error states.

**Done when:** a user can add a real job, search by title or company, combine that
search with a role-level filter, and reopen the same filtered URL.

### 6. Build the application tracker

- Let a user save a job without counting it as submitted.
- Let the user mark it applied and capture `applied_at`.
- Build an application list and detail view.
- Allow status and notes to be updated.
- Prevent duplicate applications for the same user and job.

**Done when:** the user can move one job through saved, applied, and a later status,
and the original application date remains intact.

### 7. Add private document uploads

- Build CV and cover-letter upload forms with React Hook Form and Zod.
- Accept PDF and DOCX files up to a documented limit such as 10 MB.
- Validate file type and size in the browser and again on the server.
- Store files under a user-scoped path in the private Supabase bucket.
- Store file metadata in PostgreSQL and associate the file with an application.
- Use short-lived signed URLs for download and support safe deletion.

**Done when:** a user can upload, view, download, and delete their own document, while
another signed-in user cannot access it.

### 8. Build the statistics dashboard

- Show total submitted applications.
- Show counts by current status.
- Show applications by week with Recharts.
- Add a useful zero state for a new account.
- Calculate aggregates in PostgreSQL or a server-side query instead of downloading
  every application or maintaining a mutable counter.

**Done when:** adding or updating an application produces the expected dashboard
values after refresh.

### 9. Test the complete journey

- Use Vitest for validation, filter parsing, and status/counting rules.
- Use React Testing Library for forms, filters, empty states, and error states.
- Add Supabase integration tests for Row Level Security with two ordinary users.
- Add one Playwright happy path:
  sign in -> filter for a role -> add/select a job -> mark applied -> upload a file
  -> verify the dashboard count.
- Check keyboard navigation, labels, focus, and mobile layouts.

**Done when:** the happy path passes and automated tests prove user data isolation.

### 10. Automate and deploy

- Add a GitHub Actions workflow for linting, type checking, tests, and production build.
- Configure separate Supabase environments for development/preview and production.
- Deploy to Vercel with only public Supabase values exposed to the browser.
- Document local setup, migration, test, and deployment commands in the README.
- Run the Playwright journey or a manual smoke test against the deployed preview.

**Done when:** a clean commit passes CI and the full milestone journey works on a
Vercel URL.

## Milestone acceptance checklist

- [ ] A new user can sign up, sign in, and sign out.
- [ ] The user can find a seeded job or manually add a real one.
- [ ] Keyword and role-level filters work together and survive refresh.
- [ ] The user can save a job and later mark it as applied.
- [ ] The user can update the application's status and notes.
- [ ] The user can privately attach a CV or cover letter.
- [ ] Total, status, and weekly statistics are correct.
- [ ] Another user cannot access the first user's applications or documents.
- [ ] The main journey is covered by automated tests.
- [ ] CI passes and a working preview is deployed to Vercel.

## Recommended next milestones

1. **Job discovery:** choose a lawful job-data provider, import listings, normalize
   role levels, deduplicate results, and handle expired jobs.
2. **Email reply tracking:** connect one provider, store OAuth credentials securely,
   sync messages in the background, match them to applications, and create reviewable
   response events.
3. **Search quality and workflow:** saved searches, alerts, reminders, richer analytics,
   and document versioning.
