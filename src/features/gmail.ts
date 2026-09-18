import { z } from 'zod';
import type { Email, ScanWindow } from '../domain/email';
import {
  htmlToText,
  readEmailApi,
  EmailAuthError,
  type EmailAdapter,
} from './email/provider';
import type { Message } from '../domain/models';
import { db } from '../persistence/local-database';
import { ingestThread } from '../persistence/repository';
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
export const gmailConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
};
type GoogleApi = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback: () => void;
      }) => { requestAccessToken: () => void };
      revoke: (
        token: string,
        callback: (response: { successful: boolean }) => void,
      ) => void;
    };
  };
};
declare global {
  interface Window {
    google?: GoogleApi;
  }
}
let loader: Promise<void> | undefined;
let token = '';
let expiresAt = 0;
let controller: AbortController | undefined;
export function loadGoogle() {
  if (window.google) return Promise.resolve();
  if (!loader)
    loader = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      const timer = setTimeout(() => {
        script.remove();
        loader = undefined;
        reject(new Error('Google took too long to load. Reload to try again.'));
      }, 15000);
      script.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        loader = undefined;
        reject(
          new Error('Google could not load. Check your connection and reload.'),
        );
      };
      document.head.append(script);
    });
  return loader;
}
export function authorizeGmail(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.google || !gmailConfigured)
      return reject(
        new Error('Google connection is not configured or is still loading.'),
      );
    window.google.accounts.oauth2
      .initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: (response) => {
          if (
            response.error ||
            !response.access_token ||
            !response.scope?.split(' ').includes(SCOPE)
          )
            return reject(
              new Error(
                'Gmail read permission was not granted. Try connecting again.',
              ),
            );
          token = response.access_token;
          expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
          resolve();
        },
        error_callback: () =>
          reject(
            new Error(
              'The Google popup was closed or blocked. Try connecting again.',
            ),
          ),
      })
      .requestAccessToken();
  });
}
async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  if (!token || Date.now() >= expiresAt) {
    token = '';
    throw new EmailAuthError(
      'Your Gmail session expired. Reconnect to continue.',
    );
  }
  return readEmailApi(
    `https://gmail.googleapis.com/gmail/v1/users/me/${path}`,
    token,
    signal,
  );
}
export async function gmailProfile() {
  return z
    .object({ emailAddress: z.string().email() })
    .parse(await request('profile'))
    .emailAddress.toLowerCase();
}
export async function disconnectGmail() {
  controller?.abort();
  const current = token;
  token = '';
  expiresAt = 0;
  if (!current || !window.google) return false;
  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 8000);
    window.google!.accounts.oauth2.revoke(current, (response) => {
      clearTimeout(timeout);
      resolve(response.successful === true);
    });
  });
}
type Part = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string };
  parts?: Part[];
};
function plainText(part?: Part): string {
  if (!part || part.filename) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) {
    try {
      const binary = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      return new TextDecoder().decode(
        Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      );
    } catch {
      return '';
    }
  }
  return (part.parts ?? []).map(plainText).filter(Boolean).join('\n');
}
const messageSchema = z.object({
  id: z.string(),
  internalDate: z.string(),
  snippet: z.string().optional(),
  payload: z
    .object({
      headers: z
        .array(z.object({ name: z.string(), value: z.string() }))
        .optional(),
    })
    .passthrough()
    .optional(),
});
export async function syncGmail(onProgress: (message: string) => void) {
  controller = new AbortController();
  const signal = controller.signal;
  const account = await gmailProfile();
  const ids = new Set<string>();
  let page = '';
  for (let i = 0; i < 2; i++) {
    signal.throwIfAborted();
    const query = new URLSearchParams({
      maxResults: '50',
      q: 'newer_than:180d {"application" "interview" "job offer" "candidacy"}',
      ...(page ? { pageToken: page } : {}),
    });
    const result = z
      .object({
        threads: z.array(z.object({ id: z.string() })).optional(),
        nextPageToken: z.string().optional(),
      })
      .parse(await request(`threads?${query}`, signal));
    result.threads?.forEach((thread) => ids.add(thread.id));
    page = result.nextPageToken ?? '';
    if (!page) break;
  }
  // Continue refreshing previously tracked threads, even outside the discovery query.
  const sources = await db.sources.toArray();
  for (const source of sources)
    if (source.id.startsWith(`gmail:${account}:`) && source.applicationId)
      ids.add(source.id.slice(`gmail:${account}:`.length));
  let processed = 0;
  for (const id of ids) {
    signal.throwIfAborted();
    onProgress(`Reviewing thread ${processed + 1} of ${ids.size}…`);
    const result = z
      .object({ messages: z.array(messageSchema).optional() })
      .parse(
        await request(`threads/${encodeURIComponent(id)}?format=full`, signal),
      );
    const messages: Omit<Message, 'applicationId'>[] = (
      result.messages ?? []
    ).map((m) => {
      const header = (name: string) =>
        m.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ??
        '';
      return {
        id: `${account}:${m.id}`,
        account,
        threadId: id,
        sender: header('from'),
        subject: header('subject') || '(No subject)',
        text: (
          plainText(m.payload as Part) ||
          m.snippet ||
          'No plain-text message available.'
        ).slice(0, 30000),
        receivedAt: new Date(Number(m.internalDate)).toISOString(),
      };
    });
    signal.throwIfAborted();
    if (messages.length) await ingestThread(account, id, messages);
    processed++;
  }
  signal.throwIfAborted();
  await db.settings.put({ key: 'lastSync', value: new Date().toISOString() });
  return { processed, limited: Boolean(page) };
}

