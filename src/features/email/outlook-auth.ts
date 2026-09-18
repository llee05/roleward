import {
  BrowserCacheLocation,
  PublicClientApplication,
} from '@azure/msal-browser';
import { EmailAuthError } from './provider';
export const outlookConfigured = Boolean(
  import.meta.env.VITE_MICROSOFT_CLIENT_ID,
);
export const OUTLOOK_SCOPES = ['User.Read', 'Mail.Read'];
let client: PublicClientApplication | undefined;
let initialization: Promise<void> | undefined;
let accessToken = '';
let expiresAt = 0;
export function loadOutlook() {
  if (!outlookConfigured)
    return Promise.reject(
      new Error('Set VITE_MICROSOFT_CLIENT_ID to connect Outlook.'),
    );
  if (!initialization) {
    client = new PublicClientApplication({
      auth: {
        clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: new URL(
          `${import.meta.env.BASE_URL}outlook-redirect.html`,
          window.location.origin,
        ).href,
      },
      cache: { cacheLocation: BrowserCacheLocation.MemoryStorage },
      system: {
        loggerOptions: {
          loggerCallback: () => undefined,
          piiLoggingEnabled: false,
        },
      },
    });
    initialization = client.initialize().catch(() => {
      initialization = undefined;
      client = undefined;
      throw new Error(
        'Microsoft sign-in could not initialise. Reload and try again.',
      );
    });
  }
  return initialization;
}
export async function authorizeOutlook() {
  if (!client) throw new Error('Microsoft sign-in is still loading.');
  try {
    const result = await client.acquireTokenPopup({
      scopes: OUTLOOK_SCOPES,
      prompt: 'select_account',
    });
    if (
      !result.accessToken ||
      !result.scopes.some((scope) => /(?:^|\/)Mail\.Read$/i.test(scope))
    )
      throw new Error('Read permission missing');
    accessToken = result.accessToken;
    expiresAt = result.expiresOn?.getTime() ?? Date.now();
  } catch {
    throw new Error(
      'Outlook connection was cancelled or denied. Allow the popup and grant mail read permission, then try again.',
    );
  }
}
export function getOutlookToken() {
  if (!accessToken || Date.now() >= expiresAt) {
    accessToken = '';
    throw new EmailAuthError(
      'Your Outlook session expired. Reconnect to continue.',
    );
  }
  return accessToken;
}
export async function disconnectOutlook() {
  accessToken = '';
  expiresAt = 0;
  await client?.clearCache();
  // Local cache removal is not remote consent revocation or a Microsoft-wide sign-out.
  return 'Outlook disconnected locally. To revoke consent, remove Roleward in your Microsoft account’s app permissions. Your local records are kept.';
}
