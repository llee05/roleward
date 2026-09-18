import {
  emailKey,
  emailSchema,
  scanWindow,
  type Email,
  type ScanWindow,
} from '../../domain/email';
import { db } from '../../persistence/local-database';
import { ingestEmail } from '../../persistence/repository';
import { extractApplication } from './extract';
import type { EmailAdapter } from './provider';
export type UpdateResult = { scanned: number; added: number; review: number };
/** Browser script called by Update; no credentials or irrelevant message bodies are persisted. */
export async function updateMailbox(
  adapter: EmailAdapter,
  account: string,
  signal: AbortSignal,
  progress: (text: string) => void,
  window: ScanWindow = scanWindow(),
): Promise<UpdateResult> {
  const before = await db.applications.toArray();
  const confirmedBefore = new Set(
    before.filter((a) => a.confirmed).map((a) => a.id),
  );
  const reviewBefore = new Set(
    before.filter((a) => !a.confirmed).map((a) => a.id),
  );
  const seen = new Set<string>();
  const skipped: { source: string; id: string }[] = [];
  let scanned = 0;
  const inRange = (email: Email) => {
    const time = Date.parse(email.receivedAt);
    return time >= window.start.getTime() && time <= window.end.getTime();
  };
  for await (const input of adapter.scan(account, window, signal)) {
    signal.throwIfAborted();
    const email = emailSchema.parse(input);
    if (
      email.provider !== adapter.provider ||
      email.account.toLowerCase() !== account.toLowerCase()
    )
      throw new Error(
        'Email provider returned a different mailbox. Update stopped.',
      );
    if (seen.has(email.id) || !inRange(email)) continue;
    seen.add(email.id);
    scanned++;
    progress(`Scanned ${scanned} emails from the past three months…`);
    const extraction = extractApplication(email);
    signal.throwIfAborted();
    const result = await ingestEmail(email, extraction);
    if (result === 'ignored' && !email.outgoing)
      skipped.push({
        source: emailKey(email.provider, account, email.threadId),
        id: email.id,
      });
  }
  // A generic reply can precede its receipt in the provider's ordering. Retrieve
  // those messages only if this scan established a matching application.
  const known = new Set(
    (await db.sources.toArray())
      .filter((s) => s.applicationId)
      .map((s) => s.id),
  );
  for (const entry of skipped) {
    if (!known.has(entry.source)) continue;
    signal.throwIfAborted();
    const email = emailSchema.parse(
      await adapter.getEmail(account, entry.id, signal),
    );
    if (
      email.provider !== adapter.provider ||
      email.account.toLowerCase() !== account.toLowerCase() ||
      emailKey(email.provider, account, email.threadId) !== entry.source
    )
      throw new Error(
        'Email association changed during Update. Retry the scan.',
      );
    signal.throwIfAborted();
    if (inRange(email)) await ingestEmail(email, null);
  }
  signal.throwIfAborted();
  await db.settings.put({
    key: `lastSync:${adapter.provider}:${account.toLowerCase()}`,
    value: new Date().toISOString(),
  });
  const after = await db.applications.toArray();
  return {
    scanned,
    added: after.filter((a) => a.confirmed && !confirmedBefore.has(a.id))
      .length,
    review: after.filter((a) => !a.confirmed && !reviewBefore.has(a.id)).length,
  };
}
