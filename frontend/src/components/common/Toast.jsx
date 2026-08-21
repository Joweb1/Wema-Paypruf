import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />,
          warning: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
          error: <XCircle size={18} className="text-rose-600 shrink-0" />,
          info: <Info size={18} className="text-purple-600 shrink-0" />,
        };

        const bgStyles = {
          success: 'border-emerald-200 bg-emerald-50/95 text-emerald-950',
          warning: 'border-amber-200 bg-amber-50/95 text-amber-950',
          error: 'border-rose-200 bg-rose-50/95 text-rose-950',
          info: 'border-purple-200 bg-purple-50/95 text-purple-950',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-xs transition-all animate-slide-up ${bgStyles[toast.type]}`}
          >
            <div className="mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold">{toast.title}</h4>
              {toast.description && (
                <p className="text-[11px] opacity-80 mt-0.5 leading-snug">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
