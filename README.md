# Roleward

Roleward is a personal job-search workspace for finding roles, managing application
documents, tracking applications, and measuring progress.

## Local-first architecture

Milestone 1 keeps jobs, applications, settings, and document files in IndexedDB
through Dexie. There are no accounts, server database, cloud sync, or automatic
cloud backup. Small, non-sensitive UI preferences may use `localStorage`; domain
data and document blobs do not.

Data belongs to one browser profile and exact site origin. Sharing a deployed URL
lets another person create a fresh or sample workspace in their own browser; it
does not expose or copy the owner's records. Clearing site data or losing that
browser profile can remove the workspace, so the product contract requires a
versioned full-workspace export and restore flow.

The application has not been bootstrapped yet. The current repository defines the
Milestone 1 product, domain, route, and persistence contracts that implementation
will follow.

## Roadmap

- [Milestone 1: Search, track, and measure](docs/milestones/01-search-track-measure.md)
- [Milestone 1 product contract](docs/product-contract.md)
