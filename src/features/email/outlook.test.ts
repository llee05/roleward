import { afterEach, expect, it, vi } from 'vitest';
import { getOutlookEmail, outlookProfile, scanOutlookEmails } from './outlook';
vi.mock('./outlook-auth', () => ({
  getOutlookToken: () => 'outlook-test-token',
}));
afterEach(() => vi.unstubAllGlobals());
const message = {
  id: 'immutable1',
  conversationId: 'conversation1',
  subject: 'Application received',
  from: { emailAddress: { name: 'Acme', address: 'careers@acme.test' } },
  receivedDateTime: '2026-09-15T12:00:00Z',
  body: {
    contentType: 'html',
    content:
      '<p>Company: Acme</p><p>Thanks for applying.</p><script>alert(1)</script>',
  },
  webLink: 'https://outlook.office.com/mail/deeplink/read/immutable1',
};
const range = {
  start: new Date('2026-06-18T00:00:00Z'),
  end: new Date('2026-09-18T12:00:00Z'),
};
it('follows all Graph pages, requests immutable IDs, normalizes HTML, and uses the exact date filter', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          value: [message],
          '@odata.nextLink':
            'https://graph.microsoft.com/v1.0/me/messages?$skip=50',
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ value: [{ ...message, id: 'immutable2' }] }),
      ),
    );
  vi.stubGlobal('fetch', fetch);
  const emails = [];
  for await (const email of scanOutlookEmails(
    'me@example.com',
    range,
    new AbortController().signal,
  ))
    emails.push(email);
  expect(emails).toHaveLength(2);
  expect(emails[0].text).toContain('Company: Acme\n');
  expect(emails[0].text).not.toContain('alert');
  const query = new URL(fetch.mock.calls[0][0]).searchParams;
  expect(query.get('$filter')).toContain(range.start.toISOString());
  expect(query.get('$filter')).toContain(range.end.toISOString());
  expect(fetch.mock.calls[0][1].headers.Prefer).toContain('ImmutableId');
});
it('rejects pagination to a different host before disclosing a token', async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        value: [],
        '@odata.nextLink': 'https://attacker.test/mail',
      }),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(
    (async () => {
      for await (const email of scanOutlookEmails(
        'me@example.com',
        range,
        new AbortController().signal,
      ))
        void email;
    })(),
  ).rejects.toThrow('invalid pagination');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('supports profile fallback and rejects unsafe message links', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ mail: null, userPrincipalName: 'ME@example.com' }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...message, webLink: 'javascript:alert(1)' }),
        ),
      ),
  );
  expect(await outlookProfile()).toBe('me@example.com');
  expect(
    (
      await getOutlookEmail(
        'me@example.com',
        'immutable1',
        new AbortController().signal,
      )
    ).webLink,
  ).toBeUndefined();
});
