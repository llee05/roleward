export const LOCAL_PERSISTENCE = {
  engine: "indexeddb",
  library: "dexie",
  databaseName: "roleward",
  version: 1,
} as const;

/**
 * Dexie schema declarations list primary keys and indexes, not every stored field.
 * Document records may contain a `Blob`, but binary content must never be indexed.
 */
export const LOCAL_DATABASE_SCHEMA = {
  jobs: "id, title, company, roleLevel, source, createdAt",
  applications: "id, &jobId, status, appliedAt, updatedAt",
  documents: "id, applicationId, kind, uploadedAt",
  settings: "key",
} as const;

export type LocalDatabaseTable = keyof typeof LOCAL_DATABASE_SCHEMA;

export const BROWSER_STORAGE_POLICY = {
  domainData: "indexeddb",
  preferences: "localStorage",
} as const;
