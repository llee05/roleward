import type { Email, EmailProvider, ScanWindow } from '../../domain/email';
export type Mailbox = { provider: EmailProvider; account: string };
export interface EmailAdapter {
  provider: EmailProvider;
  scan: (
    account: string,
    window: ScanWindow,
    signal: AbortSignal,
  ) => AsyncIterable<Email>;
  getEmail: (
    account: string,
    id: string,
    signal: AbortSignal,
  ) => Promise<Email>;
}
export class EmailAuthError extends Error {}
/** Retries transient provider errors only; cancellation interrupts both fetch and backoff. */
export async function readEmailApi(
  url: string,
  token: string,
  signal?: AbortSignal,
  headers: Record<string, string> = {},
): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(30000);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, ...headers },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.ok) return response.json();
    if (response.status === 401)
      throw new EmailAuthError(
        'Your email session expired. Reconnect to continue.',
      );
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter
      ? Math.max(
          0,
          /^\d+$/.test(retryAfter)
            ? Number(retryAfter) * 1000
            : Date.parse(retryAfter) - Date.now(),
        )
      : (attempt + 1) * 1000;
    if (
      [429, 503].includes(response.status) &&
      attempt < 2 &&
      Number.isFinite(delay) &&
      delay <= 10000
    ) {
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(signal?.reason ?? new Error('Update cancelled.'));
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', abort);
          resolve();
        }, delay);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
      });
      continue;
    }
    if (response.status === 429)
      throw new Error(
        'The email provider is limiting requests. Wait before updating again.',
      );
    if (response.status === 403)
      throw new Error(
        'Email access was denied. Check read permissions, API configuration, or your organisation’s consent policy.',
      );
    throw new Error(
      `Email retrieval failed (${response.status}). Retry Update; earlier imports are safe.`,
    );
  }
}
/** Inert parsing only: strip HTML and never insert email markup into the live page. */
export function htmlToText(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc
    .querySelectorAll('script,style,iframe,object,embed,svg')
    .forEach((node) => node.remove());
  doc.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr').forEach((node) => node.append('\n'));
  return doc.body.textContent ?? '';
}
