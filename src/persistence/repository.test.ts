import { afterEach, describe, expect, it } from 'vitest';
import { db } from './local-database';
import {
  ingestThread,
  mergeApplication,
  removeApplication,
  removeCv,
  saveApplication,
  uploadCv,
  validateCv,
} from './repository';
import { metrics } from '../domain/metrics';
import type { ApplicationInput, Message } from '../domain/models';
const input: ApplicationInput = {
  company: 'Acme',
  role: 'Designer',
  appliedAt: '2026-09-18',
  status: 'applied',
  cvId: '',
  notes: '',
};
const messages: Omit<Message, 'applicationId'>[] = [
  {
    id: 'person@example.com:message1',
    account: 'person@example.com',
    threadId: 'thread1',
    sender: 'Acme',
    subject: 'Your application',
    text: 'Thank you',
    receivedAt: '2026-09-18T09:00:00Z',
  },
];
afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});
describe('local workspace invariants', () => {
  it('rejects impossible dates and dangling CV references without a partial write', async () => {
    await expect(
      saveApplication({ ...input, appliedAt: '2026-02-30' }),
    ).rejects.toThrow();
    await expect(
      saveApplication({ ...input, cvId: 'missing' }),
    ).rejects.toThrow();
    expect(await db.applications.count()).toBe(0);
  });
  it('keeps versions independent and round-trips their file bytes across reopen', async () => {
    const file = new File(['%PDF-1.4 original bytes'], 'cv.pdf', {
      type: 'application/pdf',
    });
    await uploadCv(file, 'Original');
    await uploadCv(file, 'Revised');
    db.close();
    await db.open();
    const cvs = await db.cvs.toArray();
    expect(cvs).toHaveLength(2);
    expect(await cvs[0].blob.text()).toBe('%PDF-1.4 original bytes');
    const app = await saveApplication({ ...input, cvId: cvs[0].id });
    await removeApplication(app.id);
    expect(await db.cvs.count()).toBe(2);
    const app2 = await saveApplication({ ...input, cvId: cvs[0].id });
    await removeCv(cvs[0].id);
    expect((await db.applications.get(app2.id))?.cvId).toBe('');
  });
  it('rejects mismatched and oversized files and permits empty MIME fallback', () => {
    expect(() =>
      validateCv(new File(['x'], 'cv.pdf', { type: 'text/plain' })),
    ).toThrow();
    expect(() =>
      validateCv(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'cv.pdf')),
    ).toThrow();
    expect(validateCv(new File(['x'], 'CV.PDF'))).toBe('application/pdf');
  });
  it('deduplicates syncs, preserves corrections, and remembers deletions', async () => {
    await ingestThread('person@example.com', 'thread1', messages);
    await ingestThread('person@example.com', 'thread1', messages);
    let apps = await db.applications.toArray();
    expect(apps).toHaveLength(1);
    expect(await db.messages.count()).toBe(1);
    expect(metrics(apps).total).toBe(0);
    await saveApplication(
      { ...input, company: 'Corrected company', appliedAt: '' },
      apps[0].id,
    );
    await ingestThread('person@example.com', 'thread1', messages);
    apps = await db.applications.toArray();
    expect(apps[0].company).toBe('Corrected company');
    expect(metrics(apps).total).toBe(1);
    expect(metrics(apps).undated).toBe(1);
    await removeApplication(apps[0].id);
    await ingestThread('person@example.com', 'thread1', messages);
    expect(await db.applications.count()).toBe(0);
    expect(await db.messages.count()).toBe(0);
  });
  it('merges follow-ups into an existing application and remembers the association', async () => {
    const app = await saveApplication(input);
    await ingestThread('person@example.com', 'thread1', messages);
    const candidate = (await db.applications.toArray()).find(
      (a) => !a.confirmed,
    )!;
    await mergeApplication(candidate.id, app.id);
    await ingestThread('person@example.com', 'thread1', messages);
    expect(await db.applications.count()).toBe(1);
    expect((await db.messages.toArray())[0].applicationId).toBe(app.id);
  });
  it('counts submissions, including undated ones, independently from status and email volume', async () => {
    const first = await saveApplication(input);
    await saveApplication({ ...input, status: 'rejected' }, first.id);
    await saveApplication({ ...input, appliedAt: '' });
    const result = metrics(
      await db.applications.toArray(),
      new Date(2026, 8, 18, 12),
    );
    expect(result.total).toBe(2);
    expect(result.undated).toBe(1);
    expect(result.days.at(-1)?.count).toBe(1);
    expect(result.days[0].count).toBe(0);
    expect(result.statuses.reduce((sum, s) => sum + s.count, 0)).toBe(2);
  });
});
