import React, { useState } from 'react';
import { KeyRound, Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { PublicUser } from '../types/foundation';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: PublicUser;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  activeUser,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('تکرار کلمه عبور جدید با کلمه عبور وارد شده همخوانی ندارد.');
      return;
    }

    if (newPassword.length < 3) {
      setErrorMsg('کلمه عبور جدید باید حداقل دارای ۳ کاراکتر باشد.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.messageFa || 'خطا در تغییر کلمه عبور.');
      } else {
        setSuccessMsg(data.messageFa);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setErrorMsg('خطای شبکه در ارتباط با سرور دیتابیس.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold">تغییر کلمه عبور حساب کاربری</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تغییر رمز کاربر «{activeUser.fullName}» (@{activeUser.username})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-950 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeUser.isInitialAdmin && !successMsg && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
              شما هم‌اکنون با کلمه عبور پیش‌فرض (admin) وارد شده‌اید. توصیه می‌شود کلمه عبور قوی‌تری تعیین نمایید.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                کلمه عبور فعلی (برای ادمین پیش‌فرض: admin)
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Current Password"
                  className="w-full rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-xs font-mono text-left text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                کلمه عبور جدید
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="New Password"
                  className="w-full rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-xs font-mono text-left text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تکرار کلمه عبور جدید
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm New Password"
                  className="w-full rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-xs font-mono text-left text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                بستن
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'در حال ثبت...' : 'ذخیره کلمه عبور جدید'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
