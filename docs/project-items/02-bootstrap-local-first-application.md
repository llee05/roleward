# GitHub Project item: Bootstrap the local-first application

## Project placement

- **Title:** `[M1] Bootstrap the local-first Roleward application`
- **Initial view:** Backlog
- **Move to Development when:** implementation starts

The project uses only two views. **Backlog** contains work that has not started;
**Development** contains active work. Close the issue when its acceptance criteria
are complete, so a separate completed view is unnecessary.

## Summary

Bootstrap the Next.js application and its quality tooling so the next delivery
step can implement Roleward's IndexedDB/Dexie repositories. Create the application
shell and placeholder routes from the product contract, but do not implement job,
application, document, dashboard, or database behavior yet.

This issue follows the [Milestone 1 product contract](../product-contract.md) and
[delivery plan](../milestones/01-search-track-measure.md).

## Why

The product and persistence contracts are complete, but the repository does not
yet contain a runnable application. Establishing the framework, scripts, browser
data boundary, and test harness first gives later Dexie and feature work a stable
foundation.

## Scope

- [ ] Scaffold a Next.js App Router application with strict TypeScript.
- [ ] Configure Tailwind CSS and shadcn/ui.
- [ ] Add runtime dependencies:
  - [ ] `dexie`
  - [ ] `dexie-react-hooks`
  - [ ] `dexie-export-import`
  - [ ] `zod`
  - [ ] `react-hook-form`
  - [ ] `recharts`
- [ ] Configure ESLint and formatting.
- [ ] Configure Vitest, React Testing Library, and `fake-indexeddb`.
- [ ] Configure Playwright with one application smoke test.
- [ ] Add documented scripts for development, linting, formatting checks,
      type-checking, unit tests, end-to-end tests, and production builds.
- [ ] Add a responsive application shell with navigation for:
  - [ ] `/`
  - [ ] `/jobs`
  - [ ] `/applications`
  - [ ] `/documents`
  - [ ] `/dashboard`
  - [ ] `/settings`
- [ ] Add placeholder pages for every route above and `/jobs/[id]`.
- [ ] Establish a client-only boundary for future IndexedDB-backed content.
      Server-rendered code must not import or open Dexie.
- [ ] Reuse the existing route, domain, and persistence constants instead of
      duplicating their values.
- [ ] Document the selected package manager and local development commands.

## Out of scope

- Opening the IndexedDB database or implementing Dexie repositories
- Database migrations, sample data, backup/import, or reset behavior
- Job capture, search, and filtering
- Application tracking and metrics
- Document upload or Blob persistence
- Authentication, Supabase, cloud storage, or synchronization
- PWA installation or offline application-shell caching

## Acceptance criteria

- [ ] A clean checkout can install dependencies with the documented package
      manager.
- [ ] The development server starts without backend credentials or an `.env` file.
- [ ] Every contracted route renders inside the responsive application shell.
- [ ] Navigation works with keyboard input and exposes a visible current-page state.
- [ ] No server component imports Dexie or reads browser storage.
- [ ] One unit/component smoke test and one Playwright smoke test pass.
- [ ] Lint, formatting check, type-check, unit test, end-to-end test, and production
      build commands are documented and pass.
- [ ] The implementation introduces no Supabase, authentication, cloud database,
      or cloud-storage dependency.

## Suggested commit breakdown

1. `chore(app): bootstrap Next.js and local-first dependencies`
2. `feat(shell): add milestone routes and responsive navigation`
3. `test(app): configure baseline unit and browser checks`
4. `docs(setup): document local development commands`

## Dependencies

- Product contract: complete
- Route contract: complete
- IndexedDB/Dexie persistence contract: complete

## Done when

A clean checkout is a runnable, testable application shell that is ready for the
versioned Dexie database foundation, without prematurely implementing Milestone 1
feature behavior.
