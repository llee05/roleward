export const LOCAL_DATABASE_VERSION = 1 as const;

export const LOCAL_PERSISTENCE = {
  engine: "indexeddb",
  library: "dexie",
  databaseName: "roleward",
  version: LOCAL_DATABASE_VERSION,
} as const;

/**
 * Dexie schema declarations list primary keys and indexes, not every stored field.
 * Document records may contain a `Blob`, but binary content must never be indexed.
 * IndexedDB does not enforce foreign keys or application-level invariants, so
 * repository writes/imports validate those and use transactions where needed.
 * The unique `&jobId` index enforces one application per local job.
 *
 * Job title/company substring search scans the small local result set; declaring
 * a Dexie index would not by itself provide that search behavior.
 */
export const LOCAL_DATABASE_SCHEMA = {
  jobs: "id, roleLevel, source, createdAt",
  applications: "id, &jobId, status, appliedAt, updatedAt",
  documents: "id, applicationId, kind, uploadedAt",
  settings: "key",
} as const;

export type LocalDatabaseTable = keyof typeof LOCAL_DATABASE_SCHEMA;

export const BROWSER_STORAGE_POLICY = {
  domainData: "indexeddb",
  preferences: "localStorage",
} as const;

/** Version of the deterministic sample copied into a new sample workspace. */
export const SAMPLE_DATA_VERSION = 1 as const;

export const LOCAL_BACKUP_FORMAT = {
  name: "roleward-backup",
  version: 1,
  fileExtension: ".roleward-backup.json",
} as const;
