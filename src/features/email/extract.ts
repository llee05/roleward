import type { Email, Extraction } from '../../domain/email';
import { localDate } from '../../lib/utils';
const nonJob =
  /\b(?:loan|mortgage|credit card|visa|passport|rental|housing|insurance|university|college|grant|membership|scholarship) application\b|\bapplication (?:for|to) (?:a |an |the )?(?:loan|mortgage|visa|university|college|grant|membership)\b/i;
const solicitation =
  /\b(?:complete|finish|start|continue) your application\b|\b(?:jobs? alert|recommended jobs|apply now|application (?:is )?(?:incomplete|not submitted))\b/i;
const receipt =
  /\b(?:thank(?:s| you) for (?:applying|your (?:job )?application)|we(?:'ve| have)? received your (?:job )?application|your (?:job )?application (?:has been |was )?(?:received|submitted)|application (?:successfully submitted|received|confirmation))\b/i;
const employment =
  /\b(?:position|role|job|career|recruit(?:ing|ment|er)|hiring|candidate|candidacy|resume|résumé|cv)\b/i;
function clean(value = '') {
  return value
    .trim()
    .replace(/^["'“”]+|["'“”.!,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function match(text: string, patterns: RegExp[], limit: number) {
  for (const pattern of patterns) {
    const value = clean(text.match(pattern)?.[1]);
    if (
      value &&
      value.length <= limit &&
      !/^(?:us|our team|the team|this role|your interest|your application)$/i.test(
        value,
      )
    )
      return value;
  }
  return '';
}
function explicitDate(text: string, receivedAt: string) {
  const value = text
    .match(
      /(?:application (?:date|submitted(?: on)?)|applied on|submitted on)\s*:?\s*([^\n.!]+?)(?=\n|[.!]|$)/i,
    )?.[1]
    ?.trim();
  if (!value) return null;
  let date = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date = value;
  else if (
    /^(?:\d{1,2} [A-Za-z]+ \d{4}|[A-Za-z]+ \d{1,2},? \d{4})$/.test(value)
  ) {
    const parsed = new Date(value);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getDate() === Number(value.match(/\b\d{1,2}\b/)?.[0])
    )
      date = localDate(parsed);
  }
  if (
    !date ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > localDate(new Date(receivedAt))
  )
    return null;
  return date;
}
/** Conservative English template rules. Email text is never executed or sent to an AI service. */
export function extractApplication(email: Email): Extraction | null {
  if (email.outgoing || /^(?:fw|fwd):/i.test(email.subject)) return null;
  // Avoid classifying an old quoted receipt as a new confirmation.
  const body = email.text
    .split(/\n(?:On .+wrote:|From:|[- ]*Original Message[- ]*)/i)[0]
    .split('\n')
    .filter((line) => !/^\s*>/.test(line))
    .join('\n');
  const text = `${email.subject}\n${body}`;
  if (nonJob.test(text)) return null;
  const outcome =
    /\b(?:unfortunately|unsuccessful|rejected|not (?:be )?(?:moving|proceeding) forward|interview invitation|(?:schedule|scheduled|invite you (?:to|for)) (?:an? |your )?interview|pleased to offer)\b/i.test(
      body,
    );
  const isReceipt =
    (receipt.test(body) ||
      (!/^re\s*:/i.test(email.subject) && receipt.test(email.subject))) &&
    !solicitation.test(text) &&
    !outcome;
  const related =
    employment.test(text) &&
    /\b(?:your application|interview|job offer|candidacy|unfortunately|not be moving forward)\b/i.test(
      text,
    );
  if (!isReceipt && (!related || solicitation.test(text))) return null;
  const company = match(
    text,
    [
      /(?:^|\n)(?:company|employer)\s*:\s*([^\n]+)/i,
      /\b(?:application|applying) for (?:the )?[^\n.!?]+?\s+(?:at|with)\s+([^\n.!?]+?)(?=\s+(?:for|on|has|was|is|will)\b|[.!?\n]|$)/i,
      /\b(?:applying|your (?:job )?application) (?:to|with|at)\s+([^\n.!?]+?)(?=\s+(?:for|on|has|was|is|will)\b|[.!?\n]|$)/i,
      /\b(?:position|role|job)\s+(?:at|with)\s+([^\n.!?]+?)(?=\s+(?:for|on|has|was|is|will)\b|[.!?\n]|$)/i,
      /^(?:application (?:received|confirmation)|thank you for applying)\s*[-–—|:]\s*([^\n]+)/i,
    ],
    150,
  );
  const role = match(
    text,
    [
      /(?:^|\n)(?:job title|position|role)\s*:\s*([^\n]+)/i,
      /\b(?:application|applying) for (?:the )?([^\n.!?]+?)(?:\s+(?:position|role))?(?=\s+(?:at|with)\b|[.!?\n]|$)/i,
      /\bfor (?:the )?([^\n.!?]+?) (?:position|role)\b/i,
    ],
    200,
  );
  const jobReceipt =
    isReceipt &&
    (employment.test(text) || /\bapplying (?:to|with|at)\b/i.test(text));
  // Generic "application received" emails without employment evidence need no import.
  if (!jobReceipt && !related) return null;
  const statedDate = explicitDate(body, email.receivedAt);
  const appliedAt =
    statedDate ?? (jobReceipt ? localDate(new Date(email.receivedAt)) : null);
  return {
    company,
    role,
    appliedAt,
    confirmed: jobReceipt && Boolean(company),
    dateSource: statedDate
      ? 'explicit'
      : jobReceipt
        ? 'confirmation'
        : 'unknown',
    reason: jobReceipt
      ? 'Application confirmation detected.'
      : 'Job-related correspondence needs review.',
  };
}
