import { CheckCircle2, X, XCircle } from "lucide-react";
import { useToast } from "../hooks/useToast";

export function ToastRegion() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
          {toast.type === "error" ? (
            <XCircle size={18} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} aria-hidden="true" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
