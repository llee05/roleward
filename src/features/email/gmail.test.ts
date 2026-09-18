import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});
it('scans every Gmail page with a bounded date query and decodes HTML-only mail', async () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client');
  vi.stubGlobal('google', {
    accounts: {
      oauth2: {
        initTokenClient: (config: { callback: (token: unknown) => void }) => ({
          requestAccessToken: () =>
            config.callback({
              access_token: 'test',
              scope: 'https://www.googleapis.com/auth/gmail.readonly',
              expires_in: 3600,
            }),
        }),
      },
    },
  });
  const gmail = await import('../gmail');
  await gmail.authorizeGmail();
  let pageCount = 0;
  const fetch = vi.fn(async (url: string) => {
    if (new URL(url).pathname.endsWith('/messages')) {
      pageCount++;
      return new Response(
        JSON.stringify({
          messages: [{ id: `m${pageCount}` }],
          ...(pageCount < 3 ? { nextPageToken: `page${pageCount + 1}` } : {}),
        }),
      );
    }
    return new Response(
      JSON.stringify({
        id: `m${pageCount}`,
        threadId: `t${pageCount}`,
        internalDate: String(Date.parse('2026-09-15T12:00:00Z')),
        labelIds: ['INBOX'],
        payload: {
          headers: [
            { name: 'From', value: 'Careers <jobs@acme.test>' },
            { name: 'Subject', value: 'Application received' },
          ],
          mimeType: 'text/html',
          body: {
            data: btoa('<p>Company: Acme</p><p>Thanks for applying.</p>'),
          },
        },
      }),
    );
  });
  vi.stubGlobal('fetch', fetch);
  const range = {
    start: new Date('2026-06-18T00:00:00Z'),
    end: new Date('2026-09-18T12:00:00Z'),
  };
  const emails = [];
  for await (const email of gmail.scanGmailEmails(
    'me@example.com',
    range,
    new AbortController().signal,
  ))
    emails.push(email);
  expect(emails).toHaveLength(3);
  expect(pageCount).toBe(3);
  expect(emails[0]).toMatchObject({ provider: 'gmail', outgoing: false });
  expect(emails[0].text).toContain('Company: Acme\n');
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).toContain(
    `after:${range.start.getTime() / 1000 - 1}`,
  );
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).not.toContain(
    'application',
  );
});
