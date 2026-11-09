import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Notice') => addToast({ type: 'info', title, message }),
  };

  const ICONS = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
  };

  const STYLES = {
    success: 'bg-white border-emerald-200 text-slate-800 shadow-lg shadow-emerald-500/10',
    error: 'bg-white border-rose-200 text-slate-800 shadow-lg shadow-rose-500/10',
    warning: 'bg-white border-amber-200 text-slate-800 shadow-lg shadow-amber-500/10',
    info: 'bg-white border-indigo-200 text-slate-800 shadow-lg shadow-indigo-500/10',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border flex items-start space-x-3 transition-all duration-300 transform translate-y-0 opacity-100 ${STYLES[t.type] || STYLES.info}`}
            role="alert"
          >
            <div className="mt-0.5">{ICONS[t.type] || ICONS.info}</div>
            <div className="flex-1 min-w-0 pr-1">
              {t.title && <p className="text-xs font-bold text-slate-900 leading-tight">{t.title}</p>}
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
