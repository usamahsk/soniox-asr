import React, { createContext, useContext, useState, useCallback } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';

type ToastVariant = 'ok' | 'bad' | 'info';
interface ToastItem { id: string; message: string; variant: ToastVariant; }
interface ToastCtx { toast: (message: string, variant?: ToastVariant) => void; }

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const variantClass: Record<ToastVariant, string> = {
    ok: 'toast-item-ok',
    bad: 'toast-item-bad',
    info: 'toast-item-info',
  };

  return (
    <Ctx.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map(t => (
          <ToastPrimitive.Root key={t.id} className={`toast-item ${variantClass[t.variant]}`} duration={4000}>
            <div className="flex items-start gap-3">
              <span className="toast-icon">
                {t.variant === 'ok' ? '✓' : t.variant === 'bad' ? '✕' : 'ℹ'}
              </span>
              <ToastPrimitive.Description className="toast-message">{t.message}</ToastPrimitive.Description>
              <ToastPrimitive.Close className="toast-close" aria-label="Close">×</ToastPrimitive.Close>
            </div>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="toast-viewport" />
      </ToastPrimitive.Provider>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
