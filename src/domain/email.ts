import { z } from 'zod';
export const EMAIL_PROVIDERS = ['gmail', 'outlook'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];
export const emailSchema = z.object({
  provider: z.enum(EMAIL_PROVIDERS),
  account: z.string().email(),
  id: z.string().min(1),
  threadId: z.string().min(1),
  sender: z.string(),
  subject: z.string(),
  text: z.string(),
  receivedAt: z.string().datetime(),
  outgoing: z.boolean().default(false),
  webLink: z.string().url().optional(),
});
export type Email = z.infer<typeof emailSchema>;
export type Extraction = {
  company: string;
  role: string;
  appliedAt: string | null;
  confirmed: boolean;
  dateSource: 'explicit' | 'confirmation' | 'unknown';
  reason: string;
};
export type ScanWindow = { start: Date; end: Date };
/** Three calendar months, clamped to the last valid day and inclusive of that day. */
export function scanWindow(now = new Date()): ScanWindow {
  const start = new Date(now);
  const day = start.getDate();
  start.setDate(1);
  start.setMonth(start.getMonth() - 3);
  const lastDay = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    0,
  ).getDate();
  start.setDate(Math.min(day, lastDay));
  start.setHours(0, 0, 0, 0);
  return { start, end: new Date(now) };
}
export function emailKey(provider: EmailProvider, account: string, id: string) {
  return `${provider}:${account.toLowerCase()}:${id}`;
}
