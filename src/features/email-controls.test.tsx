import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { EmailProvider } from './email-context';
import { EmailConnections } from './email-controls';

vi.mock('./gmail', () => ({ gmailConfigured: false }));
vi.mock('./email/outlook-auth', () => ({ outlookConfigured: false }));
afterEach(cleanup);

test('unconfigured providers explain availability without website-owner setup', () => {
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

  for (const provider of ['Gmail', 'Outlook']) {
    expect(
      screen.getByRole('button', { name: `Connect ${provider}` }),
    ).toBeDisabled();
    expect(
      screen.getByText(new RegExp(`${provider} connection is not configured`)),
    ).toHaveTextContent('CVs and manual applications are available.');
  }
  expect(
    screen.queryByText(/setup for the website owner/),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/VITE_.*_CLIENT_ID/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
});
