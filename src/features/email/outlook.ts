import { z } from 'zod';
import type { Email, ScanWindow } from '../../domain/email';
import { getOutlookToken } from './outlook-auth';
import { htmlToText, readEmailApi, type EmailAdapter } from './provider';
const ROOT = 'https://graph.microsoft.com/v1.0';
const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  subject: z.string().nullish(),
  receivedDateTime: z.string().datetime(),
  from: z
    .object({
      emailAddress: z.object({
        name: z.string().optional(),
        address: z.string(),
      }),
    })
    .optional(),
  body: z.object({ contentType: z.string(), content: z.string() }).optional(),
  bodyPreview: z.string().optional(),
  isDraft: z.boolean().optional(),
  webLink: z.string().optional(),
});
const fields =
  'id,conversationId,subject,from,receivedDateTime,body,bodyPreview,isDraft,webLink';
async function request(url: string, signal?: AbortSignal) {
  const parsed = new URL(url);
  // A pagination link must never send a bearer token to another host.
  if (
    parsed.origin !== 'https://graph.microsoft.com' ||
    !parsed.pathname.startsWith('/v1.0/')
  )
    throw new Error('Microsoft returned an invalid pagination URL.');
  return readEmailApi(url, getOutlookToken(), signal, {
    Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"',
  });
}
export async function outlookProfile() {
  const profile = z
    .object({
      mail: z.string().nullable().optional(),
      userPrincipalName: z.string().optional(),
    })
    .parse(await request(`${ROOT}/me?$select=mail,userPrincipalName`));
  return z
    .string()
    .email()
    .parse(profile.mail || profile.userPrincipalName)
    .toLowerCase();
}
function normalize(raw: z.infer<typeof messageSchema>, account: string): Email {
  const from = raw.from?.emailAddress;
  const webLink =
    raw.webLink &&
    /^https:\/\/(?:outlook\.live\.com|outlook\.office\.com|outlook\.office365\.com)\//i.test(
      raw.webLink,
    )
      ? raw.webLink
      : undefined;
  return {
    provider: 'outlook',
    account,
    id: raw.id,
    threadId: raw.conversationId,
    sender: from ? `${from.name ?? ''} <${from.address}>` : '',
    subject: raw.subject ?? '(No subject)',
    text: (raw.body?.contentType.toLowerCase() === 'html'
      ? htmlToText(raw.body.content)
      : (raw.body?.content ?? raw.bodyPreview ?? '')
    ).slice(0, 30000),
    receivedAt: raw.receivedDateTime,
    outgoing:
      Boolean(raw.isDraft) ||
      from?.address.toLowerCase() === account.toLowerCase(),
    webLink,
  };
}
export async function getOutlookEmail(
  account: string,
  id: string,
  signal: AbortSignal,
) {
  return normalize(
    messageSchema.parse(
      await request(
        `${ROOT}/me/messages/${encodeURIComponent(id)}?$select=${fields}`,
        signal,
      ),
    ),
    account,
  );
}
export async function* scanOutlookEmails(
  account: string,
  window: ScanWindow,
  signal: AbortSignal,
) {
  const query = new URLSearchParams({
    $filter: `receivedDateTime ge ${window.start.toISOString()} and receivedDateTime le ${window.end.toISOString()}`,
    $orderby: 'receivedDateTime desc',
    $top: '50',
    $select: fields,
  });
  let next = `${ROOT}/me/messages?${query}`;
  const pages = new Set<string>();
  while (next) {
    signal.throwIfAborted();
    if (pages.has(next))
      throw new Error('Microsoft repeated a page. Retry Update.');
    pages.add(next);
    const result = z
      .object({
        value: z.array(messageSchema),
        '@odata.nextLink': z.string().optional(),
      })
      .parse(await request(next, signal));
    for (const message of result.value)
      if (!message.isDraft) yield normalize(message, account);
    next = result['@odata.nextLink'] ?? '';
  }
}
export const outlookAdapter: EmailAdapter = {
  provider: 'outlook',
  scan: scanOutlookEmails,
  getEmail: getOutlookEmail,
};
