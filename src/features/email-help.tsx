import { Link } from 'react-router-dom';
import type { EmailProvider } from '../domain/email';

export function EmailConnectionGuide() {
  return (
    <section
      className="panel settings-panel email-help"
      aria-labelledby="email-guide-title"
    >
      <div className="panel-heading">
        <h2 id="email-guide-title">How to connect your email</h2>
      </div>
      <div className="settings-body">
        <ol>
          <li>
            Choose Connect Gmail or Connect Outlook below. You can connect one
            account from each provider.
          </li>
          <li>
            Sign in in the provider popup and approve read-only mailbox access.
            Roleward cannot send, edit, or delete your mail.
          </li>
          <li>
            Click Update and keep this page open. It scans the past three
            calendar months; large mailboxes can take a while. Updates only run
            when you start them.
          </li>
          <li>
            Open <Link to="/applications">Applications</Link> to check imported
            details and estimated dates. Uncertain correspondence appears in
            Email review and only counts in statistics after you confirm it.
          </li>
        </ol>
        <p>
          Access lets Roleward read your mailbox, even though only relevant
          correspondence is saved. Processing happens in this browser. Repeating
          Update preserves your corrections and avoids importing the same emails
          twice.
        </p>
        <details>
          <summary>Trouble connecting or updating?</summary>
          <ul>
            <li>
              <strong>Connection not configured:</strong> the website owner
              needs to complete the provider setup below. If you run this site
              yourself, follow those steps. CVs and manual applications still
              work.
            </li>
            <li>
              <strong>Popup blocked or access denied:</strong> allow popups for
              this site, click Connect again, and approve mail read access. For
              Gmail testing, the owner must add your Google account as a test
              user. Work or school Microsoft accounts may need administrator
              consent.
            </li>
            <li>
              <strong>Button still unavailable:</strong> wait for sign-in to
              load and any current operation to finish. If loading fails, check
              your connection and reload.
            </li>
            <li>
              <strong>Session expired or page reloaded:</strong> click Reconnect
              (or Connect if disconnected), then Update. Authorization stays in
              memory; your saved records remain in this browser.
            </li>
            <li>
              <strong>Update failed or was cancelled:</strong> records already
              imported are kept. Check the error, reconnect if requested, and
              retry Update.
            </li>
            <li>
              <strong>An application is missing:</strong> older emails and
              unusual or non-English templates may be missed. Check Email review
              or add the application manually.
            </li>
          </ul>
        </details>
        <details>
          <summary>What happens when I disconnect?</summary>
          <p>
            Disconnect stops future access and clears local authorization. Your
            saved applications, emails, and CVs remain. Gmail also attempts to
            revoke access; if that fails, remove access in your Google Account
            settings. Outlook disconnect does not revoke Microsoft consent or
            sign you out of Microsoft; remove consent separately in your
            Microsoft account’s app permissions.
          </p>
          <p>
            Records belong to this browser and site. Clearing site data can
            delete them, and there is no cloud backup or cross-device sync.
          </p>
        </details>
      </div>
    </section>
  );
}

export function EmailProviderSetup({ provider }: { provider: EmailProvider }) {
  const gmail = provider === 'gmail';
  const name = gmail ? 'Gmail' : 'Outlook';
  const variable = gmail ? 'VITE_GOOGLE_CLIENT_ID' : 'VITE_MICROSOFT_CLIENT_ID';
  const origin = window.location.origin;
  const redirectUri = new URL(
    `${import.meta.env.BASE_URL}outlook-redirect.html`,
    origin,
  ).href;

  return (
    <details className="email-help provider-setup">
      <summary>{name} setup for the website owner</summary>
      <p>
        This is a one-time setup for the website. People connecting a mailbox to
        an already configured site can use Connect above.
      </p>
      {gmail ? (
        <ol>
          <li>
            In{' '}
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Google Cloud Console
            </a>
            , create or select a project and enable the Gmail API.
          </li>
          <li>
            Configure the OAuth consent screen and add your Google account as a
            test user if the app is in testing. Configure the read scope{' '}
            <code>https://www.googleapis.com/auth/gmail.readonly</code>. Public
            access may require Google verification.
          </li>
          <li>
            Create an OAuth client with the Web application type. Add{' '}
            <code>{origin}</code> to Authorized JavaScript origins for this
            site. Origins contain the scheme, host, and port, with no path or
            hash. For local development, add <code>http://localhost</code> and{' '}
            <code>http://localhost:5173</code>; register your deployed origin
            too.
          </li>
          <li>
            Copy the client ID into <code>{variable}</code> using the
            configuration steps below.
          </li>
        </ol>
      ) : (
        <ol>
          <li>
            In the{' '}
            <a
              href="https://entra.microsoft.com/"
              target="_blank"
              rel="noreferrer"
            >
              Microsoft Entra admin center
            </a>
            , open App registrations and create a registration supporting
            accounts in any organizational directory and personal Microsoft
            accounts.
          </li>
          <li>
            Under Authentication, add a Single-page application platform with
            this exact redirect URI: <code>{redirectUri}</code>. For local
            development also register{' '}
            <code>http://localhost:5173/roleward/outlook-redirect.html</code>,
            and register the equivalent URL on your deployed site. Do not use
            the settings page URL or a hash route.
          </li>
          <li>
            Add Microsoft Graph delegated permissions <code>User.Read</code> and{' '}
            <code>Mail.Read</code>. Your organization may require administrator
            consent. Leave implicit grant disabled.
          </li>
          <li>
            Copy the Application (client) ID into <code>{variable}</code> using
            the configuration steps below.
          </li>
        </ol>
      )}
      <p>
        <strong>Running locally:</strong> copy <code>.env.example</code> to{' '}
        <code>.env.local</code> in the project root, set <code>{variable}</code>{' '}
        to your client ID, and restart Vite.
      </p>
      <p>
        <strong>GitHub Pages:</strong> in the repository’s Settings → Secrets
        and variables → Actions → Variables, add <code>{variable}</code> as a
        repository variable, then rebuild and deploy the site. Reload after
        deployment; changing a variable does not update an existing build.
      </p>
      <p>
        Use only the public client ID. Never put a client secret, password, or
        mailbox token in these variables.
      </p>
      <p>
        <a
          href={
            gmail
              ? 'https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid'
              : 'https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app'
          }
          target="_blank"
          rel="noreferrer"
        >
          Official {name === 'Gmail' ? 'Google' : 'Microsoft'} app registration
          guide
        </a>
      </p>
    </details>
  );
}
