import { afterEach, expect, it, vi } from 'vitest';
import { readEmailApi, EmailAuthError } from './provider';
afterEach(() => vi.unstubAllGlobals());
it('retries a throttled request and handles expired authorization', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response('', { status: 429, headers: { 'Retry-After': '0' } }),
    )
    .mockResolvedValueOnce(new Response('{"value":[]}'))
    .mockResolvedValueOnce(new Response('', { status: 401 }));
  vi.stubGlobal('fetch', fetch);
  expect(
    await readEmailApi('https://graph.microsoft.com/v1.0/me/messages', 'test'),
  ).toEqual({ value: [] });
  await expect(
    readEmailApi('https://graph.microsoft.com/v1.0/me/messages', 'test'),
  ).rejects.toBeInstanceOf(EmailAuthError);
});
