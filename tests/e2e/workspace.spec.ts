import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.google = { accounts: { oauth2: { initTokenClient: c => ({ requestAccessToken: () => c.callback({ access_token: 'test-only-token', expires_in: 3600, scope: 'https://www.googleapis.com/auth/gmail.readonly' }) }), revoke: (_t, cb) => cb({ successful: true }) } } };`,
    }),
  );
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
  await page.getByRole('link', { name: /^Applications/ }).click();
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
  await page.getByRole('link', { name: /^Applications/ }).click();
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
test('Gmail fixture sync, review, repeat sync and disconnect', async ({
  page,
}) => {
  await page.route('https://gmail.googleapis.com/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/profile'))
      return route.fulfill({ json: { emailAddress: 'test@example.com' } });
    if (url.pathname.endsWith('/threads'))
      return route.fulfill({ json: { threads: [{ id: 'thread1' }] } });
    return route.fulfill({
      json: {
        messages: [
          {
            id: 'message1',
            internalDate: String(Date.now()),
            snippet: 'Thanks for your application.',
            payload: {
              headers: [
                { name: 'Subject', value: 'Your application to Acme' },
                { name: 'From', value: 'recruiter@example.com' },
              ],
              mimeType: 'text/plain',
              body: {
                data: Buffer.from(
                  'Thanks for applying. We will be in touch.',
                ).toString('base64url'),
              },
            },
          },
        ],
      },
    });
  });
  await page.goto('#/settings');
  await page.getByRole('button', { name: 'Connect Gmail' }).click();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByRole('status')).toContainText('Synced 1 threads');
  await page.getByRole('link', { name: /^Applications/ }).click();
  await page.getByRole('button', { name: 'Email review 1' }).click();
  await page.getByRole('button', { name: /Your application to Acme/ }).click();
  await expect(
    page.getByText('Thanks for applying. We will be in touch.'),
  ).toBeVisible();
  await page.getByLabel('Company', { exact: true }).fill('Acme');
  await page.getByRole('button', { name: 'Confirm application' }).click();
  await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByRole('status')).toContainText('Synced 1 threads');
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('access revoked');
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Total applications' })
      .locator('strong'),
  ).toHaveText('1');
  await page.reload();
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Total applications' })
      .locator('strong'),
  ).toHaveText('1');
  expect(
    await page.evaluate(
      () => JSON.stringify(localStorage) + JSON.stringify(sessionStorage),
    ),
  ).not.toContain('test-only-token');
});
