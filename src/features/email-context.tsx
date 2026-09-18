import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  EMAIL_PROVIDERS,
  scanWindow,
  type EmailProvider as Provider,
} from '../domain/email';
import {
  authorizeGmail,
  disconnectGmail,
  gmailConfigured,
  gmailProfile,
  loadGoogle,
  gmailAdapter,
} from './gmail';
import {
  authorizeOutlook,
  disconnectOutlook,
  loadOutlook,
  outlookConfigured,
} from './email/outlook-auth';
import { outlookAdapter, outlookProfile } from './email/outlook';
import { EmailAuthError } from './email/provider';
import { updateMailbox } from './email/update';
import { errorMessage } from '../lib/utils';
export const PROVIDER_NAMES = { gmail: 'Gmail', outlook: 'Outlook' };
function useEmailState() {
  const [ready, setReady] = useState({ gmail: false, outlook: false });
  const [accounts, setAccounts] = useState({ gmail: '', outlook: '' });
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    for (const provider of EMAIL_PROVIDERS) {
      if (!(provider === 'gmail' ? gmailConfigured : outlookConfigured))
        continue;
      void (provider === 'gmail' ? loadGoogle() : loadOutlook())
        .then(() => setReady((value) => ({ ...value, [provider]: true })))
        .catch((e) => setError(errorMessage(e)));
    }
    return () => controller.current?.abort();
  }, []);
  function begin() {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    return true;
  }
  function finish() {
    lock.current = false;
    setBusy(false);
  }
  async function connect(provider: Provider) {
    if (!begin()) return;
    setAccounts((value) => ({ ...value, [provider]: '' }));
    try {
      await (provider === 'gmail' ? authorizeGmail() : authorizeOutlook());
      const account = await (provider === 'gmail'
        ? gmailProfile()
        : outlookProfile());
      setAccounts((value) => ({ ...value, [provider]: account }));
      setMessage(
        `${PROVIDER_NAMES[provider]} connected. Click Update to scan the past three months.`,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      finish();
    }
  }
  async function update() {
    if (!Object.values(accounts).some(Boolean) || !begin()) return;
    setUpdating(true);
    const abort = new AbortController();
    controller.current = abort;
    const window = scanWindow();
    const summaries: string[] = [];
    const failures: string[] = [];
    try {
      for (const provider of EMAIL_PROVIDERS) {
        if (!accounts[provider] || abort.signal.aborted) continue;
        try {
          const result = await updateMailbox(
            provider === 'gmail' ? gmailAdapter : outlookAdapter,
            accounts[provider],
            abort.signal,
            (progress) =>
              setMessage(`${PROVIDER_NAMES[provider]}: ${progress}`),
            window,
          );
          summaries.push(
            `${PROVIDER_NAMES[provider]}: scanned ${result.scanned} emails, added ${result.added} applications, ${result.review} new items for review.`,
          );
        } catch (e) {
          if (abort.signal.aborted) break;
          if (e instanceof EmailAuthError)
            setAccounts((value) => ({ ...value, [provider]: '' }));
          failures.push(`${PROVIDER_NAMES[provider]}: ${errorMessage(e)}`);
        }
      }
      setMessage(
        `${abort.signal.aborted ? 'Update cancelled. Imported records are kept.' : 'Update finished.'} ${summaries.join(' ')}`,
      );
      if (failures.length)
        setError(
          `${failures.join(' ')} Imported records are kept. Retry Update after resolving the connection; saved emails will not be duplicated.`,
        );
    } finally {
      controller.current = null;
      setUpdating(false);
      finish();
    }
  }
  async function disconnect(provider: Provider) {
    if (!begin()) return;
    setAccounts((value) => ({ ...value, [provider]: '' }));
    try {
      if (provider === 'outlook') setMessage(await disconnectOutlook());
      else {
        const revoked = await disconnectGmail();
        setMessage(
          revoked
            ? 'Gmail disconnected and access revoked. Your local records are kept.'
            : 'Gmail disconnected locally. Remove Roleward access in your Google Account permissions to complete revocation.',
        );
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      finish();
    }
  }
  return {
    ready,
    accounts,
    connectedCount: Object.values(accounts).filter(Boolean).length,
    busy,
    updating,
    message,
    error,
    connect,
    update,
    disconnect,
    cancel: () => controller.current?.abort(),
  };
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
