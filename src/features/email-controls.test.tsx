import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { EmailProvider } from './email-context';
import { EmailConnections } from './email-controls';

vi.mock('./gmail', () => ({ gmailConfigured: false }));
vi.mock('./email/outlook-auth', () => ({ outlookConfigured: false }));
afterEach(cleanup);

test('unconfigured providers explain how to enable connection without authorizing a mailbox', () => {
  render(
    <MemoryRouter>
      <EmailProvider>
        <EmailConnections
          workspace={{
            applications: [],
            cvs: [],
            messages: [],
            settings: [],
            error: '',
          }}
        />
      </EmailProvider>
    </MemoryRouter>,
  );

  for (const [provider, variable] of [
    ['Gmail', 'VITE_GOOGLE_CLIENT_ID'],
    ['Outlook', 'VITE_MICROSOFT_CLIENT_ID'],
  ]) {
    expect(
      screen.getByRole('button', { name: `Connect ${provider}` }),
    ).toBeDisabled();
    expect(
      screen.getByText(new RegExp(`${provider} connection is not configured`)),
    ).toHaveTextContent(
      `Open ${provider} setup for the website owner below for instructions.`,
    );
    const summary = screen.getByText(
      `${provider} setup for the website owner`,
      { exact: true },
    );
    fireEvent.click(summary);
    const setup = summary.closest('details')!;
    expect(setup).toHaveAttribute('open');
    expect(within(setup).getAllByText(variable).length).toBeGreaterThan(0);
    expect(
      within(setup).getByText('.env.local', { exact: true }),
    ).toBeVisible();
  }
  expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
});
