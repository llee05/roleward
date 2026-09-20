import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleHelp,
  FileText,
  FolderOpen,
  Inbox,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/dialog';
import { metrics } from '../domain/metrics';
import type { Application, Cv } from '../domain/models';
import { STATUS_LABELS } from '../domain/application-statuses';
import { displayDate, errorMessage } from '../lib/utils';
import {
  clearReviewQueue,
  removeCv,
  renameCv,
  uploadCv,
} from '../persistence/repository';
import { ApplicationEditor } from './application-editor';
import type { Workspace } from './workspace';
import { useEmail } from './email-context';
import { EmailConnections, UpdateControls } from './email-controls';
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function Status({ application }: { application: Application }) {
  return (
    <span className={`status status-${application.status}`}>
      <span />
      {STATUS_LABELS[application.status]}
    </span>
  );
}
function ApplicationRows({
  applications,
  workspace,
  onSelect,
}: {
  applications: Application[];
  workspace: Workspace;
  onSelect: (a: Application) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="application-table">
        <thead>
          <tr>
            <th>Company & role</th>
            <th>Applied</th>
            <th>Status</th>
            <th>CV version</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id}>
              <td>
                <button className="company-cell" onClick={() => onSelect(a)}>
                  <span className="company-logo">
                    {(a.company || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{a.company || 'Unknown company'}</strong>
                    <small>{a.role || 'Role not recorded'}</small>
                  </span>
                </button>
              </td>
              <td>{displayDate(a.appliedAt)}</td>
              <td>
                <Status application={a} />
              </td>
              <td className="cv-cell">
                {workspace.cvs.find((c) => c.id === a.cvId)?.label ||
                  'Not recorded'}
              </td>
              <td>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${a.company || 'application'}`}
                  onClick={() => onSelect(a)}
                >
                  <ArrowUpRight size={18} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Dashboard({ workspace }: { workspace: Workspace }) {
  const stats = metrics(workspace.applications);
  const email = useEmail();
  const [selected, setSelected] = useState<Application | 'new' | null>(null);
  const confirmed = workspace.applications
    .filter((a) => a.confirmed)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pending = workspace.applications.filter((a) => !a.confirmed).length;
  const cards = [
    {
      label: 'Total applications',
      value: stats.total,
      icon: <BriefcaseBusiness size={19} />,
      note: 'Every step counts',
    },
    {
      label: 'Applied this week',
      value: stats.recent,
      icon: <CalendarDays size={19} />,
      note: 'Over the last 7 days',
    },
    {
      label: 'In interviews',
      value: stats.statuses.find((s) => s.status === 'interview')!.count,
      icon: <Mail size={19} />,
      note: 'Conversations in progress',
    },
    {
      label: 'CV versions',
      value: workspace.cvs.length,
      icon: <FileText size={19} />,
      note: 'Ready for your next opportunity',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT CHAPTER"
        title="A little progress, every day."
        description="Your job search, brought together. Make room for what comes next."
        action={
          <Button onClick={() => setSelected('new')}>
            <Plus size={17} /> Add application
          </Button>
        }
      />
      {(!email.connectedCount || !workspace.cvs.length) && (
        <div className="welcome-banner">
          <span className="banner-icon">
            <Sparkles size={24} />
          </span>
          <div>
            <strong>Your next opportunity starts here.</strong>
            <p>
              {workspace.cvs.length
                ? 'Connect your inbox to bring application emails into one place.'
                : 'Add your CV and connect your inbox. We’ll help you keep track.'}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={workspace.cvs.length ? '/settings' : '/documents'}>
              {workspace.cvs.length
                ? 'Connect your inbox'
                : 'Upload your first CV'}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      )}
      <div className="stats-grid">
        {cards.map((card) => (
          <article className="stat-card" key={card.label}>
            <div>
              <span>{card.label}</span>
              {card.icon}
            </div>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Application activity</h2>
              <p>Small steps add up.</p>
            </div>
            <span className="period-label">Last 14 days</span>
          </div>
          <div
            className="activity-bars"
            role="img"
            aria-label={`Daily applications over 14 days. ${stats.days.reduce((sum, d) => sum + d.count, 0)} total. Exact counts in the table below.`}
          >
            {stats.days.map((day) => (
              <div className="bar-column" key={day.date}>
                <span className="bar-value">{day.count || ''}</span>
                <div
                  className={`bar ${day.count ? 'bar-active' : ''}`}
                  style={{
                    height: `${Math.max(4, (day.count / Math.max(1, ...stats.days.map((d) => d.count))) * 110)}px`,
                  }}
                />
                <span>{new Date(`${day.date}T12:00:00`).getDate()}</span>
              </div>
            ))}
          </div>
          <div className="activity-footer">
            <span>
              <i /> Applications submitted
            </span>
            <span>{stats.undated} with date unknown</span>
          </div>
          <details className="daily-details">
            <summary>View daily counts</summary>
            <table>
              <caption className="sr-only">Applications per day</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Applications</th>
                </tr>
              </thead>
              <tbody>
                {stats.days.map((d) => (
                  <tr key={d.date}>
                    <td>{displayDate(d.date)}</td>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Where things stand</h2>
              <p>A snapshot of your search.</p>
            </div>
            <CircleHelp size={17} className="muted" />
          </div>
          <div className="status-list">
            {stats.statuses.map((s) => (
              <div key={s.status}>
                <span className={`status-dot dot-${s.status}`} />
                <span>{STATUS_LABELS[s.status]}</span>
                <div className="status-track">
                  <div
                    className={`fill-${s.status}`}
                    style={{
                      width: `${stats.total ? (s.count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{s.count}</strong>
              </div>
            ))}
          </div>
          <p className="panel-footnote">An outcome is progress, too.</p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Recent applications{' '}
              {stats.total > 0 && <span className="count">{stats.total}</span>}
            </h2>
            <p>Your latest moves, all in one place.</p>
          </div>
          <Button asChild variant="ghost" size="small">
            <Link to="/applications">
              View all <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        {confirmed.length ? (
          <ApplicationRows
            applications={confirmed.slice(0, 5)}
            workspace={workspace}
            onSelect={setSelected}
          />
        ) : (
          <Empty
            icon={<BriefcaseBusiness size={25} />}
            title="A fresh start for your search"
          >
            <p>
              Add your first application, or connect Gmail or Outlook to review
              application emails.
            </p>
            <Button variant="outline" onClick={() => setSelected('new')}>
              <Plus size={16} /> Add an application
            </Button>
          </Empty>
        )}
      </section>
      {pending > 0 && (
        <Link className="review-banner" to="/applications">
          <Inbox size={20} /> {pending} email{' '}
          {pending === 1 ? 'thread is' : 'threads are'} ready for review{' '}
          <ArrowRight size={17} />
        </Link>
      )}
      <div className="page-footer">
        <ShieldCheck size={15} /> Your workspace stays in this browser.
        <span>One step closer.</span>
      </div>
      {selected && (
        <ApplicationEditor
          application={selected === 'new' ? undefined : selected}
          workspace={workspace}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
export function Applications({ workspace }: { workspace: Workspace }) {
  const [selected, setSelected] = useState<Application | 'new' | null>(null);
  const [tab, setTab] = useState<'tracked' | 'review'>('tracked');
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [clearMessage, setClearMessage] = useState('');
  const email = useEmail();
  const confirmed = workspace.applications
    .filter((a) => a.confirmed)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pending = workspace.applications.filter((a) => !a.confirmed);
  async function clearReview() {
    if (clearing || email.busy || !pending.length) return;
    const ids = pending.map((application) => application.id);
    if (
      !window.confirm(
        `Clear ${ids.length} review ${ids.length === 1 ? 'item' : 'items'} and their saved emails from this browser? Future updates will ignore these conversations. Tracked applications, CVs, and messages in your mailbox will be kept. This cannot be undone.`,
      )
    )
      return;
    setClearing(true);
    setClearError('');
    setClearMessage('');
    try {
      const count = await clearReviewQueue(ids);
      setClearMessage(
        `Cleared ${count} review ${count === 1 ? 'item' : 'items'}.`,
      );
    } catch (error) {
      setClearError(
        `Could not clear the review queue. No items were removed. ${errorMessage(error)}`,
      );
    } finally {
      setClearing(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="KEEP MOVING FORWARD"
        title="Your applications"
        description="Every opportunity, conversation, and next step in one place."
        action={
          <Button onClick={() => setSelected('new')}>
            <Plus size={17} /> Add application
          </Button>
        }
      />
      <UpdateControls />
      <div className="tabs" role="group" aria-label="Application view">
        <button
          className={tab === 'tracked' ? 'active' : ''}
          aria-pressed={tab === 'tracked'}
          onClick={() => setTab('tracked')}
        >
          Tracked <span>{confirmed.length}</span>
        </button>
        <button
          className={tab === 'review' ? 'active' : ''}
          aria-pressed={tab === 'review'}
          onClick={() => setTab('review')}
        >
          Email review <span>{pending.length}</span>
        </button>
      </div>
      {clearError && (
        <p role="alert" className="notice notice-error">
          {clearError}
        </p>
      )}
      {clearMessage && (
        <p role="status" className="notice">
          {clearMessage}
        </p>
      )}
      <section className="panel">
        {tab === 'tracked' ? (
          confirmed.length ? (
            <ApplicationRows
              applications={confirmed}
              workspace={workspace}
              onSelect={setSelected}
            />
          ) : (
            <Empty
              icon={<BriefcaseBusiness size={28} />}
              title="Your story starts with one application"
            >
              <p>
                Add an application now or bring in your emails from Gmail or
                Outlook.
              </p>
              <Button onClick={() => setSelected('new')}>
                Add your first application <ArrowRight size={16} />
              </Button>
            </Empty>
          )
        ) : pending.length ? (
          <div className="review-list">
            <div className="notice">
              Email threads need your review before they count as applications.
              Attach a thread to an existing application if it is a follow-up.
            </div>
            <div className="settings-actions">
              <Button
                variant="danger"
                disabled={clearing || email.busy}
                onClick={() => void clearReview()}
              >
                <Trash2 size={16} />
                {clearing ? 'Clearing…' : 'Clear review queue'}
              </Button>
            </div>
            {pending.map((a) => {
              const message = workspace.messages.find(
                (m) => m.applicationId === a.id,
              );
              return (
                <button
                  className="review-row"
                  key={a.id}
                  disabled={clearing}
                  onClick={() => setSelected(a)}
                >
                  <span className="empty-icon">
                    <Mail size={20} />
                  </span>
                  <span>
                    <strong>
                      {message?.subject || 'Application correspondence'}
                    </strong>
                    <small>{message?.sender}</small>
                    <small>{displayDate(message?.receivedAt ?? null)}</small>
                  </span>
                  <span className="review-tag">
                    Review <ArrowRight size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <Empty icon={<Inbox size={28} />} title="All caught up">
            <p>Uncertain application emails will appear here for review.</p>
            <Button asChild variant="outline">
              <Link to="/settings">
                Go to email connection <ArrowRight size={16} />
              </Link>
            </Button>
          </Empty>
        )}
      </section>
      {selected && (
        <ApplicationEditor
          application={selected === 'new' ? undefined : selected}
          workspace={workspace}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
export function Documents({ workspace }: { workspace: Workspace }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [renaming, setRenaming] = useState<Cv | null>(null);
  const [rename, setRename] = useState('');
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await uploadCv(file, label);
      setFile(null);
      setLabel('');
      if (input.current) input.current.value = '';
      setNotice('CV version saved in this browser.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(cv: Cv) {
    const linked = workspace.applications.filter(
      (a) => a.cvId === cv.id,
    ).length;
    if (
      !window.confirm(
        `Delete “${cv.label}”?${linked ? ` Its links to ${linked} applications will be cleared.` : ''} Your applications will be kept.`,
      )
    )
      return;
    setError('');
    try {
      await removeCv(cv.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function download(cv: Cv) {
    const url = URL.createObjectURL(cv.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cv.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <PageHeading
        eyebrow="PUT YOUR BEST SELF FORWARD"
        title="Your CV library"
        description="A version for every opportunity. Keep the one that tells your story."
      />
      <section className="upload-panel">
        <div className="upload-symbol">
          <Upload size={29} />
        </div>
        <div>
          <h2>A new chapter. A new version.</h2>
          <p>
            Upload a PDF or DOCX, up to 10 MiB. Older versions stay right here.
          </p>
        </div>
        <input
          ref={input}
          className="sr-only"
          id="cv-file"
          aria-label="Choose CV file"
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError('');
          }}
        />
        <Button variant="outline" onClick={() => input.current?.click()}>
          <Plus size={17} /> Choose a file
        </Button>
        {file && (
          <div className="upload-form">
            <span>
              <FileText size={17} /> {file.name}
            </span>
            <label>
              Version label
              <input
                value={label}
                maxLength={150}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Product design · September"
              />
            </label>
            <Button disabled={busy} onClick={() => void upload()}>
              {busy ? 'Saving…' : 'Save CV version'}
            </Button>
          </div>
        )}
      </section>
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          <Check size={16} />
          {notice}
        </p>
      )}
      <div className="section-title">
        <h2>
          All versions <span className="count">{workspace.cvs.length}</span>
        </h2>
        <span>Newest first</span>
      </div>
      {workspace.cvs.length ? (
        <div className="cv-grid">
          {[...workspace.cvs]
            .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
            .map((cv) => (
              <article className="cv-card" key={cv.id}>
                <div className="cv-preview" aria-hidden="true">
                  <div className="paper">
                    <span className="paper-avatar" />
                    <i />
                    <i />
                    <b />
                    <i />
                    <i />
                    <i />
                    <b />
                    <i />
                    <i />
                  </div>
                  <span>{cv.filename.split('.').pop()?.toUpperCase()}</span>
                </div>
                <div className="cv-card-body">
                  <h3>{cv.label}</h3>
                  <p className="filename">{cv.filename}</p>
                  <p className="muted">
                    {displayDate(cv.uploadedAt)} ·{' '}
                    {Math.max(1, Math.round(cv.size / 1024))} KB
                  </p>
                  <span className="cv-used">
                    Used in{' '}
                    {
                      workspace.applications.filter((a) => a.cvId === cv.id)
                        .length
                    }{' '}
                    applications
                  </span>
                  <div className="cv-actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => download(cv)}
                    >
                      <ArrowDownToLine size={15} /> Download
                    </Button>
                    <div className="spacer" />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${cv.label}`}
                      onClick={() => {
                        setRenaming(cv);
                        setRename(cv.label);
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${cv.label}`}
                      onClick={() => void remove(cv)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      ) : (
        <section className="panel">
          <Empty icon={<FolderOpen size={30} />} title="Your CVs belong here">
            <p>
              Upload your first version above. You can link it to applications
              whenever you're ready.
            </p>
          </Empty>
        </section>
      )}
      <p className="storage-note">
        <ShieldCheck size={17} /> Files stay in this browser. Clearing site data
        removes your CV library.
      </p>
      {renaming && (
        <Modal
          open
          title="Rename CV version"
          description="Choose a label that helps you tell your versions apart."
          onOpenChange={(open) => {
            if (!open) setRenaming(null);
          }}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              void renameCv(renaming.id, rename)
                .then(() => setRenaming(null))
                .catch((e) => setError(errorMessage(e)))
                .finally(() => setBusy(false));
            }}
          >
            <label>
              Version label
              <input
                required
                maxLength={150}
                value={rename}
                onChange={(e) => setRename(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="notice notice-error">
                {error}
              </p>
            )}
            <Button disabled={busy}>Save label</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Settings({ workspace }: { workspace: Workspace }) {
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your workspace"
        description="Connect your inbox. Keep your information close."
      />
      <EmailConnections workspace={workspace} />
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div className="settings-title">
            <span className="service-icon">
              <ShieldCheck size={25} />
            </span>
            <div>
              <h2>A workspace that stays with you</h2>
              <p>Local to this browser and this website.</p>
            </div>
          </div>
        </div>
        <div className="settings-body">
          <p>
            Your CVs and tracked emails are saved in this browser's database.
            They aren't uploaded to GitHub. There's no cloud backup or
            cross-device sync, so keep the original copies of your CVs.
          </p>
          <div className="storage-counts">
            <span>
              <strong>{workspace.cvs.length}</strong> CV versions
            </span>
            <span>
              <strong>
                {workspace.applications.filter((a) => a.confirmed).length}
              </strong>{' '}
              applications
            </span>
            <span>
              <strong>{workspace.messages.length}</strong> emails
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
