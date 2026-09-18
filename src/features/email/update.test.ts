import { afterEach, expect, it, vi } from 'vitest';
import type { Email } from '../../domain/email';
import type { EmailAdapter } from './provider';
import { updateMailbox } from './update';
import { db } from '../../persistence/local-database';
const email: Email = {
  provider: 'outlook',
  account: 'me@example.com',
  id: 'receipt',
  threadId: 't',
  sender: 'Careers',
  subject: 'Thank you for applying to Acme',
  text: 'Your application for the Designer role was received.',
  receivedAt: '2026-09-15T12:00:00Z',
  outgoing: false,
};
const range = {
  start: new Date('2026-06-18T00:00:00Z'),
  end: new Date('2026-09-18T12:00:00Z'),
};
afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});
function adapter(emails: Email[]): EmailAdapter {
  return {
    provider: 'outlook',
    scan: async function* () {
      yield* emails;
    },
    getEmail: vi.fn(async (_account, id) => emails.find((e) => e.id === id)!),
  };
}
it('filters the exact window, deduplicates messages, and ignores unrelated mail', async () => {
  const api = adapter([
    email,
    email,
    { ...email, id: 'old', receivedAt: '2026-06-17T23:59:59Z' },
    { ...email, id: 'future', receivedAt: '2026-09-19T00:00:00Z' },
    {
      ...email,
      id: 'newsletter',
      threadId: 'news',
      subject: 'Newsletter',
      text: 'Hello there.',
    },
  ]);
  const result = await updateMailbox(
    api,
    email.account,
    new AbortController().signal,
    () => {},
    range,
  );
  expect(result).toEqual({ scanned: 2, added: 1, review: 0 });
  expect(await db.messages.count()).toBe(1);
  expect(
    await updateMailbox(
      api,
      email.account,
      new AbortController().signal,
      () => {},
      range,
    ),
  ).toMatchObject({ added: 0 });
});
it('links generic replies encountered before their confirmation', async () => {
  const reply = {
    ...email,
    id: 'reply',
    subject: 'Next steps',
    text: 'Are you free Tuesday?',
  };
  const api = adapter([reply, email]);
  await updateMailbox(
    api,
    email.account,
    new AbortController().signal,
    () => {},
    range,
  );
  expect(api.getEmail).toHaveBeenCalledWith(
    email.account,
    'reply',
    expect.any(AbortSignal),
  );
  expect(await db.messages.count()).toBe(2);
  expect(await db.applications.count()).toBe(1);
});
it('keeps completed imports on partial failure and records no successful completion', async () => {
  const api = adapter([]);
  api.scan = async function* () {
    yield email;
    throw new Error('Provider unavailable');
  };
  await expect(
    updateMailbox(
      api,
      email.account,
      new AbortController().signal,
      () => {},
      range,
    ),
  ).rejects.toThrow('Provider unavailable');
  expect(await db.applications.count()).toBe(1);
  expect(await db.settings.count()).toBe(0);
});
it('stops cancelled scans before writes and leaves other accounts alone', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    updateMailbox(
      adapter([email]),
      email.account,
      controller.signal,
      () => {},
      range,
    ),
  ).rejects.toThrow();
  expect(await db.applications.count()).toBe(0);
  await expect(
    updateMailbox(
      adapter([email]),
      'different@example.com',
      new AbortController().signal,
      () => {},
      range,
    ),
  ).rejects.toThrow('different mailbox');
});
