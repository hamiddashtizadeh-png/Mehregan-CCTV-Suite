import React from 'react';
import { AlertTriangle, Trash2, X, Check } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  errorMessage?: string | null;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  details,
  errorMessage,
  confirmText = 'حذف قطعی',
  cancelText = 'انصراف',
  isLoading = false,
  isDestructive = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right dir-rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDestructive ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5 text-rose-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {errorMessage && (
            <div className="p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-xs font-bold text-rose-950 flex items-start gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="block font-black text-rose-900">علت عدم امکان حذف:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-700 leading-relaxed font-medium">{message}</p>
          {details && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed whitespace-pre-line font-mono">
              {details}
            </div>
          )}
          {isDestructive && (
            <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1.5 pt-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>توجه: پس از حذف، این رکورد از دیتابیس پاکسازی می‌شود.</span>
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:ring-2 focus:ring-rose-500 focus:ring-offset-1'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isDestructive ? (
              <Trash2 className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{isLoading ? 'در حال انجام...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
