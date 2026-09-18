# Tech stack and GitHub Pages architecture

Roleward v1 is a static single-page website hosted on GitHub Pages. Application
logic runs in the browser; GitHub serves the built files. There is no application
server, hosted database, or scheduled mailbox worker. GitHub Pages supports this
static delivery model. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## Selected stack

| Area                 | Choice                                                          | Purpose                                                                                 |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| UI                   | React with strict TypeScript                                    | Components and typed application logic.                                                 |
| Build tooling        | Vite with the React plugin                                      | Local development and a static production build.                                        |
| Routing              | React Router `HashRouter`                                       | Navigation that survives direct links and refresh on Pages.                             |
| Styling              | Tailwind CSS and shadcn/ui                                      | Responsive styling and reusable accessible controls.                                    |
| Local database       | IndexedDB through Dexie                                         | Application records, messages, CV metadata, and file `Blob` values.                     |
| Reactive data        | `dexie-react-hooks`                                             | Update views when local records change.                                                 |
| Forms and validation | React Hook Form, Zod, and `@hookform/resolvers`                 | Forms and shared validation at storage boundaries.                                      |
| Email                | Gmail/GIS and Microsoft Graph/MSAL with browser `fetch`         | User-authorized read access without a backend.                                          |
| Statistics           | TypeScript aggregation functions, cards, and an HTML table      | Total, daily, and status counts without a chart dependency.                             |
| Tests                | Vitest, React Testing Library, `fake-indexeddb`, and Playwright | Domain, component, storage, and browser coverage.                                       |
| Quality              | ESLint, Prettier, and TypeScript checks                         | Consistent code and static checks.                                                      |
| Build environment    | Node.js LTS and npm                                             | Local tools and CI; commit `package-lock.json` and pin the chosen runtime at bootstrap. |
| Hosting and delivery | GitHub Pages and GitHub Actions                                 | Check, build, and publish the static `dist/` artifact.                                  |

The initial prototype implements this stack. React state handles transient UI
state; Dexie is the durable source of truth. The dashboard includes a small CSS
bar visualization with an equivalent daily HTML table; no chart library is used.
The reusable button and dialog components follow the shadcn/ui composition pattern
with Radix primitives. Node.js 24 is pinned in `.nvmrc`.

## Routing and deployment

