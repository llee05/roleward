import { Link } from 'react-router-dom';

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
              <strong>Connection not configured:</strong> email connection is
              unavailable on this website. You can still upload CVs and track
              applications manually.
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
