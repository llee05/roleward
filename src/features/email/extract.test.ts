import { describe, expect, it } from 'vitest';
import type { Email } from '../../domain/email';
import { scanWindow } from '../../domain/email';
import { extractApplication, isSeekSuggestion } from './extract';
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
  it.each([
    'Jobs for you',
    '12 new jobs for Software Engineer',
    'Jobs you might like',
    'Jobs you may be interested in',
    'Jobs matching your profile',
    'Your job matches',
    'Your SEEK job suggestions',
    'Opportunities for you',
  ])('excludes SEEK recommendations: %s', (subject) => {
    const suggestion = {
      ...email,
      sender: 'SEEK <updates@email.seek.com.au>',
      subject,
      text: 'Improve your application for the Designer role at Acme.\nCompany: Acme\nRole: Designer',
    };
    expect(isSeekSuggestion(suggestion)).toBe(true);
    expect(extractApplication(suggestion)).toBeNull();
  });
  it.each([
    'alerts@seek.com.au',
    'SEEK <alerts@seek.co.nz>',
    'SEEK <ALERTS@EMAIL.SEEK.COM>',
  ])('filters recommendations in the body from %s', (sender) => {
    expect(
      extractApplication({
        ...email,
        sender,
        subject: 'Your weekly SEEK update',
        text: 'Jobs matching your preferences\nImprove your application for the Designer role.',
      }),
    ).toBeNull();
  });
  it.each([
    'SEEK <careers@example.com>',
    'alerts@notseek.com.au',
    'alerts@seek.com.au.example.com',
  ])(
    'does not treat a display name or lookalike domain as SEEK: %s',
    (sender) => {
      const message = { ...email, sender, subject: 'Jobs for you' };
      expect(isSeekSuggestion(message)).toBe(false);
      expect(extractApplication(message)).toMatchObject({
        role: 'Product Designer',
      });
    },
  );
  it('keeps SEEK receipts and interview replies with suggestion footers', () => {
    const receipt = {
      ...email,
      sender: 'SEEK <applications@seek.com.au>',
      text: `${email.text}\nMore jobs you might like`,
    };
    expect(extractApplication(receipt)).toMatchObject({
      company: 'Acme',
      confirmed: true,
    });
    expect(
      extractApplication({
        ...receipt,
        subject: 'Interview invitation',
        text: 'We invite you to an interview for the Designer role at Acme.\nMore jobs you might like',
      }),
    ).toMatchObject({ company: 'Acme', confirmed: false, appliedAt: null });
  });
  it('does not use a quoted recommendation to discard a SEEK reply', () => {
    const reply = {
      ...email,
      sender: 'SEEK <applications@seek.com.au>',
      subject: 'Your application for Designer at Acme',
      text: 'Your application for the Designer role is being considered.\nOn Monday, SEEK wrote:\nJobs for you',
    };
    expect(isSeekSuggestion(reply)).toBe(false);
    expect(extractApplication(reply)).toMatchObject({
      company: 'Acme',
      confirmed: false,
    });
  });
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
  it('does not use a receipt quoted in a reply subject as a new confirmation', () => {
    expect(
      extractApplication({
        ...email,
        subject: 'Re: Thank you for applying to Acme',
        text: 'Your application for the Designer role is being considered.',
      }),
    ).toMatchObject({ confirmed: false, appliedAt: null });
  });
  it('distinguishes receipt next-step guidance from an actual interview invitation', () => {
    expect(
      extractApplication({
        ...email,
        text: 'Thanks for applying to Acme for the Designer role. We may contact you for an interview.',
      }),
    ).toMatchObject({ confirmed: true });
    expect(
      extractApplication({
        ...email,
        subject: 'Re: Thank you for applying to Acme',
        text: 'We invite you to an interview for the Designer role.',
      }),
    ).toMatchObject({ confirmed: false, appliedAt: null });
  });
  it('rejects impossible written dates and parses valid written dates', () => {
    expect(
      extractApplication({
        ...email,
        text: 'We received your job application.\nApplication date: February 30, 2026',
      }),
    ).toMatchObject({ dateSource: 'confirmation' });
    expect(
      extractApplication({
        ...email,
        text: 'We received your job application.\nApplication date: September 10, 2026',
      }),
    ).toMatchObject({ dateSource: 'explicit', appliedAt: '2026-09-10' });
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
