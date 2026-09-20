import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.google = { accounts: { oauth2: { initTokenClient: c => ({ requestAccessToken: () => c.callback({ access_token: 'test-only-token', expires_in: 3600, scope: 'https://www.googleapis.com/auth/gmail.readonly' }) }), revoke: (_t, cb) => cb({ successful: true }) } } };`,
    }),
  );
});
test('Workspace email help supports keyboard setup, current URLs, and application navigation', async ({
  page,
}) => {
  await page.goto('#/settings');
  const guide = page.getByRole('region', { name: 'How to connect your email' });
  await expect(guide).toBeVisible();

  for (const provider of ['Gmail', 'Outlook']) {
    const setup = page.locator('details').filter({
      has: page.locator('summary', {
        hasText: `${provider} setup for the website owner`,
      }),
    });
    await expect(setup).not.toHaveAttribute('open');
    await setup.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(setup).toHaveAttribute('open', '');
    const expectedUrl =
      provider === 'Gmail'
        ? new URL(page.url()).origin
        : `${new URL(page.url()).origin}/roleward/outlook-redirect.html`;
    await expect(
      setup.locator('code').filter({ hasText: expectedUrl }).first(),
    ).toHaveText(expectedUrl);
    await expect(setup.getByText('.env.local', { exact: true })).toBeVisible();
    await expect(
      setup.getByRole('link', { name: /Official .* app registration guide/ }),
    ).toHaveAttribute('href', /^https:\/\//);
  }

  await guide
    .locator('summary', { hasText: 'Trouble connecting or updating?' })
    .click();
  await expect(
    guide.getByText('Popup blocked or access denied:', { exact: true }),
  ).toBeVisible();
  await guide
    .locator('summary', { hasText: 'What happens when I disconnect?' })
    .click();
  await expect(
    guide.getByText(/Outlook disconnect does not revoke Microsoft consent/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await guide.getByRole('link', { name: 'Applications', exact: true }).click();
  await expect(page).toHaveURL(/#\/applications$/);
});
test('CV versions, application edits, metrics, and reload persist locally', async ({
  page,
}) => {
  await page.goto('#/documents');
  await page.getByLabel('Choose CV file').setInputFiles({
    name: 'cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test CV bytes'),
  });
  await page.getByLabel('Version label').fill('Design CV');
  await page.getByRole('button', { name: 'Save CV version' }).click();
  await expect(page.getByRole('heading', { name: 'Design CV' })).toBeVisible();
  await page.getByLabel('Choose CV file').setInputFiles({
    name: 'cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 second CV'),
  });
  await page.getByLabel('Version label').fill('General CV');
  await page.getByRole('button', { name: 'Save CV version' }).click();
  await expect(page.getByRole('heading', { name: 'General CV' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download', exact: true })
    .first()
    .click();
  expect((await download).suggestedFilename()).toBe('cv.pdf');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /^Applications/ })
    .click();
  await page
    .getByRole('button', { name: 'Add application', exact: true })
    .click();
  await page.getByLabel('Company', { exact: true }).fill('Acme Studio');
  await page.getByLabel('Role', { exact: true }).fill('Product designer');
  await page.getByLabel('CV version used').selectOption({
    label: await page
      .getByLabel('CV version used')
      .locator('option')
      .filter({ hasText: 'Design CV' })
      .innerText(),
  });
  await page.getByRole('button', { name: 'Save application' }).click();
  await expect(
    page.getByRole('button', { name: 'Acme Studio Product designer' }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Edit Acme Studio' }).click();
  await page
    .getByRole('combobox', { name: 'Status', exact: true })
    .selectOption('interview');
  await page.getByRole('button', { name: 'Save application' }).click();
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Total applications' })
      .locator('strong'),
  ).toHaveText('1');
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'In interviews' })
      .locator('strong'),
  ).toHaveText('1');
  await page.getByRole('link', { name: 'CV library' }).click();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Design CV' }).click();
  await expect(
    page.getByRole('heading', { name: 'Design CV', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'General CV' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /^Applications/ })
    .click();
  await page.getByRole('button', { name: 'Edit Acme Studio' }).click();
  await expect(page.getByLabel('CV version used')).toHaveValue('');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Acme Studio Product designer' }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('Gmail and Outlook Update extract applications, preserve edits and avoid duplicates', async ({
  page,
}) => {
  await page.route('**/src/features/email/outlook-auth.ts', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export const outlookConfigured = true; export const loadOutlook = async () => {}; export const authorizeOutlook = async () => {}; export const getOutlookToken = () => 'outlook-test-token'; export const disconnectOutlook = async () => 'Outlook disconnected locally.';`,
    }),
  );
  const receivedAt = new Date(Date.now() - 86400000).toISOString();
  await page.route('https://gmail.googleapis.com/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/profile'))
      return route.fulfill({ json: { emailAddress: 'test@example.com' } });
    if (url.pathname.endsWith('/messages'))
      return route.fulfill({ json: { messages: [{ id: 'message1' }] } });
    return route.fulfill({
      json: {
        id: 'message1',
        threadId: 'thread1',
        internalDate: String(Date.parse(receivedAt)),
        payload: {
          headers: [
            { name: 'Subject', value: 'Thanks for applying to Acme' },
            { name: 'From', value: 'recruiter@example.com' },
          ],
          mimeType: 'text/plain',
          body: {
            data: Buffer.from(
              'We received your application for the Designer role.',
            ).toString('base64url'),
          },
        },
      },
    });
  });
  await page.route('https://graph.microsoft.com/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/me'))
      return route.fulfill({ json: { mail: 'test@example.com' } });
    return route.fulfill({
      json: {
        value: [
          {
            id: 'message1',
            conversationId: 'thread1',
            receivedDateTime: receivedAt,
            subject: 'Thank you for applying to Contoso',
            from: { emailAddress: { address: 'jobs@contoso.example' } },
            body: {
              contentType: 'text',
              content: 'We received your application for the Engineer role.',
            },
            webLink: 'https://outlook.live.com/mail/0/inbox/id/message1',
          },
          {
            id: 'newsletter',
            conversationId: 'other',
            receivedDateTime: receivedAt,
            subject: 'Weekly news',
            body: { contentType: 'text', content: 'Enjoy this week’s news.' },
          },
        ],
      },
    });
  });
  await page.goto('#/settings');
  await page
    .getByRole('button', { name: 'Connect Gmail', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Connect Outlook', exact: true })
    .click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Gmail: scanned 1 emails, added 1 applications',
  );
  await expect(page.getByRole('status')).toContainText(
    'Outlook: scanned 2 emails, added 1 applications',
  );
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /^Applications/ })
    .click();
  await expect(page.getByRole('button', { name: 'Tracked 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Contoso' }).click();
  await expect(page.getByLabel('Role', { exact: true })).toHaveValue(
    'Engineer',
  );
  await expect(page.getByText(/Application date is estimated/)).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open in Outlook' }),
  ).toHaveAttribute(
    'href',
    'https://outlook.live.com/mail/0/inbox/id/message1',
  );
  await page.getByLabel('Company', { exact: true }).fill('Contoso corrected');
  await page.getByLabel(/^Application date/).fill('2026-01-02');
  await page.getByRole('button', { name: 'Save application' }).click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Outlook: scanned 2 emails, added 0 applications',
  );
  await expect(page.getByRole('button', { name: 'Tracked 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Contoso corrected' }).click();
  await expect(page.getByLabel(/^Application date/)).toHaveValue('2026-01-02');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Outlook: scanned 2 emails, added 0 applications',
  );
  await expect(page.getByRole('button', { name: 'Tracked 1' })).toBeVisible();
  await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  await page
    .getByRole('button', { name: 'Disconnect Gmail', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('access revoked');
  await page
    .getByRole('button', { name: 'Disconnect Outlook', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Update', exact: true }),
  ).toBeDisabled();
  await page.getByRole('link', { name: 'Overview' }).click();
  await page.reload();
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Total applications' })
      .locator('strong'),
  ).toHaveText('1');
  const browserStorage = await page.evaluate(
    () => JSON.stringify(localStorage) + JSON.stringify(sessionStorage),
  );
  expect(browserStorage).not.toContain('test-only-token');
  expect(browserStorage).not.toContain('outlook-test-token');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('clearing email review can be cancelled and stays cleared after reload and update', async ({
  page,
}) => {
  await page.route('https://gmail.googleapis.com/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/profile'))
      return route.fulfill({ json: { emailAddress: 'test@example.com' } });
    if (url.pathname.endsWith('/messages'))
      return route.fulfill({
        json: {
          messages: [
            { id: 'receipt' },
            { id: 'review-one' },
            { id: 'review-two' },
          ],
        },
      });
    const id = url.pathname.split('/').at(-1)!;
    const receipt = id === 'receipt';
    return route.fulfill({
      json: {
        id,
        threadId: id,
        internalDate: String(Date.now() - 86400000),
        payload: {
          headers: [
            {
              name: 'Subject',
              value: receipt
                ? 'Thank you for applying to Acme'
                : `Interview invitation ${id}`,
            },
          ],
          mimeType: 'text/plain',
          body: {
            data: Buffer.from(
              receipt
                ? 'We received your application for the Designer role.'
                : 'Your application for the Engineer role at Contoso has progressed.',
            ).toString('base64url'),
          },
        },
      },
    });
  });
  await page.goto('#/settings');
  await page
    .getByRole('button', { name: 'Connect Gmail', exact: true })
    .click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Update', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /^Applications/ })
    .click();
  await page
    .getByRole('button', { name: 'Email review 2', exact: true })
    .click();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Clear 2 review items');
    expect(dialog.message()).toContain(
      'Future updates will ignore these conversations',
    );
    await dialog.dismiss();
  });
  await page
    .getByRole('button', { name: 'Clear review queue', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /Interview invitation/ }),
  ).toHaveCount(2);
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Clear review queue', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Cleared 2 review items.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'All caught up' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Clear review queue', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Tracked 1', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole('button', { name: 'Email review 0', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'All caught up' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Go to email connection' }).click();
  await page
    .getByRole('button', { name: 'Connect Gmail', exact: true })
    .click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Update', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /^Applications/ })
    .click();
  await expect(
    page.getByRole('button', { name: 'Email review 0', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tracked 1', exact: true }),
  ).toBeVisible();
});

