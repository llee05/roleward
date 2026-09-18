import { afterEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  acquireTokenPopup: vi.fn(),
  clearCache: vi.fn().mockResolvedValue(undefined),
  config: vi.fn(),
}));
vi.mock('@azure/msal-browser', () => ({
  BrowserCacheLocation: { MemoryStorage: 'memoryStorage' },
  PublicClientApplication: class {
    constructor(config: unknown) {
      sdk.config(config);
    }
    initialize = sdk.initialize;
    acquireTokenPopup = sdk.acquireTokenPopup;
    clearCache = sdk.clearCache;
  },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});
it('uses popup auth, read permissions, memory storage, and the dedicated Pages callback', async () => {
  vi.stubEnv('VITE_MICROSOFT_CLIENT_ID', 'public-test-id');
  vi.stubEnv('BASE_URL', '/roleward/');
  const auth = await import('./outlook-auth');
  await auth.loadOutlook();
  expect(sdk.config).toHaveBeenCalledWith(
    expect.objectContaining({
      cache: { cacheLocation: 'memoryStorage' },
      auth: expect.objectContaining({
        redirectUri: expect.stringContaining('/roleward/outlook-redirect.html'),
      }),
    }),
  );
  sdk.acquireTokenPopup.mockResolvedValue({
    accessToken: 'fake',
    scopes: ['Mail.Read'],
    expiresOn: new Date(Date.now() + 60000),
  });
  await auth.authorizeOutlook();
  expect(auth.getOutlookToken()).toBe('fake');
  expect(sdk.acquireTokenPopup).toHaveBeenCalledWith({
    scopes: ['User.Read', 'Mail.Read'],
    prompt: 'select_account',
  });
  await auth.disconnectOutlook();
  expect(sdk.clearCache).toHaveBeenCalled();
  expect(() => auth.getOutlookToken()).toThrow('expired');
});
it('does not accept a token without mail read permission', async () => {
  vi.stubEnv('VITE_MICROSOFT_CLIENT_ID', 'public-test-id');
  vi.stubEnv('BASE_URL', '/roleward/');
  const auth = await import('./outlook-auth');
  await auth.loadOutlook();
  sdk.acquireTokenPopup.mockResolvedValue({
    accessToken: 'fake',
    scopes: ['User.Read'],
  });
  await expect(auth.authorizeOutlook()).rejects.toThrow('permission');
  expect(() => auth.getOutlookToken()).toThrow();
});