Use logical route paths `/`, `/documents`, `/applications`, `/dashboard`, and
`/settings` inside `HashRouter`. A project-site URL will look like
`https://<owner>.github.io/roleward/#/applications`. The hash stays in the browser,
so Pages only needs to serve the site entry point. [React Router documentation](https://reactrouter.com/api/declarative-routers/HashRouter).

Set Vite's `base` to `/roleward/` for this repository's project site; use `/` for a
root site or custom domain. Build to `dist/` and publish that artifact through
GitHub Actions with Pages as the repository's publishing source. Use Vite's base
URL for public assets. [Vite deployment guide](https://vite.dev/guide/static-deploy.html#github-pages).

Pull requests run checks and build without live mailbox access. Deployment runs
after checks on the default branch, using the `github-pages` environment and the
required Pages/OIDC permissions. Test direct hash links, reload, and assets beneath
the repository path before release. GitHub Actions does not sync user mailboxes.

## Local data

Store CV bytes, version metadata, confirmed applications, relevant messages, and
sync metadata in the browser's `roleward` database. Validate repository writes and
use transactions for related changes. CV upload means copying a file into that
database; personal files and messages never enter the Git repository or deployment
artifact. No cloud database or object-storage service is needed.

Browser storage belongs to an origin and profile, not a repository URL path. Other
Pages projects under the same `<owner>.github.io` hostname share that origin; a
path or database name is not an isolation boundary. Moving to a different origin
creates a separate workspace. Clearing browser data can remove the stored files
and records. V1 does not promise backup, cross-device sync, or offline site loading.

## Gmail integration

Gmail is supported alongside Outlook. Configure a Google Cloud project with the Gmail API enabled,
an OAuth consent screen, and a web client ID. Register production and local
JavaScript origins (scheme, host, and port; no repository path or hash).
[Google client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid),
[Gmail browser quickstart](https://developers.google.com/workspace/gmail/api/quickstart/js).

Use the Google Identity Services token client popup from **Connect Gmail** or
**Reconnect**. Call Gmail REST endpoints directly using `fetch`. Keep the access
token in memory only; do not persist it in IndexedDB, browser storage, URLs, or
logs. No client secret or refresh token is used. After reload or expiry, request
access again from a user action. **Update** operates only while the website is
open. [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

Request `https://www.googleapis.com/auth/gmail.readonly` to read message content;
do not request send or modify permissions. This is a restricted scope, and its
access covers the mailbox even though Roleward imports only relevant
correspondence. Metadata-only access cannot read reply bodies.
[Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes).

Start with the owner's account as an explicitly configured test user. Personal or
testing use can qualify for verification exceptions; general public email access
requires checking and satisfying Google's applicable verification requirements.
Publishing the static site alone does not authorize arbitrary Gmail accounts.
[Google verification requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

On disconnect, stop sync and clear the in-memory token. Attempt grant revocation
when possible; if it fails or no usable token remains, explain how to remove access
in Google Account settings. Keep local records. Do not claim remote access was
revoked unless confirmed. Revocation is supported by the
[Google token API](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

## Outlook integration

Use `@azure/msal-browser` with a Microsoft Entra app registration supporting
**Accounts in any organizational directory and personal Microsoft accounts**.
Set its Application (client) ID as `VITE_MICROSOFT_CLIENT_ID`. Use the `common`
authority and delegated Microsoft Graph `User.Read` and `Mail.Read` permissions.
The profile endpoint identifies the signed-in mailbox; mail access is read-only.
Tenant policy may require administrator consent.

Register these exact redirect URLs under **Single-page application**:

- Local: `http://localhost:5173/roleward/outlook-redirect.html`
- Pages: `https://llee05.github.io/roleward/outlook-redirect.html`

MSAL uses a popup and authorization code flow with PKCE. No client secret or
implicit-grant setting is needed. MSAL 5's redirect bridge is a separate static
HTML entry (`outlook-redirect.html`), included by Vite in `dist/`. It does not load
the app router. Adjust the registered URL for a different host, port, or asset base.
[MSAL initialization](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization),
[redirect bridge](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge).

Use MSAL `MemoryStorage` for authorization caches; access/refresh tokens are never
written into app storage. Reconnect after reload or token expiry. Disconnect
clears the local cache and token, retaining application records. It does not revoke
Microsoft consent or sign out the user's Microsoft session. Remove consent in the
Microsoft account's app permissions if desired.
[MSAL caching](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching).

Read `/me/messages` with a received-date filter, selected fields, and all
`@odata.nextLink` pages. Request immutable IDs and text bodies. Validate pagination
origins before sending a token; never follow an arbitrary host from a response.
[Graph messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0),
[immutable IDs](https://learn.microsoft.com/en-us/graph/outlook-immutable-id).

## Email Update pipeline

`src/features/email/update.ts` runs when **Update** is clicked in Workspace or
Applications. It scans one connected account per provider sequentially, using a
shared window from local midnight three calendar months ago (clamped at month end)
through the start of the update. It runs only while the page remains open.

Gmail lists all messages in the window using `messages.list` and fetches each
message in full, following every page token. Gmail's default spam/trash exclusions
apply, and drafts are excluded. Outlook follows every message page under the same
window. There is no 100-message cap or keyword prefilter. Dates are checked again
locally. Attachments are not downloaded. HTML bodies are converted to inert plain
text and message text is capped at 30,000 characters.
[Gmail message listing](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).

A deterministic English classifier detects receipt phrases with job evidence,
extracts company and role from known patterns, and parses explicitly labelled
submission dates. Clear receipts with a company create confirmed applications.
Otherwise relevant correspondence creates unconfirmed review items. Missing fields
stay blank; unrelated bodies are not saved or sent to any external AI service.
Outgoing emails cannot create applications. The parser can miss unusual templates,
non-English messages, or misidentify fields; it does not infer interview/rejection
status automatically.

When a receipt has no explicit submission date, use its received calendar day as
a labelled estimate. The earliest receipt estimate is preferred; later explicit evidence may refine it
until the user edits the record. Other replies retain an unknown submission date. Users can
correct dates, company, role, status, notes, and CV associations. These edits
prevent later extraction from overwriting their application record.

Each email is persisted in a transaction with its application and source mapping.
Provider + account + message IDs deduplicate replies; provider + account +
conversation IDs associate applications. Generic replies encountered before a
receipt are fetched again if the scan establishes a matching application. Different
conversations are never merged on company name alone; users can merge them.
Deleted applications retain exclusion mappings. Version 2 migrates old Gmail
identifiers without losing CV bytes, user corrections, or deletion exclusions.

Show progress, cancellation, and completion counts. Successful update times are
stored per provider/account. Timeout, denied access, cancellation, or storage
failure retains earlier committed imports and does not mark the failing mailbox
as successfully updated. Rate-limit/service-unavailable responses receive bounded
retries; expired sessions require reconnecting. A provider failure does not stop
the other connected mailbox. Repeating an update safely retries the date window.

## Public configuration

Use `VITE_GOOGLE_CLIENT_ID` and `VITE_MICROSOFT_CLIENT_ID` for public OAuth client
identifiers. Supply them via
an ignored local environment file and a GitHub Actions repository variable for
the production build. A missing ID disables email connection with setup guidance;
the local CV library and existing data still work.

Every `VITE_*` value is exposed in the built site. Never place client secrets,
mailbox tokens, or personal data in these variables. An OAuth client ID identifies
the app and is intentionally public. [Vite environment variables](https://vite.dev/guide/env-and-mode),
[Google client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).

## Prototype status

The repository includes the runnable app, npm lockfile, local storage repositories,
Gmail and Outlook adapters, automatic extraction, validation, unit/component tests, desktop/mobile browser tests,
and a GitHub Actions Pages workflow. See [README commands](../README.md#run-the-prototype).

The prototype adds manual application entry so the tracker is useful without a
configured mailbox. CV versioning, download, application editing, email review,
merging, and metrics work locally. Real Google/Microsoft authorization and deployment still
need external configuration; fixture tests do not establish real-provider readiness.
