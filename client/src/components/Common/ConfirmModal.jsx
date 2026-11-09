import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, ShieldAlert, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'danger' | 'warning' | 'primary'
  loading = false,
}) {
  if (!isOpen) return null;

  const ICONS = {
    danger: <Trash2 className="w-6 h-6 text-rose-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    primary: <CheckCircle2 className="w-6 h-6 text-indigo-600" />,
  };

  const BUTTON_STYLES = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
    warning: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-amber-500/20',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
  };

  const ICON_BG = {
    danger: 'bg-rose-50 border-rose-200',
    warning: 'bg-amber-50 border-amber-200',
    primary: 'bg-indigo-50 border-indigo-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform scale-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start space-x-3.5">
            <div className={`p-3 rounded-2xl border ${ICON_BG[type]} shrink-0 shadow-xs`}>
              {ICONS[type]}
            </div>
            <div className="flex-1 pr-2">
              <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 ${BUTTON_STYLES[type]}`}
            >
              <span>{loading ? 'Processing...' : confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
