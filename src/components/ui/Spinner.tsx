import React from 'react';

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 16, md: 24, lg: 36 };

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const px = sizes[size];
  return (
    <svg
      width={px} height={px} viewBox="0 0 24 24" fill="none"
      className={`spinner ${className}`}
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2.5" stroke="currentColor" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
