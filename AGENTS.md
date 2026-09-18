# Agent instructions

These instructions apply throughout the Roleward repository.

## Project context

- Read [README.md](README.md), the [product contract](docs/product-contract.md),
  and the [tech stack](docs/tech-stack.md) before changing product behavior.
- Keep v1 focused on local CV versions, email-connected application tracking,
  and application statistics. Search and job matching are deferred.
- Use the existing React, TypeScript, and Vite stack. Preserve GitHub Pages
  compatibility, hash routing, and the `/roleward/` asset base.
- Keep application data and CV files in IndexedDB through Dexie. Validate writes
  through repositories and use transactions for related changes.
- Keep Gmail access read-only and tokens in memory. Never commit credentials,
  personal CVs, mailbox contents, or local environment files. The OAuth client ID
  is public configuration.
- Preserve CV versions independently of applications. Repeated email syncs must
  preserve corrections and avoid duplicate applications or replies.
- Derive statistics from confirmed applications; exclude unreviewed email
  candidates and report unknown submission dates separately.
- Keep setup instructions and implementation-status documentation accurate when
  behavior changes. Distinguish fixture-tested functionality from live Gmail or
  deployment verification.

## Validation

- Use the Node.js version in `.nvmrc`, npm, and the committed lockfile.
- For application changes, run `npm run format:check`, `npm run lint`,
  `npm run typecheck`, `npm test`, and `npm run build`.
- Run `npm run test:e2e` for changes to user journeys, routing, browser storage,
  or email integration. Use fixtures rather than a real mailbox in automated tests.
- For documentation-only tasks, check formatting, links, and `git diff --check`;
  application tests are unnecessary unless behavior also changes.
- Add meaningful regression coverage for changed behavior, especially persistence,
  deduplication, counting rules, and preservation of data after failed operations.
- Report checks performed and any remaining limitations in the final response.
