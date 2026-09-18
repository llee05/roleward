import Dexie from 'dexie';
import { afterEach, expect, it } from 'vitest';
import { db, RolewardDatabase, LOCAL_DATABASE_SCHEMA } from './local-database';
import { ingestEmail, removeApplication, saveApplication } from './repository';
import { extractApplication } from '../features/email/extract';
import type { Email } from '../domain/email';
const email: Email = {
  provider: 'gmail',
  account: 'me@example.com',
  id: '1',
  threadId: 't',
  sender: 'Acme',
  subject: 'Thanks for applying to Acme',
  text: 'We received your application for the Designer role.',
  receivedAt: '2026-09-15T12:00:00Z',
  outgoing: false,
};
afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});
it('adds clear applications automatically, separates providers, and deduplicates repeat scans', async () => {
  const extracted = extractApplication(email);
  await ingestEmail(email, extracted);
  await ingestEmail(email, extracted);
  await ingestEmail({ ...email, provider: 'outlook' }, extracted);
  expect(await db.applications.count()).toBe(2);
  expect(await db.messages.count()).toBe(2);
  expect(
    (await db.applications.toArray()).every(
      (a) => a.confirmed && a.company === 'Acme',
    ),
  ).toBe(true);
});
it('preserves user corrections and deletion exclusions across scans', async () => {
  await ingestEmail(email, extractApplication(email));
  const app = (await db.applications.toArray())[0];
  await saveApplication(
    { ...app, appliedAt: '', company: 'Corrected' },
    app.id,
  );
  await ingestEmail(email, extractApplication(email));
  expect(await db.applications.get(app.id)).toMatchObject({
    company: 'Corrected',
    appliedAt: null,
  });
  await removeApplication(app.id);
  await ingestEmail(email, extractApplication(email));
  expect(await db.applications.count()).toBe(0);
  expect(await db.messages.count()).toBe(0);
});
it('ignores unrelated mail and enriches unreviewed follow-ups when a receipt arrives', async () => {
  expect(await ingestEmail(email, null)).toBe('ignored');
  const reply = {
    ...email,
    id: 'reply',
    subject: 'Interview invitation',
    text: 'Your application for the Designer role at Acme has progressed.',
  };
  await ingestEmail(reply, extractApplication(reply));
  expect((await db.applications.toArray())[0]).toMatchObject({
    confirmed: false,
    appliedAt: null,
  });
  await ingestEmail(email, extractApplication(email));
  expect((await db.applications.toArray())[0]).toMatchObject({
    confirmed: true,
    company: 'Acme',
  });
  expect(await db.messages.count()).toBe(2);
});
it('rolls back the application and mapping when message storage fails', async () => {
  const fail = () => {
    throw new Error('Storage full');
  };
  db.messages.hook('creating', fail);
  try {
    await expect(ingestEmail(email, extractApplication(email))).rejects.toThrow(
      'Storage full',
    );
  } finally {
    db.messages.hook('creating').unsubscribe(fail);
  }
  expect(await db.applications.count()).toBe(0);
  expect(await db.sources.count()).toBe(0);
});
it('migrates version 1 records, CV bytes, associations, and tombstones without loss', async () => {
  const name = `migration-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(1).stores(LOCAL_DATABASE_SCHEMA);
  await old
    .table('applications')
    .put({ id: 'a', company: 'Corrected', confirmed: true });
  await old.table('cvs').put({ id: 'cv', blob: new Blob(['cv bytes']) });
  await old
    .table('messages')
    .put({ id: 'me@example.com:m', applicationId: 'a', text: 'message' });
  await old.table('sources').bulkPut([
    { id: 'me@example.com:t', applicationId: 'a' },
    { id: 'me@example.com:deleted', applicationId: null },
  ]);
  old.close();
  const upgraded = new RolewardDatabase(name);
  try {
    await upgraded.open();
    expect(await upgraded.messages.get('gmail:me@example.com:m')).toMatchObject(
      { applicationId: 'a', provider: 'gmail', text: 'message' },
    );
    expect(
      await upgraded.sources.get('gmail:me@example.com:deleted'),
    ).toMatchObject({ applicationId: null });
    expect(await upgraded.applications.get('a')).toMatchObject({
      company: 'Corrected',
      emailManaged: false,
    });
    expect(await (await upgraded.cvs.get('cv'))!.blob.text()).toBe('cv bytes');
  } finally {
    await upgraded.delete();
  }
});
