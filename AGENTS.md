# Agent instructions

These instructions apply throughout the Roleward repository.

## Required commit workflow

- Split every task that changes the repository across several small, focused
  commits. Do not deliver an entire task as one large commit.
- Plan the commit boundaries before editing. Group changes by a coherent purpose,
  such as contracts, implementation, regression coverage, or documentation.
- Create the commits as each part is completed and validated; a proposed commit
  plan alone does not satisfy this requirement.
- Keep each commit reviewable and internally consistent. Avoid empty commits,
  unrelated changes, or intentionally broken intermediate states.
- Inspect the working tree first and stage only changes belonging to the task.
  Preserve unrelated user work and never include it just to clean the working tree.
- Use descriptive commit messages that explain the change. Preserve the separate
  commits unless the user explicitly requests squashing or a different workflow.
- Keep commits local unless the user also requests a push or publication.

## Project context

- Read [README.md](README.md), the [product contract](docs/product-contract.md),
  and the [tech stack](docs/tech-stack.md) before changing product behavior.
- Keep v1 focused on local CV versions, email-connected application tracking,
  and application statistics. Search and job matching are deferred.
- Use the existing React, TypeScript, and Vite stack. Preserve GitHub Pages
  compatibility, hash routing, and the `/roleward/` asset base.
- Keep application data and CV files in IndexedDB through Dexie. Validate writes
  through repositories and use transactions for related changes.
- Keep Gmail and Outlook access read-only and tokens in memory. Never commit credentials,
  personal CVs, mailbox contents, or local environment files. The OAuth client ID
  is public configuration.
- Preserve CV versions independently of applications. Repeated email syncs must
  preserve corrections and avoid duplicate applications or replies.
- Derive statistics from confirmed applications; exclude unreviewed email
  candidates and report unknown submission dates separately.
- Keep setup instructions and implementation-status documentation accurate when
  behavior changes. Distinguish fixture-tested functionality from live Gmail/Outlook or
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
