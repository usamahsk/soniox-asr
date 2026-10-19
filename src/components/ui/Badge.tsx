import React from 'react';
import { Check, TriangleAlert } from 'lucide-react';

type StatusVariant = 'uploading' | 'processing' | 'completed' | 'error';

const config: Record<StatusVariant, { label: string; cls: string }> = {
  uploading:  { label: 'uploading',   cls: 'badge-uploading' },
  processing: { label: 'processing',  cls: 'badge-processing' },
  completed:  { label: 'done',        cls: 'badge-done' },
  error:      { label: 'error',       cls: 'badge-error' },
};

export function Badge({ status }: { status: string }) {
  const v = config[status as StatusVariant] ?? { label: status, cls: 'badge-default' };
  return (
    <span className={`badge ${v.cls}`}>
      {status === 'processing' || status === 'uploading' ? (
        <span className="badge-dot-pulse" />
      ) : status === 'completed' ? (
        <Check size={11} strokeWidth={3.5} />
      ) : status === 'error' ? (
        <TriangleAlert size={11} strokeWidth={3} />
      ) : null}
      {v.label}
    </span>
  );
}
