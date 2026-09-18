# Roleward

Roleward is a web app for tracking your job search: keep versions of your CV,
bring application information together from your email, and see your progress.

## V1

- **CV versions:** Upload and store multiple versions of your CV in a local
  database. Keep earlier versions and record which version you used for an
  application.
- **Email-connected application tracking:** Connect your email through a provider
  API to display application details such as company, role, application date,
  and replies in one place.
- **Statistics:** See your total applications, applications per day, and a simple
  breakdown of application statuses.

V1 focuses on these three features. Search and a job match calculator are possible
future additions, not requirements for the first release.

## Tech stack and hosting

Roleward will be a static website hosted on **GitHub Pages**, built with:

- **React, TypeScript, and Vite** for the application and static build.
- **React Router with hash routing** for navigation on GitHub Pages.
- **Tailwind CSS and shadcn/ui** for the interface.
- **IndexedDB, Dexie, and dexie-react-hooks** for local CV files and application data.
- **React Hook Form and Zod** for forms and validation.
- **Gmail API and Google Identity Services** for browser-based email access.
- **Vitest, React Testing Library, and Playwright** for testing; **GitHub Actions**
  for checks and deployment.

See the [tech stack and architecture](docs/tech-stack.md) for deployment, routing,
email configuration, and testing decisions.

## Storage and email integration

CV files and tracked data stay in the browser's local database. Clearing site
data can remove them; there is no automatic backup or cross-device access.
GitHub hosts the website's built files, not your CVs or synced messages.

Gmail is the initial email provider. Connection uses Google's authorization flow,
and sync runs while the website is open. Reloading or an expired session requires
reconnecting before another sync. No application backend is planned. The OAuth
client must be configured separately, and broader public Gmail access may require
Google verification; see the [email integration design](docs/tech-stack.md#gmail-integration).

## Run the prototype

Use Node.js 24 LTS (see `.nvmrc`) and npm:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/roleward/`. The workspace starts empty. Upload a CV,
add an application, choose the version used, and visit Overview to see statistics.
Data persists when you reload in the same browser. No Gmail setup is needed for
these local features.

## Optional Gmail setup

Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID` to your public
Google OAuth web client ID. Enable Gmail API in your Google Cloud project,
configure the consent screen and test user, and authorize `http://localhost:5173`
and your deployed origin. Restart Vite after changing configuration. Never add a
client secret. See the [integration design](docs/tech-stack.md#gmail-integration).

In Workspace, choose **Connect Gmail**, then **Sync now**. New threads appear in
**Applications → Email review**. Confirm an application or move its emails to an
existing one. Company, role, and submission date are entered during review;
the prototype deliberately does not infer these from email wording. Only confirmed
applications count toward statistics.

Discovery checks up to 100 threads from the last 180 days matching application,
interview, job-offer, or candidacy keywords. Previously tracked threads are also
refreshed. Keyword discovery can miss emails; this is not a complete mailbox
import. Sync is read-only and runs while the site is open. Reconnect after reload
or token expiry.

## Checks and production build

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

`npm run format` formats the repository. For a locally installed Chromium, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when running browser tests. Automated Gmail
tests use fixtures and never access a real mailbox.

## GitHub Pages

The included GitHub Actions workflow checks the app and publishes `dist/` after
successful pushes to `main`. Enable **Settings → Pages → Source: GitHub Actions**
and set the repository variable `VITE_GOOGLE_CLIENT_ID` if using Gmail. Authorize
`https://llee05.github.io` in Google Cloud. The project URL is
`https://llee05.github.io/roleward/`; hash routes preserve direct navigation and
reload. For a custom domain, change Vite's base and the authorized origin.

The prototype and workflow are implemented locally; deployment and a real Gmail
account still need external configuration and verification. Backup/restore,
automatic field extraction, search, and job matching are not implemented.

- [V1 product contract](docs/product-contract.md)
- [Tech stack](docs/tech-stack.md)
- [Milestone 1 delivery plan](docs/milestones/01-search-track-measure.md)
- [Milestone 1 backlog](docs/project-items/milestone-1-backlog.md)
- [Bootstrap the application](docs/project-items/02-bootstrap-local-first-application.md)
