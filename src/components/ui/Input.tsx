import React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="input-group">
        <LabelPrimitive.Root htmlFor={inputId} className="input-label">
          {label}
        </LabelPrimitive.Root>
        <input
          id={inputId}
          ref={ref}
          className={`input-field ${error ? 'input-error' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && <span id={`${inputId}-error`} className="input-err-msg" role="alert">{error}</span>}
        {!error && hint && <span id={`${inputId}-hint`} className="input-hint">{hint}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
