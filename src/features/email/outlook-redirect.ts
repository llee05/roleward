import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';
void broadcastResponseToMainFrame().catch(() => {
  document.getElementById('connection-status')!.textContent =
    'Could not complete sign-in. Close this window and reconnect from Roleward.';
});
