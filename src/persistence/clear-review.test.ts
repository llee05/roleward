import { afterEach, expect, it } from 'vitest';
import type { Email } from '../domain/email';
import { extractApplication } from '../features/email/extract';
import { db } from './local-database';
import {
  clearReviewQueue,
  ingestEmail,
  saveApplication,
  uploadCv,
} from './repository';

const candidate: Email = {
  provider: 'gmail',
  account: 'test@example.com',
  id: 'reply',
  threadId: 'pending',
  sender: 'Careers <careers@example.com>',
  subject: 'Interview invitation',
  text: 'Your application for the Designer role at Acme has progressed.',
  receivedAt: '2026-09-15T12:00:00Z',
  outgoing: false,
};
async function importEmail(email: Email) {
  await ingestEmail(email, extractApplication(email));
}
afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

it('clears review candidates across providers and prevents reimport while preserving tracked data and CVs', async () => {
  await importEmail(candidate);
  await importEmail({ ...candidate, provider: 'outlook' });
  const receipt = {
    ...candidate,
    threadId: 'tracked',
    id: 'receipt',
    subject: 'Thanks for applying to Acme',
    text: 'We received your application for the Designer role.',
  };
  await importEmail(receipt);
  await uploadCv(
    new File(['%PDF-1.4 original'], 'cv.pdf', { type: 'application/pdf' }),
    'Original',
  );
  await db.settings.put({
    key: 'lastSync:gmail:test@example.com',
    value: '2026-09-15T12:00:00Z',
  });
  const applications = await db.applications.toArray();
  const tracked = applications.filter((application) => application.confirmed);
  const messages = await db.messages
    .where('applicationId')
    .equals(tracked[0].id)
    .toArray();
  const settings = await db.settings.toArray();
  const ids = applications
    .filter((application) => !application.confirmed)
    .map((application) => application.id);

  expect(await clearReviewQueue(ids)).toBe(2);
  expect(await db.applications.toArray()).toEqual(tracked);
  expect(await db.messages.toArray()).toEqual(messages);
  expect(await db.settings.toArray()).toEqual(settings);
  expect(await db.cvs.count()).toBe(1);
  expect(await (await db.cvs.toArray())[0].blob.text()).toBe(
    '%PDF-1.4 original',
  );
  expect(
    (await db.sources.toArray()).filter(
      (source) => source.applicationId === null,
    ),
  ).toHaveLength(2);

  await importEmail(candidate);
  await importEmail({ ...candidate, provider: 'outlook' });
  await importEmail({
    ...candidate,
    id: 'later-receipt',
    subject: receipt.subject,
    text: receipt.text,
  });
  expect(await db.applications.toArray()).toEqual(tracked);
  expect(await db.messages.toArray()).toEqual(messages);
  expect(await clearReviewQueue(ids)).toBe(0);
  expect(await clearReviewQueue([])).toBe(0);
});

it('keeps candidates confirmed after the snapshot and newly arrived review items', async () => {
  await importEmail(candidate);
  const app = (await db.applications.toArray())[0];
  await saveApplication(
    { ...app, appliedAt: '', company: 'Corrected company' },
    app.id,
  );
  await importEmail({ ...candidate, id: 'new', threadId: 'new' });
  const before = await db.applications.toArray();
  expect(await clearReviewQueue([app.id, app.id, 'missing'])).toBe(0);
  expect(await db.applications.toArray()).toEqual(before);
  expect(await db.messages.count()).toBe(2);
  expect(
    (await db.sources.toArray()).every(
      (source) => source.applicationId !== null,
    ),
  ).toBe(true);
});

it('rolls back the entire clear operation when deleting a candidate fails', async () => {
  await importEmail(candidate);
  await importEmail({ ...candidate, provider: 'outlook' });
  const applications = await db.applications.toArray();
  const messages = await db.messages.toArray();
  const sources = await db.sources.toArray();
  const fail = () => {
    throw new Error('Storage unavailable');
  };
  db.applications.hook('deleting', fail);
  try {
    await expect(
      clearReviewQueue(applications.map((app) => app.id)),
    ).rejects.toThrow('Storage unavailable');
  } finally {
    db.applications.hook('deleting').unsubscribe(fail);
  }
  expect(await db.applications.toArray()).toEqual(applications);
  expect(await db.messages.toArray()).toEqual(messages);
  expect(await db.sources.toArray()).toEqual(sources);
});
