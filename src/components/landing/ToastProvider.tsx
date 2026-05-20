'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
};

type ToastContextValue = {
  push: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const ring =
    toast.variant === 'success'
      ? 'ring-emerald-200'
      : toast.variant === 'error'
        ? 'ring-red-200'
        : 'ring-gray-200';

  const dot =
    toast.variant === 'success'
      ? 'bg-emerald-500'
      : toast.variant === 'error'
        ? 'bg-red-500'
        : 'bg-gray-700';

  return (
    <div
      role="status"
      className={`pointer-events-auto w-[360px] max-w-[calc(100vw-32px)] rounded-2xl bg-white/90 backdrop-blur shadow-lg ring-1 ${ring} p-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{toast.title}</div>
          {toast.description ? (
            <div className="mt-1 text-sm text-gray-600">{toast.description}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onClose(toast.id)}
          className="ml-auto text-gray-500 hover:text-gray-900"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast: Toast = { id, ...t };
    setToasts((prev) => [toast, ...prev].slice(0, 3));
    window.setTimeout(() => remove(id), 3500);
  }, [remove]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[999999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider is missing');
  return ctx;
}