test('partial update preserves imports and keeps ambiguous replies out of statistics', async ({
  page,
}) => {
  await page.route('https://gmail.googleapis.com/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/profile'))
      return route.fulfill({ json: { emailAddress: 'test@example.com' } });
    if (url.pathname.endsWith('/messages'))
      return route.fulfill({
        json: {
          messages: [{ id: 'receipt' }, { id: 'interview' }, { id: 'expired' }],
        },
      });
    if (url.pathname.endsWith('/expired'))
      return route.fulfill({ status: 401, json: {} });
    const interview = url.pathname.endsWith('/interview');
    return route.fulfill({
      json: {
        id: interview ? 'interview' : 'receipt',
        threadId: interview ? 'review-thread' : 'confirmed-thread',
        internalDate: String(Date.now() - 86400000),
        payload: {
          headers: [
            {
              name: 'Subject',
              value: interview
                ? 'Interview invitation'
                : 'Thank you for applying to Acme',
            },
          ],
          mimeType: 'text/plain',
          body: {
            data: Buffer.from(
              interview
                ? 'Your application for the Engineer role at Contoso has progressed.'
                : 'We received your application for the Designer role.',
            ).toString('base64url'),
          },
        },
      },
    });
  });
  await page.goto('#/settings');
  await page
    .getByRole('button', { name: 'Connect Gmail', exact: true })
    .click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Reconnect to continue');
  await expect(
    page.getByRole('button', { name: 'Connect Gmail', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /^Applications/ })
    .click();
  await page.getByRole('button', { name: 'Email review 1' }).click();
  await page.getByRole('button', { name: /Interview invitation/ }).click();
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue(
    'Contoso',
  );
  await expect(page.getByLabel(/^Application date/)).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Total applications' })
      .locator('strong'),
  ).toHaveText('1');
});
