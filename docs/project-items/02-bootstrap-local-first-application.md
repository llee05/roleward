# Project item: Bootstrap the Roleward web app

## Project placement

- **Title:** `[M1] Bootstrap the Roleward web app`
- **Initial view:** Backlog
- **Move to Development when:** implementation starts
- **Close when:** the acceptance criteria below are complete

## Implementation status

Implemented and validated locally in the initial prototype. The scope and
acceptance criteria below are satisfied by the scaffold, production build, and
unit/browser checks. The prototype also implements the first local features and
Gmail review flow; a live mailbox and GitHub Pages deployment still need external
configuration. See the [README](../../README.md) to run it.

## Summary

Bootstrap the web app and quality tooling for a job-search tracker with local CV
versions, email-connected application information, and statistics. Create the shell
and placeholder pages without implementing those features in this item.

Follow the [v1 product contract](../product-contract.md),
[tech stack](../tech-stack.md), and
[delivery plan](../milestones/01-search-track-measure.md). The initial prototype now provides this scaffold and aligns the route, domain,
and storage declarations. Live Gmail and Pages configuration remain external setup.

## Scope

- [x] Scaffold a React and Vite single-page website with strict TypeScript.
- [x] Configure Tailwind CSS and shadcn/ui.
- [x] Add React Router, Dexie, `dexie-react-hooks`, Zod, React Hook Form, and
      `@hookform/resolvers`.
- [x] Configure ESLint, formatting, Vitest, React Testing Library, and `fake-indexeddb`.
- [x] Configure Playwright with an application smoke test.
- [x] Document scripts for development, formatting checks, linting, type checking,
      unit tests, end-to-end tests, and production builds.
- [x] Add a responsive shell with navigation and placeholders for `/`,
      `/documents` (CV versions), `/applications`, `/dashboard`, and `/settings`.
- [x] Use `HashRouter` for logical routes and Vite `base: "/roleward/"` for the
      GitHub Pages project path; build the static site into `dist/`.
- [x] Keep local repositories separate from the future browser Gmail adapter.
- [x] Document public `VITE_GOOGLE_CLIENT_ID` configuration and the unconfigured
      state; no email credentials are required to run the shell.
- [x] Reuse the revised route/domain declarations; omit the old jobs routes.
- [x] Use npm, commit `package-lock.json`, and pin a supported Node.js LTS runtime.

## Out of scope for this item

- Database repositories, migrations, and file persistence
- CV uploads and version associations
- Real email authorization, sync, and message matching
- Application editing and statistics
- Search or a job match calculator

Email authorization and sync are out of scope for this bootstrap item only; they
remain required for v1 through the browser Gmail integration. The deployed
website has no application backend.

## Acceptance criteria

- [x] A clean checkout installs and starts using the documented commands.
- [x] The unconnected shell runs without a Google client ID or mailbox authorization.
- [x] Every contracted page renders within the responsive shell.
- [x] Navigation works with keyboard input and indicates the current page.
- [x] The production build contains static files and requires no server runtime.
- [x] Direct hash links and refresh work under `/roleward/` with assets loading.
- [x] Build configuration contains no secrets; the OAuth client ID is public.
- [x] Unit/component and Playwright smoke tests pass.
- [x] Formatting, lint, type-check, test, and build commands are documented and pass.

## Dependencies

- Revised product contract: documented
- Route, domain, and persistence declarations: aligned in the prototype
- Architecture: React/Vite on GitHub Pages, with local data and browser Gmail access
- Google setup: needed for real integration later; the shell needs no live account

## Done when

A clean checkout provides a runnable, testable static shell ready for local CV versions,
email-connected tracking, and statistics.
