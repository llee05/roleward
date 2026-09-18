import { describe, expect, it } from 'vitest';
import type { Email } from '../../domain/email';
import { scanWindow } from '../../domain/email';
import { extractApplication } from './extract';
const email: Email = {
  provider: 'gmail',
  account: 'me@example.com',
  id: '1',
  threadId: 't',
  sender: 'Acme Careers <careers@acme.test>',
  subject: 'Thank you for applying to Acme',
  text: 'We received your application for the Product Designer position.\nApplication date: 2026-09-14',
  receivedAt: '2026-09-15T12:00:00Z',
  outgoing: false,
};
describe('application extraction', () => {
  it('recognizes a receipt and extracts employer, role and explicit submission date', () => {
    expect(extractApplication(email)).toMatchObject({
      company: 'Acme',
      role: 'Product Designer',
      appliedAt: '2026-09-14',
      confirmed: true,
      dateSource: 'explicit',
    });
  });
  it('marks a confirmation timestamp as an estimate and supports labelled fields', () => {
    expect(
      extractApplication({
        ...email,
        subject: 'Application received',
        text: 'Thanks for your application.\nCompany: North Star Ltd\nPosition: Software Engineer',
      }),
    ).toMatchObject({
      company: 'North Star Ltd',
      role: 'Software Engineer',
      confirmed: true,
      dateSource: 'confirmation',
    });
  });
  it('extracts an employer from an application-for-role-at-company template', () => {
    expect(
      extractApplication({
        ...email,
        subject: 'Your application for Designer at Acme',
        text: 'Thank you for your application for the Designer role.',
      }),
    ).toMatchObject({ company: 'Acme', role: 'Designer', confirmed: true });
  });
  it.each([
    ['Job alert', 'Recommended jobs for you. Apply now for a Designer role.'],
    [
      'Application incomplete',
      'Finish your application for the Designer role.',
    ],
    [
      'Mortgage application received',
      'Thank you for your mortgage application to Acme Bank.',
    ],
    ['Newsletter', 'Our new product is launching today.'],
    ['Fwd: Thank you for applying to Acme', email.text],
    ['Loan update', 'Your application for a loan was received.'],
  ])(
    'excludes unrelated or unsubmitted correspondence: %s',
    (subject, text) => {
      expect(extractApplication({ ...email, subject, text })).toBeNull();
    },
  );
  it('keeps an interview or rejection in review and does not invent a submission date', () => {
    expect(
      extractApplication({
        ...email,
        subject: 'Interview invitation',
        text: 'Your application for the Designer role at Acme has progressed.',
      }),
    ).toMatchObject({ confirmed: false, appliedAt: null, company: 'Acme' });
  });
  it('does not classify quoted receipts or outgoing messages', () => {
    expect(
      extractApplication({
        ...email,
        subject: 'Catch up',
        text: '\nOn Monday, someone wrote:\nThank you for applying to Acme for the Designer role.',
      }),
    ).toBeNull();
    expect(extractApplication({ ...email, outgoing: true })).toBeNull();
  });
  it('does not guess missing companies or accept impossible dates', () => {
    expect(
      extractApplication({
        ...email,
        subject: 'Application received',
        text: 'We received your application for the Designer role.\nApplication date: 2026-02-30',
      }),
    ).toMatchObject({
      company: '',
      confirmed: false,
      dateSource: 'confirmation',
    });
  });
  it('uses three calendar months with month-end clamping', () => {
    const range = scanWindow(new Date(2026, 4, 31, 12));
    expect([
      range.start.getMonth(),
      range.start.getDate(),
      range.start.getHours(),
    ]).toEqual([1, 28, 0]);
    expect(scanWindow(new Date(2024, 4, 31)).start.getDate()).toBe(29);
  });
});
