import React, { useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Dialog from '@radix-ui/react-dialog';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { useToast } from './ui/Toast';
import type { Job, AppLang } from '../types';
import { Library, Inbox, AudioLines, TriangleAlert, Hourglass, Trash2 } from 'lucide-react';
import { makeT } from '../i18n';

interface JobsListProps {
  jobs: Job[];
  loading: boolean;
  currentJobId: string | null;
  lang: AppLang;
  onSelect: (job: Job) => void;
  onDelete: (job: Job) => Promise<void>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function JobsList({ jobs, loading, currentJobId, lang, onSelect, onDelete }: JobsListProps) {
  const t = makeT(lang);
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmJob, setConfirmJob] = useState<Job | null>(null);

  const handleDelete = async () => {
    if (!confirmJob) return;
    setDeletingId(confirmJob.id);
    setConfirmJob(null);
    try {
      await onDelete(confirmJob);
      toast(t('deleted'), 'ok');
    } catch (err: any) {
      toast(err?.message ?? t('error'), 'bad');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="card jobs-card">
      {/* Header */}
      <div className="card-header">
        <div className="card-header-icon"><Library size={20} strokeWidth={2.2} /></div>
        <div>
          <h2 className="card-title">{t('myLectures')}</h2>
          <p className="card-subtitle">
            {loading ? '…' : jobs.length > 0 ? `${jobs.length} lectures` : t('noLectures')}
          </p>
        </div>
        {jobs.length > 0 && (
          <span className="jobs-count-badge">{jobs.length}</span>
        )}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="jobs-skeleton">
          {[0.75, 0.5, 0.9].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 64, width: `${w * 100}%` }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && jobs.length === 0 && (
        <div className="jobs-empty">
          <div className="jobs-empty-icon"><Inbox size={34} strokeWidth={1.6} /></div>
          <div className="jobs-empty-title">{t('noLectures')}</div>
          <div className="jobs-empty-sub">{t('emptySub')}</div>
        </div>
      )}

      {/* List */}
      {!loading && jobs.length > 0 && (
        <ScrollArea.Root className="jobs-scroll" type="auto">
          <ScrollArea.Viewport className="jobs-list">
            {jobs.map(job => {
              const isActive = job.id === currentJobId;
              const isDeleting = deletingId === job.id;
              return (
                <div
                  key={job.id}
                  className={`job-item ${isActive ? 'job-item-active' : ''}`}
                  role="button"
                  tabIndex={isDeleting ? -1 : 0}
                  aria-current={isActive ? 'true' : undefined}
                  aria-disabled={isDeleting ? 'true' : undefined}
                  onClick={() => !isDeleting && onSelect(job)}
                  onKeyDown={e => { if (!isDeleting && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(job); } }}
                >
                  {/* Icon */}
                  <div className="job-file-icon">
                    {job.status === 'completed' ? <AudioLines size={19} strokeWidth={2.2} /> : job.status === 'error' ? <TriangleAlert size={19} strokeWidth={2.2} /> : <Hourglass size={19} strokeWidth={2.2} />}
                  </div>
                  {/* Info */}
                  <div className="job-info">
                    <div className="job-name">{job.file_name ?? 'Untitled'}</div>
                    <div className="job-meta">
                      {formatDate(job.created_at)} · {formatTime(job.created_at)}
                    </div>
                  </div>
                  {/* Right */}
                  <div className="job-right">
                    <Badge status={job.status} />
                    {isDeleting ? (
                      <Spinner size="sm" className="job-spinner" />
                    ) : job.status === 'completed' ? (
                      <button
                        className="job-delete-btn"
                        title={t('delete')}
                        aria-label={`${t('delete')} ${job.file_name ?? ''}`}
                        onClick={e => { e.stopPropagation(); setConfirmJob(job); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (job.status === 'processing' || job.status === 'uploading') ? (
                      <Spinner size="sm" className="job-spinner job-spinner-pulse" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="scrollbar">
            <ScrollArea.Thumb className="scrollbar-thumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={!!confirmJob} onOpenChange={open => !open && setConfirmJob(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title className="dialog-title">{t('delete')}</Dialog.Title>
            <Dialog.Description className="dialog-desc">
              {t('confirmDelete')}
              {confirmJob && <strong className="dialog-filename"> "{confirmJob.file_name}"</strong>}
            </Dialog.Description>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="outline">{t('cancel')}</Button>
              </Dialog.Close>
              <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
