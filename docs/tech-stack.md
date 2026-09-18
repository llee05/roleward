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
| Email                | Gmail API, Google Identity Services, and browser `fetch`        | User-authorized read access without a backend.                                          |
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

Gmail is the first provider selected for v1. Outlook and other providers are
future additions. Configure a Google Cloud project with the Gmail API enabled,
an OAuth consent screen, and a web client ID. Register production and local
JavaScript origins (scheme, host, and port; no repository path or hash).
[Google client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid),
[Gmail browser quickstart](https://developers.google.com/workspace/gmail/api/quickstart/js).

Use the Google Identity Services token client popup from **Connect Gmail** or
**Reconnect**. Call Gmail REST endpoints directly using `fetch`. Keep the access
token in memory only; do not persist it in IndexedDB, browser storage, URLs, or
logs. No client secret or refresh token is used. After reload or expiry, request
access again from a user action. **Sync now** operates only while the website is
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

The prototype discovers up to 100 matching threads from the last 180 days, then
refreshes previously tracked threads. Each new thread is a review candidate;
company, role, and submission date are manually confirmed. Threads can be merged
into existing applications, and later syncs retain those associations. Automatic
field extraction is future implementation work. Plain text (or a message snippet)
is shown without rendering email HTML. No hosted AI service is used.

On disconnect, stop sync and clear the in-memory token. Attempt grant revocation
when possible; if it fails or no usable token remains, explain how to remove access
in Google Account settings. Keep local records. Do not claim remote access was
revoked unless confirmed. Revocation is supported by the
[Google token API](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

## Public configuration

Use `VITE_GOOGLE_CLIENT_ID` for the public OAuth client identifier. Supply it via
an ignored local environment file and a GitHub Actions repository variable for
the production build. A missing ID disables email connection with setup guidance;
the local CV library and existing data still work.

Every `VITE_*` value is exposed in the built site. Never place client secrets,
mailbox tokens, or personal data in these variables. An OAuth client ID identifies
the app and is intentionally public. [Vite environment variables](https://vite.dev/guide/env-and-mode),
[Google client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).

## Prototype status

The repository includes the runnable app, npm lockfile, local storage repositories,
Gmail adapter, validation, unit/component tests, desktop/mobile browser tests,
and a GitHub Actions Pages workflow. See [README commands](../README.md#run-the-prototype).

The prototype adds manual application entry so the tracker is useful without a
configured mailbox. CV versioning, download, application editing, email review,
merging, and metrics work locally. Real Google authorization and deployment still
need external configuration; fixture tests do not establish real-provider readiness.
