import Dexie, { type Table } from 'dexie';
import type {
  Application,
  Cv,
  Message,
  Source,
  Setting,
} from '../domain/models';
export const LOCAL_DATABASE_SCHEMA = {
  applications: 'id, appliedAt, updatedAt',
  cvs: 'id, uploadedAt',
  messages: 'id, applicationId',
  sources: 'id, applicationId',
  settings: 'key',
} as const;
export class RolewardDatabase extends Dexie {
  applications!: Table<Application>;
  cvs!: Table<Cv>;
  messages!: Table<Message>;
  sources!: Table<Source>;
  settings!: Table<Setting>;
  constructor(name = 'roleward') {
    super(name);
    this.version(1).stores(LOCAL_DATABASE_SCHEMA);
    this.version(2)
      .stores(LOCAL_DATABASE_SCHEMA)
      .upgrade(async (tx) => {
        const messages = await tx.table('messages').toArray();
        const sources = await tx.table('sources').toArray();
        await tx.table('messages').clear();
        await tx.table('sources').clear();
        await tx.table('messages').bulkPut(
          messages.map((message) => ({
            ...message,
            id: `gmail:${message.id}`,
            provider: 'gmail',
          })),
        );
        await tx
          .table('sources')
          .bulkPut(
            sources.map((source) => ({ ...source, id: `gmail:${source.id}` })),
          );
        // Never auto-edit existing confirmed applications, including manual corrections.
        await tx
          .table('applications')
          .toCollection()
          .modify((app) => {
            app.emailManaged = !app.confirmed;
          });
      });
  }
}
export const db = new RolewardDatabase();