function htmlBody(part?: Part): string {
  if (!part || part.filename) return '';
  if (part.mimeType === 'text/html' && part.body?.data) {
    const binary = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    return htmlToText(
      new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))),
    );
  }
  return (part.parts ?? []).map(htmlBody).filter(Boolean).join('\n');
}
export async function getGmailEmail(
  account: string,
  id: string,
  signal: AbortSignal,
): Promise<Email> {
  const m = messageSchema
    .extend({ threadId: z.string(), labelIds: z.array(z.string()).optional() })
    .parse(
      await request(`messages/${encodeURIComponent(id)}?format=full`, signal),
    );
  const header = (name: string) =>
    m.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? '';
  const sender = header('from');
  return {
    provider: 'gmail',
    account,
    id: m.id,
    threadId: m.threadId,
    sender,
    subject: header('subject') || '(No subject)',
    text: (
      plainText(m.payload as Part) ||
      htmlBody(m.payload as Part) ||
      m.snippet ||
      ''
    ).slice(0, 30000),
    receivedAt: new Date(Number(m.internalDate)).toISOString(),
    outgoing:
      Boolean(m.labelIds?.some((label) => ['SENT', 'DRAFT'].includes(label))) ||
      sender.toLowerCase().includes(`<${account.toLowerCase()}>`) ||
      sender.toLowerCase() === account.toLowerCase(),
  };
}
export async function* scanGmailEmails(
  account: string,
  window: ScanWindow,
  signal: AbortSignal,
) {
  let page = '';
  const pages = new Set<string>();
  do {
    signal.throwIfAborted();
    if (pages.has(page))
      throw new Error('Gmail repeated a page. Retry Update.');
    pages.add(page);
    const query = new URLSearchParams({
      maxResults: '100',
      q: `after:${Math.floor(window.start.getTime() / 1000) - 1} before:${Math.ceil(window.end.getTime() / 1000) + 1} -in:drafts`,
      ...(page ? { pageToken: page } : {}),
    });
    const result = z
      .object({
        messages: z.array(z.object({ id: z.string() })).optional(),
        nextPageToken: z.string().optional(),
      })
      .parse(await request(`messages?${query}`, signal));
    for (const message of result.messages ?? []) {
      signal.throwIfAborted();
      yield await getGmailEmail(account, message.id, signal);
    }
    page = result.nextPageToken ?? '';
  } while (page);
}
export const gmailAdapter: EmailAdapter = {
  provider: 'gmail',
  scan: scanGmailEmails,
  getEmail: getGmailEmail,
};
