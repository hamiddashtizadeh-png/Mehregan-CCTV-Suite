import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle, X, ShieldCheck, Zap } from 'lucide-react';
import { PublicUser } from '../types/foundation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: PublicUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const userToSubmit = customUser !== undefined ? customUser : username;
    const passToSubmit = customPass !== undefined ? customPass : password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userToSubmit, password: passToSubmit }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.messageFa || 'نام کاربری یا کلمه عبور وارد شده نادرست است.');
      } else {
        onLoginSuccess(data.user);
        onClose();
      }
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور مرکزی دیتابیس.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = () => {
    setUsername('admin');
    setPassword('admin');
    handleLogin(undefined, 'admin', 'admin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold">ورود امن به سامانه مهرگان</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                احراز هویت مستقل مبتنی بر دیتابیس داخلی (بدون وابستگی به گوگل یا ایمیل)
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

        <div className="p-6 space-y-5">
          {/* Quick Admin Launch Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>راه‌اندازی و ورود سریع (حساب پیش‌فرض):</span>
              </span>
              <span className="text-[11px] font-mono text-blue-800 font-semibold" dir="ltr">
                user: admin | pass: admin
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              جهت تست و راه‌اندازی سریع اولیه، کلمه عبور پیش‌فرض admin تنظیم شده است که می‌توانید پس از ورود آن را فوراً تغییر دهید.
            </p>
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              ورود تک‌کلیکی با admin / admin
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نام کاربری (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-xs font-mono text-left text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <User className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                کلمه عبور (Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  className="w-full rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-xs font-mono text-left text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <KeyRound className="h-4 w-4" />
              <span>{loading ? 'در حال تایید هویت...' : 'ورود مستقیم به سیستم'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
