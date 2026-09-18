import { Link } from 'react-router-dom';
import { Mail, RefreshCw, Unplug } from 'lucide-react';
import { Button } from '../components/ui/button';
import { EMAIL_PROVIDERS } from '../domain/email';
import { PROVIDER_NAMES, useEmail } from './email-context';
import { gmailConfigured } from './gmail';
import { outlookConfigured } from './email/outlook-auth';
import type { Workspace } from './workspace';
export function UpdateControls() {
  const email = useEmail();
  return (
    <section className="email-update" aria-label="Email update">
      <div className="settings-actions">
        <Button
          disabled={!email.connectedCount || email.busy}
          onClick={() => void email.update()}
        >
          <RefreshCw size={16} className={email.updating ? 'spin' : ''} />
          {email.updating ? 'Updating…' : 'Update'}
        </Button>
        {email.updating && (
          <Button variant="outline" onClick={email.cancel}>
            Cancel update
          </Button>
        )}
        {!email.connectedCount && (
          <Link to="/settings">Connect Gmail or Outlook to update</Link>
        )}
      </div>
      <p className="field-hint">
        Scan the past three months. Clear application confirmations are added
        automatically; uncertain emails go to Email review. Check extracted
        details and estimated dates.
      </p>
      {email.message && (
        <p role="status" className="notice">
          {email.message}
        </p>
      )}
      {email.error && (
        <p role="alert" className="notice notice-error">
          {email.error}
        </p>
      )}
    </section>
  );
}
export function EmailConnections({ workspace }: { workspace: Workspace }) {
  const email = useEmail();
  return (
    <>
      {EMAIL_PROVIDERS.map((provider) => {
        const name = PROVIDER_NAMES[provider];
        const configured =
          provider === 'gmail' ? gmailConfigured : outlookConfigured;
        const account = email.accounts[provider];
        const lastSync = workspace.settings.find(
          (s) => s.key === `lastSync:${provider}:${account.toLowerCase()}`,
        )?.value;
        return (
          <section className="panel settings-panel" key={provider}>
            <div className="panel-heading">
              <div className="settings-title">
                <span className="service-icon">
                  <Mail size={25} />
                </span>
                <div>
                  <h2>{name} connection</h2>
                  <p>
                    {provider === 'outlook'
                      ? 'Outlook.com and Microsoft 365 mailboxes.'
                      : 'Your Google mailbox.'}
                  </p>
                </div>
              </div>
              <span className={`connection-pill ${account ? 'connected' : ''}`}>
                <span />
                {account ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div className="settings-body">
              <h3>
                {account || 'Bring your application correspondence together.'}
              </h3>
              <p>
                Read-only access. Update when you choose. Relevant emails stay
                in this browser.
              </p>
              {!configured && (
                <p className="notice">
                  {name} connection is not configured for this website. CVs and
                  manual applications are available.
                </p>
              )}
              <div className="settings-actions">
                <Button
                  disabled={!configured || !email.ready[provider] || email.busy}
                  onClick={() => void email.connect(provider)}
                >
                  <Mail size={17} />
                  {account ? `Reconnect ${name}` : `Connect ${name}`}
                </Button>
                {account && (
                  <Button
                    variant="ghost"
                    disabled={email.busy}
                    onClick={() => void email.disconnect(provider)}
                  >
                    <Unplug size={16} />
                    Disconnect {name}
                  </Button>
                )}
              </div>
              <p className="field-hint">
                {lastSync
                  ? `Last completed update: ${new Date(lastSync).toLocaleString()}`
                  : 'No completed update for this connection yet.'}{' '}
                Reconnect after reloading or session expiry.
              </p>
            </div>
          </section>
        );
      })}
      <UpdateControls />
    </>
  );
}
