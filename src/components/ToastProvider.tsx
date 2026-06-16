"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

const styles: Record<ToastType, { bg: string; border: string; iconBg: string; iconColor: string; titleColor: string; descColor: string }> = {
  success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", iconBg: "rgba(16,185,129,0.2)", iconColor: "#34d399", titleColor: "#34d399", descColor: "rgba(255,255,255,0.5)" },
  error: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", iconBg: "rgba(239,68,68,0.2)", iconColor: "#f87171", titleColor: "#f87171", descColor: "rgba(255,255,255,0.5)" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", iconBg: "rgba(245,158,11,0.2)", iconColor: "#fbbf24", titleColor: "#fbbf24", descColor: "rgba(255,255,255,0.5)" },
  info: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", iconBg: "rgba(99,102,241,0.2)", iconColor: "#818cf8", titleColor: "#818cf8", descColor: "rgba(255,255,255,0.5)" },
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="tp-container">
        {toasts.map(toast => {
          const s = styles[toast.type];
          return (
            <div
              key={toast.id}
              className="tp-toast"
              style={{
                background: s.bg,
                borderColor: s.border,
              }}
            >
              <div className="tp-icon" style={{ background: s.iconBg, color: s.iconColor }}>
                {icons[toast.type]}
              </div>
              <div className="tp-body">
                <strong className="tp-title" style={{ color: s.titleColor }}>{toast.title}</strong>
                {toast.description && <span className="tp-desc" style={{ color: s.descColor }}>{toast.description}</span>}
              </div>
              <button className="tp-close" onClick={() => removeToast(toast.id)}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .tp-container {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          pointer-events: none;
        }
        .tp-toast {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1.1rem;
          border: 1px solid;
          border-radius: var(--radius-md);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: tp-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: auto;
          max-width: 400px;
          min-width: 280px;
        }
        @keyframes tp-in {
          from { transform: translateX(120%) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        .tp-icon {
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .tp-body { flex: 1; min-width: 0; }
        .tp-title { display: block; font-size: 0.82rem; font-weight: 800; line-height: 1.3; }
        .tp-desc { display: block; font-size: 0.68rem; font-weight: 600; margin-top: 0.1rem; line-height: 1.3; }
        .tp-close {
          width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 150ms;
          flex-shrink: 0;
        }
        .tp-close:hover { background: rgba(239,68,68,0.2); color: #ef4444; }
      `}</style>
    </ToastContext.Provider>
  );
}
