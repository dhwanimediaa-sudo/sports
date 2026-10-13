import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const notify = {
  success: (message: string, title?: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sportspulse:toast', {
          detail: { message, type: 'success' as const, title: title || 'Success' },
        })
      );
    }
  },
  error: (message: string, title?: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sportspulse:toast', {
          detail: { message, type: 'error' as const, title: title || 'Error' },
        })
      );
    }
  },
  info: (message: string, title?: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sportspulse:toast', {
          detail: { message, type: 'info' as const, title: title || 'Notice' },
        })
      );
    }
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
        };

        const borderStyles = {
          success: 'border-emerald-500/30 bg-slate-900/95 text-slate-100',
          error: 'border-rose-500/30 bg-slate-900/95 text-slate-100',
          info: 'border-blue-500/30 bg-slate-900/95 text-slate-100',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-slide-up ${
              borderStyles[toast.type]
            }`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{toast.title}</h4>}
              <p className="text-sm text-slate-200 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
