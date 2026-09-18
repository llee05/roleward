import { z } from 'zod';
import { APPLICATION_STATUSES } from './application-statuses';
export const applicationInput = z.object({
  company: z.string().trim().max(150),
  role: z.string().trim().max(200),
  appliedAt: z
    .string()
    .refine(
      (value) =>
        value === '' ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value),
      'Enter a real calendar date.',
    ),
  status: z.enum(APPLICATION_STATUSES),
  cvId: z.string(),
  notes: z.string().max(5000),
});
export type ApplicationInput = z.infer<typeof applicationInput>;
export type Application = Omit<ApplicationInput, 'appliedAt'> & {
  id: string;
  appliedAt: string | null;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
};
export type Cv = {
  id: string;
  label: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: string;
  blob: Blob;
};
export type Message = {
  id: string;
  applicationId: string;
  account: string;
  threadId: string;
  sender: string;
  subject: string;
  text: string;
  receivedAt: string;
};
export type Source = { id: string; applicationId: string | null };
export type Setting = { key: string; value: string };
