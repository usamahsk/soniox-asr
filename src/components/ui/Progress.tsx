import React from 'react';

interface ProgressProps {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function Progress({ value, label, showPercent = true, className = '' }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`progress-wrap ${className}`}>
      {(label || showPercent) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showPercent && <span className="progress-pct">{clamped}%</span>}
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="progress-fill"
          style={{ width: `${clamped}%`, transition: clamped > 0 ? 'width 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none' }}
        />
      </div>
    </div>
  );
}
