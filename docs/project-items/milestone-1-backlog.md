# Milestone 1 backlog

This backlog replaces the earlier search-led plan and implements the
[v1 product contract](../product-contract.md) and
[GitHub Pages tech stack](../tech-stack.md). It is a local planning document;
existing external project items will need to be reconciled separately.

Each item starts in **Backlog**, moves to **Development** when work begins, and
closes when its acceptance criteria are met. Focused tests belong with each
implementation item. No item is assumed complete from the previous scope.

## Prototype progress

The scaffold, revised code contracts, local features, Gmail review adapter,
statistics, tests, and Pages workflow are implemented. Checklists below retain
the full v1 delivery requirements: automatic extraction, failure-case coverage,
real-provider validation, and deployment still need follow-through. The
[README](../../README.md) describes the prototype's current limits.

## 1. Align domain contracts with the static architecture

- [ ] Revise route constants for the CV library, tracker, dashboard, and settings.
- [ ] Define independent CV versions, confirmed applications, associated messages,
      and workspace/sync metadata; remove the required jobs catalogue.
- [ ] Align status/date rules with confirmed applications that may have unknown
      submission dates.
- [ ] Apply the chosen Gmail browser integration and define import window and sync limits.
- [ ] Plan Google OAuth client setup and test-user configuration for the Pages origin.
- [ ] Align route metadata with hash routing and document browser-only data handling.

**Done when:** Code declarations match v1 and the email design supports real
provider access while keeping CV files in the local database.

**Depends on:** Revised product contract.

## 2. Bootstrap the Roleward web app

- [ ] Scaffold React, Vite, strict TypeScript, Tailwind CSS, and shadcn/ui.
- [ ] Add the contracted pages, React Router hash navigation, and `/roleward/` asset base.
- [ ] Separate local repositories from the browser Gmail adapter; add no server runtime.
- [ ] Configure validation, formatting, linting, type checks, and unit/browser tooling.
- [ ] Document installation, development, test, and build commands.

**Done when:** A clean checkout renders the shell and passes baseline checks
without a connected mailbox.

**Depends on:** Item 1.

Full card: [Bootstrap the application](02-bootstrap-local-first-application.md).

## 3. Implement the local database and repositories

- [ ] Define versioned storage for applications, CV versions, relevant messages,
      and workspace/sync metadata with stable IDs.
- [ ] Validate records, dates, references, and provider identifiers at write boundaries.
- [ ] Support one CV version linked to multiple applications.
- [ ] Make related writes transactional and handle unavailable storage, quota
      failures, and migrations without clearing existing records.
- [ ] Test create/reopen behavior, reference integrity, and rollback on failed writes.

**Done when:** Valid records and file bytes persist across reload, invalid writes
are rejected, and failed operations preserve existing data.

**Depends on:** Item 2.

## 4. Build the CV version library

- [ ] Upload PDF/DOCX files up to 10 MiB with validated metadata and bytes.
- [ ] Create a separate version for every upload, including repeated filenames.
- [ ] List versions with editable labels and upload dates; download original bytes.
- [ ] Allow uploads without an application or email connection.
- [ ] Confirm deletion and clear affected application links without deleting applications.
- [ ] Cover invalid files, failed writes, multiple versions, and byte round-trips.

**Done when:** Users can retain, identify, download, and remove CV versions independently.

**Depends on:** Item 3.

## 5. Connect and disconnect Gmail

- [ ] Implement Google Identity Services and Gmail read access per the tech stack.
- [ ] Show disconnected, connecting, connected, expired, and error states.
- [ ] Require user-triggered reconnection after reload or token expiry.
- [ ] Disconnect, clear in-memory authorization, and attempt revocation while
      retaining local records; distinguish failed revocation from success.
- [ ] Verify access tokens are never persisted or logged and only the public
      client ID is included in build configuration.

**Done when:** A real account can authorize and disconnect, and authorization
failures preserve the local workspace.

**Depends on:** Items 1–3.

## 6. Sync application information and replies

- [ ] Retrieve relevant Gmail messages on **Sync now** within the agreed import window.
- [ ] Identify company, role, submission date, and replies when supported by evidence.
- [ ] Deduplicate by provider/account identifiers and associate replies with
      applications without merging solely on company name.
- [ ] Keep uncertain matches and fields available for review; exclude unresolved
      candidates from application counts.
- [ ] Persist progress safely, preserve user corrections, and support repeated sync.
- [ ] Show last successful sync and useful retry, provider-limit, and partial-failure states.
- [ ] Test duplicate messages, multiple roles at one company, missing fields,
      interrupted sync, and replay of already processed messages.

**Done when:** A real sync populates applications and replies; retries do not
inflate counts, erase corrections, or lose previously stored data.

**Depends on:** Items 3 and 5.

## 7. Build application review and CV associations

- [ ] List company, role, submission date, status, and latest reply information.
- [ ] Show safely rendered reply details in an application detail panel.
- [ ] Allow correction of extracted fields, status, and message associations.
- [ ] Select or change the CV version used, without modifying the file itself.
- [ ] Confirm application deletion, retain CV versions, and prevent silent
      reimport of deleted applications through sync exclusions.
- [ ] Add loading, empty, populated, review-needed, and recoverable error states.

**Done when:** Users can review correspondence, correct the record, and identify
the CV used; deletion does not remove CVs or mailbox messages.

**Depends on:** Items 4 and 6.

## 8. Build total and daily application statistics

- [ ] Derive total applications from confirmed application records.
- [ ] Group by submission date using consistent calendar-day rules; show
      zero-activity days and report undated applications separately.
- [ ] Show current-status cards and an accessible daily table; counts sum to the total.
- [ ] Update metrics after sync, date corrections, status changes, and deletion.
- [ ] Test multiple replies per application, unknown dates, day boundaries, and
      status changes that preserve total and daily counts.

**Done when:** Total, daily, and status statistics remain accurate after reload
and repeated sync, with accessible empty and error states.

**Depends on:** Items 3 and 7.

## 9. Verify the complete journey and configure CI

- [ ] Run formatting, lint, type checks, unit/component tests, and builds in CI.
- [ ] Use deterministic provider fixtures in automated email integration tests.
- [ ] Exercise upload of two CV versions, email connection/sync, reply review,
      selection of the CV used, dashboard verification, and reload persistence.
- [ ] Cover denied/expired authorization, sync retries, and storage failures.
- [ ] Check keyboard navigation, labels, focus, mobile layouts, and hash-route reloads.

**Done when:** CI passes and regression coverage proves the complete v1 journey
and preservation of existing data during failures.

**Depends on:** Items 4–8. CI setup can begin after item 2.

## 10. Deploy and document v1

- [ ] Configure GitHub Actions to check and build with npm, then publish `dist/`
      to GitHub Pages from the default branch after checks pass.
- [ ] Configure the `/roleward/` base and public Google client ID; authorize the
      production JavaScript origin in Google Cloud.
- [ ] Verify direct hash URLs, refresh, and asset loading on the Pages site.
- [ ] Verify the complete journey with a real authorized mailbox.
- [ ] Document Google setup, applicable verification requirements, sync limits,
      disconnect behavior, and local data storage and loss limitations.
- [ ] Confirm CV files remain local and different browser workspaces are independent.

**Done when:** The GitHub Pages site supports CV versions, real Gmail tracking, and
statistics, with reproducible setup instructions.

**Depends on:** Item 9.

## Deferred

Search and a job match calculator are possible later additions. The old search,
role-filter, saved-job, cover-letter, sample-workspace, and full-backup tasks are
not prerequisites for v1.
