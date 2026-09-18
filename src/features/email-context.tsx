import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  authorizeGmail,
  disconnectGmail,
  gmailConfigured,
  gmailProfile,
  loadGoogle,
  syncGmail,
} from './gmail';
import { errorMessage } from '../lib/utils';
function useEmailState() {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (gmailConfigured)
      void loadGoogle()
        .then(() => setReady(true))
        .catch((e) => setError(errorMessage(e)));
  }, []);
  async function connect() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await authorizeGmail();
      setAccount(await gmailProfile());
      setMessage('Gmail connected. You can now sync application emails.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function sync() {
    setBusy(true);
    setError('');
    try {
      const result = await syncGmail(setMessage);
      setMessage(
        `Synced ${result.processed} threads. Review new emails in Applications.${result.limited ? ' Discovery is limited to the latest 100 matching threads.' : ''}`,
      );
    } catch (e) {
      setMessage('');
      setError(
        `${errorMessage(e)} Already imported emails are safe; retry will not duplicate them.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    setError('');
    try {
      const revoked = await disconnectGmail();
      setAccount('');
      setMessage(
        revoked
          ? 'Gmail disconnected and access revoked. Your local records are kept.'
          : 'Disconnected locally. Remove Roleward access in your Google Account permissions to complete revocation.',
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { ready, account, busy, message, error, connect, sync, disconnect };
}
const EmailContext = createContext<ReturnType<typeof useEmailState> | null>(
  null,
);
export function EmailProvider({ children }: { children: ReactNode }) {
  const state = useEmailState();
  return (
    <EmailContext.Provider value={state}>{children}</EmailContext.Provider>
  );
}
export function useEmail() {
  const context = useContext(EmailContext);
  if (!context) throw new Error('Email context missing');
  return context;
}
