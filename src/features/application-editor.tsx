import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUpRight, Mail, Trash2 } from 'lucide-react';
import {
  applicationInput,
  type Application,
  type ApplicationInput,
} from '../domain/models';
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
} from '../domain/application-statuses';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/dialog';
import { displayDate, errorMessage, localDate } from '../lib/utils';
import {
  mergeApplication,
  removeApplication,
  saveApplication,
} from '../persistence/repository';
import type { Workspace } from './workspace';
export function ApplicationEditor({
  application,
  workspace,
  onClose,
}: {
  application?: Application;
  workspace: Workspace;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [mergeId, setMergeId] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationInput),
    defaultValues: application
      ? { ...application, appliedAt: application.appliedAt ?? '' }
      : {
          company: '',
          role: '',
          appliedAt: localDate(),
          status: 'applied',
          cvId: '',
          notes: '',
        },
  });
  const messages = workspace.messages
    .filter((m) => m.applicationId === application?.id)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  async function save(values: ApplicationInput) {
    setError('');
    try {
      await saveApplication(values, application?.id);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function remove() {
    if (
      !application ||
      !window.confirm(
        'Delete this application and its local emails? CV versions and your mailbox will be kept.',
      )
    )
      return;
    setWorking(true);
    try {
      await removeApplication(application.id);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }
  async function merge() {
    if (!application) return;
    setWorking(true);
    try {
      await mergeApplication(application.id, mergeId);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting && !working) onClose();
      }}
      title={
        application
          ? application.confirmed
            ? 'Application details'
            : 'Review application email'
          : 'Add an application'
      }
      description={
        application?.confirmed === false
          ? 'Check the details before including this application in your statistics.'
          : 'Keep a little context for your next step.'
      }
    >
      <form onSubmit={handleSubmit(save)} className="form-stack">
        <div className="form-grid">
          <label>
            Company
            <input
              {...register('company')}
              placeholder="e.g. Acme Studio"
              maxLength={150}
            />
            {errors.company && (
              <span className="field-error">{errors.company.message}</span>
            )}
          </label>
          <label>
            Role
            <input
              {...register('role')}
              placeholder="e.g. Product designer"
              maxLength={200}
            />
            {errors.role && (
              <span className="field-error">{errors.role.message}</span>
            )}
          </label>
        </div>
        <div className="form-grid">
          <label>
            Application date
            <input type="date" {...register('appliedAt')} />
            <span className="field-hint">
              Leave blank if the submission date is unknown.
            </span>
            {errors.appliedAt && (
              <span className="field-error">{errors.appliedAt.message}</span>
            )}
          </label>
          <label>
            Status
            <select {...register('status')}>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          CV version used
          <select {...register('cvId')}>
            <option value="">Not recorded</option>
            {workspace.cvs.map((cv) => (
              <option value={cv.id} key={cv.id}>
                {cv.label} · {displayDate(cv.uploadedAt)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notes
          <textarea
            {...register('notes')}
            placeholder="People you spoke to, next steps, things to remember…"
            rows={3}
          />
          {errors.notes && (
            <span className="field-error">{errors.notes.message}</span>
          )}
        </label>
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {application && (
            <Button
              type="button"
              variant="ghost"
              disabled={working || isSubmitting}
              onClick={() => void remove()}
            >
              <Trash2 size={16} /> Delete
            </Button>
          )}
          <div className="spacer" />
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting || working}
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting || working}>
            {isSubmitting
              ? 'Saving…'
              : application?.confirmed === false
                ? 'Confirm application'
                : 'Save application'}
          </Button>
        </div>
      </form>
      {application && (
        <section className="correspondence">
          <h3>
            <Mail size={18} /> Correspondence{' '}
            <span className="count">{messages.length}</span>
          </h3>
          {messages.length === 0 ? (
            <p className="muted">
              No emails linked yet. Connect Gmail to bring your correspondence
              together.
            </p>
          ) : (
            messages.map((m) => (
              <article key={m.id} className="message-card">
                <strong>{m.subject}</strong>
                <p className="message-meta">
                  {m.sender} · {displayDate(m.receivedAt)}
                </p>
                <p className="message-text">{m.text}</p>
                <a
                  href={`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(m.account)}#all/${encodeURIComponent(m.threadId)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Gmail <ArrowUpRight size={14} />
                </a>
              </article>
            ))
          )}
          {messages.length > 0 && (
            <div className="merge-box">
              <label>
                Belongs to an existing application?
                <select
                  value={mergeId}
                  onChange={(e) => setMergeId(e.target.value)}
                >
                  <option value="">Choose an application</option>
                  {workspace.applications
                    .filter((a) => a.confirmed && a.id !== application.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.company || 'Unknown company'} ·{' '}
                        {a.role || 'Unknown role'}
                      </option>
                    ))}
                </select>
              </label>
              <Button
                variant="outline"
                disabled={!mergeId || working || isSubmitting}
                onClick={() => void merge()}
              >
                Move emails to application
              </Button>
              <p className="field-hint">
                Moves these emails and removes this duplicate record. The
                destination's details stay unchanged.
              </p>
            </div>
          )}
        </section>
      )}
    </Modal>
  );
}
