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
  }
}
export const db = new RolewardDatabase();
