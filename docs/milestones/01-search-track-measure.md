# Milestone 1: Track applications and measure progress

## Outcome

Deliver a web app that stores multiple CV versions locally, connects to the user's
email through an API to track applications and replies, and shows application
statistics on a static GitHub Pages website. This milestone is v1.

`upload CV versions -> connect email -> review applications and replies -> link CV used -> see progress`

The [product contract](../product-contract.md) defines behavior and counting rules.
The [tech stack](../tech-stack.md) defines the browser-only architecture.
This plan replaces the earlier search-led milestone; the existing filename is
retained so links continue to work.

## Prototype status

The initial prototype is runnable. It includes local CV versions, manual
application editing, a Gmail review queue, statistics, automated tests, and the
Pages workflow. Email field extraction remains manual. Real-provider validation
and live deployment are outstanding; this milestone is not yet complete.

## Scope

- A React and Vite website using strict TypeScript, Tailwind CSS, and shadcn/ui.
- A local database for CV files, version metadata, applications, and relevant
  synced email information, using IndexedDB through Dexie.
- Independent CV uploads and a record of the version used for each application.
- Gmail with browser authorization, user-triggered sync, reply association,
  duplicate prevention, and disconnect.
- Application review and correction of company, role, submission date, and status.
- Total applications, applications per day, and current-status counts.
- Focused tests, GitHub Actions CI, and static deployment to GitHub Pages.

Search, role-level filters, job-board feeds, a job match calculator, cover-letter
management, CV parsing, and advanced analytics are deferred. Sample-workspace
onboarding, full-workspace backup/restore, and cross-device sync are not release
requirements.

## Delivery steps

### 1. Align contracts with the static architecture

Update the earlier route, domain, and database declarations to match the revised
product contract. Remove the requirement for a jobs catalogue and documents owned
by applications. Align with the chosen Gmail integration and hash routing. Define
the initial import window and sync limits, and plan the Google client setup for
the personal test account. No supporting backend is part of v1.

**Done when:** The implementation plan supports local CV versions and real email
access, with explicit decisions for credentials and deployment. The revised
contracts are not marked complete until the code declarations agree with them.

### 2. Bootstrap the web app

Build the application shell and placeholders for `/`, `/documents`,
`/applications`, `/dashboard`, and `/settings`. Configure development commands,
validation, linting, type checking, unit/component tests, and a browser smoke test.
Use Vite, React Router hash routing, and the `/roleward/` asset base. The shell
starts without a Google client ID using an unconnected state. Verify a static
build, direct hash links, and reload beneath the repository path.

**Done when:** A clean checkout starts, renders the contracted pages, and passes
baseline checks. See the [bootstrap card](../project-items/02-bootstrap-local-first-application.md).

### 3. Implement local persistence and CV versions

Create the versioned database, validated repositories, application/message
relations, CV-version associations, and sync metadata. Build upload, version
labelling, listing, download, and deletion. Preserve earlier versions, support
uploads before connecting email, and handle storage failures without data loss.

**Done when:** Multiple CVs survive reload, original bytes download correctly, and
removing an application retains its CV versions.

### 4. Connect email and build the tracker

Implement the Gmail integration from the tech stack, including disconnect,
reconnect, and user-triggered sync. Display
company, role, application date, status, and replies. Deduplicate messages and
applications, expose uncertain information for review, preserve corrections, and
let the user select the CV version used. Support retry and reconnection without
losing locally stored records.

**Done when:** A configured Gmail mailbox supplies application information and
replies; repeated syncs do not create duplicates; disconnect stops access while
retaining local data. Fixtures alone do not complete email integration.

### 5. Add statistics

Derive the total from confirmed applications, group dated applications by
submission day, report undated records separately, and show current-status counts.
Keep metrics current after review, correction, deletion, and sync. Display daily
activity as an accessible HTML table alongside summary cards.

**Done when:** The dashboard reports accurate total and daily counts, including
zero-activity days, without counting individual emails as applications.

### 6. Verify and release

Test CV byte persistence, message matching, repeated and failed syncs, corrected
fields, unknown dates, and metric updates. Exercise the complete journey with
provider fixtures in CI and a real authorized mailbox before release. Check
keyboard use, mobile layouts, deployment configuration, and local-storage scope.

**Done when:** Required checks pass and the deployed app completes the real email,
CV, and statistics journey on GitHub Pages. Setup documentation explains Google
configuration, any applicable verification requirements, hash routing, and where
user data is stored. No private mailbox data enters CI or deployment artifacts.

## Acceptance checklist

- [ ] Multiple CV versions can be uploaded, labelled, retained, and downloaded.
- [ ] A CV version can be associated with more than one application.
- [ ] CV uploads work before email is connected or applications exist.
- [ ] Gmail connects through its API with user authorization on the deployed origin.
- [ ] Company, application date, and replies appear, with missing fields marked
      unknown and available for correction.
- [ ] Repeated syncs neither duplicate applications nor overwrite corrections.
- [ ] Deleted applications are not silently recreated on the next sync.
- [ ] Disconnect and sync errors preserve local application and CV records.
- [ ] Total, daily, and status statistics follow the product contract.
- [ ] Reload preserves the workspace in the same browser profile and origin.
- [ ] Automated checks pass and the Gmail journey works on GitHub Pages.
- [ ] Direct hash links and refresh work beneath `/roleward/`.

## Possible later features

Search and a job match calculator may be considered after v1. Neither is a
prerequisite for releasing the tracker, and no later feature is committed yet.
