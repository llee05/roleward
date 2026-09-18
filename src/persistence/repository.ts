import {
  applicationInput,
  type Application,
  type ApplicationInput,
  type Message,
} from '../domain/models';
import {
  emailSchema,
  emailKey,
  type Email,
  type Extraction,
} from '../domain/email';
import { db } from './local-database';
export async function saveApplication(input: ApplicationInput, id?: string) {
  const data = applicationInput.parse(input);
  return db.transaction('rw', db.applications, db.cvs, async () => {
    if (data.cvId && !(await db.cvs.get(data.cvId)))
      throw new Error(
        'That CV version no longer exists. Select another version.',
      );
    const existing = id ? await db.applications.get(id) : undefined;
    if (id && !existing) throw new Error('This application no longer exists.');
    const now = new Date().toISOString();
    const record: Application = {
      ...data,
      appliedAt: data.appliedAt || null,
      id: id ?? crypto.randomUUID(),
      confirmed: true,
      emailManaged: false,
      extraction: existing?.extraction,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.applications.put(record);
    return record;
  });
}
export async function removeApplication(id: string) {
  await db.transaction(
    'rw',
    db.applications,
    db.messages,
    db.sources,
    async () => {
      await db.sources
        .where('applicationId')
        .equals(id)
        .modify({ applicationId: null });
      await db.messages.where('applicationId').equals(id).delete();
      await db.applications.delete(id);
    },
  );
}
export async function mergeApplication(from: string, into: string) {
  await db.transaction(
    'rw',
    db.applications,
    db.messages,
    db.sources,
    async () => {
      const target = await db.applications.get(into);
      if (from === into || !target?.confirmed)
        throw new Error('Select a different confirmed application.');
      await db.messages
        .where('applicationId')
        .equals(from)
        .modify({ applicationId: into });
      await db.sources
        .where('applicationId')
        .equals(from)
        .modify({ applicationId: into });
      await db.applications.delete(from);
    },
  );
}
export function validateCv(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const expected =
    extension === 'pdf'
      ? 'application/pdf'
      : extension === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : null;
  if (!expected || (file.type && file.type !== expected))
    throw new Error('Choose a PDF or DOCX file with a matching file type.');
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error('Choose a non-empty CV smaller than or equal to 10 MiB.');
  return expected;
}
export async function uploadCv(file: File, label: string) {
  const type = validateCv(file);
  const name = label.trim() || file.name.replace(/\.[^.]+$/, '');
  if (name.length > 150)
    throw new Error('Keep the version label under 150 characters.');
  await db.cvs.add({
    id: crypto.randomUUID(),
    label: name,
    filename: file.name,
    type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    blob: file.slice(0, file.size, type),
  });
}
export async function renameCv(id: string, label: string) {
  if (!label.trim() || label.trim().length > 150)
    throw new Error('Enter a label of 1–150 characters.');
  await db.cvs.update(id, { label: label.trim() });
}
export async function removeCv(id: string) {
  await db.transaction('rw', db.applications, db.cvs, async () => {
    await db.applications.filter((a) => a.cvId === id).modify({ cvId: '' });
    await db.cvs.delete(id);
  });
}
/** Provider/thread IDs are scoped to a mailbox. Tombstones prevent reimport after deletion. */
export async function ingestThread(
  account: string,
  threadId: string,
  messages: Omit<Message, 'applicationId'>[],
) {
  const sourceId = emailKey('gmail', account, threadId);
  await db.transaction(
    'rw',
    db.applications,
    db.sources,
    db.messages,
    async () => {
      const source = await db.sources.get(sourceId);
      if (source?.applicationId === null) return;
      let id = source?.applicationId;
      if (!id) {
        id = crypto.randomUUID();
        const now = new Date().toISOString();
        // Emails are review candidates, never guessed submissions or dates.
        await db.applications.add({
          id,
          company: '',
          role: '',
          appliedAt: null,
          status: 'applied',
          cvId: '',
          notes: '',
          confirmed: false,
          emailManaged: true,
          createdAt: now,
          updatedAt: now,
        });
        await db.sources.add({ id: sourceId, applicationId: id });
      }
      await db.messages.bulkPut(
        messages.map((message) => ({
          ...message,
          id: message.id.startsWith('gmail:')
            ? message.id
            : `gmail:${message.id}`,
          provider: 'gmail',
          applicationId: id,
        })),
      );
    },
  );
}

/** Save one scanned message atomically. Existing user edits and deletion exclusions win. */
export async function ingestEmail(input: Email, extraction: Extraction | null) {
  const email = emailSchema.parse(input);
  const sourceId = emailKey(email.provider, email.account, email.threadId);
  return db.transaction(
    'rw',
    db.applications,
    db.messages,
    db.sources,
    async () => {
      const source = await db.sources.get(sourceId);
      if (source?.applicationId === null) return 'ignored' as const;
      if (!source && !extraction) return 'ignored' as const;
      const existing = source?.applicationId
        ? await db.applications.get(source.applicationId)
        : undefined;
      if (source && !existing)
        throw new Error(
          'Email association is missing its application. No records were changed.',
        );
      const id = existing?.id ?? crypto.randomUUID();
      const now = new Date().toISOString();
      let outcome: 'added' | 'review' | 'updated' = 'updated';
      if (!existing && extraction) {
        const values = applicationInput.parse({
          ...extraction,
          appliedAt: extraction.appliedAt ?? '',
          cvId: '',
          notes: '',
          status: 'applied',
        });
        await db.applications.add({
          ...values,
          appliedAt: values.appliedAt || null,
          id,
          confirmed: extraction.confirmed,
          emailManaged: true,
          extraction: {
            dateSource: extraction.dateSource,
            reason: extraction.reason,
          },
          createdAt: now,
          updatedAt: now,
        });
        await db.sources.add({ id: sourceId, applicationId: id });
        outcome = extraction.confirmed ? 'added' : 'review';
      } else if (existing?.emailManaged && extraction) {
        // Enrich an unresolved reply when its confirmation arrives later in the scan.
        // Never replace an established submission date with a later reply's date.
        const promote = !existing.confirmed && extraction.confirmed;
        await db.applications.update(id, {
          company: existing.company || extraction.company,
          role: existing.role || extraction.role,
          appliedAt: existing.appliedAt ?? extraction.appliedAt,
          confirmed: existing.confirmed || extraction.confirmed,
          extraction: existing.appliedAt
            ? existing.extraction
            : { dateSource: extraction.dateSource, reason: extraction.reason },
        });
        if (promote) outcome = 'added';
      }
      await db.messages.put({
        id: emailKey(email.provider, email.account, email.id),
        provider: email.provider,
        account: email.account.toLowerCase(),
        threadId: email.threadId,
        sender: email.sender,
        subject: email.subject,
        text: email.text.slice(0, 30000),
        receivedAt: email.receivedAt,
        webLink: email.webLink,
        applicationId: id,
      });
      return outcome;
    },
  );
}
