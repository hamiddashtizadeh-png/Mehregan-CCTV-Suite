import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Shield,
  FileText,
  Sliders,
  KeyRound,
  UserCheck,
  Database,
  RefreshCw,
  AlertTriangle,
  Zap,
  Landmark,
  ShoppingCart,
  ShoppingBag,
  Package,
  Wrench,
  Settings,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { LayoutDashboard } from 'lucide-react';
import { FoundationDataResponse, PublicUser } from './types/foundation';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UserManagementView } from './components/UserManagementView';
import { RbacConsoleView } from './components/RbacConsoleView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsAndHealthView } from './components/SettingsAndHealthView';
import { ConnectionDeploymentView } from './components/ConnectionDeploymentView';
import { PartiesManagementView } from './components/PartiesManagementView';
import { InventoryManagementView } from './components/InventoryManagementView';
import { PurchasesManagementView } from './components/PurchasesManagementView';
import { SalesManagementView } from './components/SalesManagementView';
import { InstallationManagementView } from './components/InstallationManagementView';
import { TreasuryManagementView } from './components/TreasuryManagementView';
import { AccountingManagementView } from './components/AccountingManagementView';
import { DashboardView } from './components/DashboardView';
import { SmartAgentWidget } from './components/SmartAgentWidget';

type WorkspaceTab =
  | 'DASHBOARD'
  | 'SALES'
  | 'PURCHASES'
  | 'PARTIES'
  | 'INVENTORY'
  | 'ACCOUNTING'
  | 'TREASURY'
  | 'INSTALLATION'
  | 'DEPLOYMENT'
  | 'USERS'
  | 'RBAC'
  | 'AUDIT'
  | 'SETTINGS_HEALTH';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('DASHBOARD');
  const [foundationData, setFoundationData] = useState<FoundationDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isQuickSubmenuOpen, setIsQuickSubmenuOpen] = useState(false);

  const fetchFoundationData = useCallback(async () => {
    try {
      setNetworkError(null);
      const res = await fetch('/api/foundation/overview');
      const json = await res.json();
      if (json.ok) {
        setFoundationData(json.data);
      } else {
        setNetworkError(json.messageFa || 'خطا در دریافت اطلاعات دیتابیس.');
      }
    } catch (err: unknown) {
      setNetworkError(
        err instanceof Error ? err.message : 'عدم دسترسی به سرور مرکزی Backend روی پورت 3000.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFoundationData();
  }, [fetchFoundationData]);

  const handleSwitchUser = async (userId: number) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchFoundationData();
      }
    } catch {
      // transient
    }
  };

  const handleLoginSuccess = async (_user: PublicUser) => {
    await fetchFoundationData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                در حال راه‌اندازی و اتصال به هسته مرکزی Foundation...
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                بررسی جداول کاربران، مجوزهای RBAC و دیتابیس PostgreSQL
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (networkError || !foundationData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-red-300 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-red-800">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <h1 className="text-sm font-bold">خطا در برقراری ارتباط با سرور دیتابیس</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                سرویس مرکزی Backend روی پورت 3000 در دسترس نیست یا خطایی رخ داده است.
              </p>
            </div>
          </div>
          <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-950 font-mono">
            {networkError}
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchFoundationData();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  const activeUser = foundationData.activeUser;
  const isDefaultAdminPass = activeUser.isInitialAdmin;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. Top Brand & User Session Bar */}
      <header className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Zone 1: Wordmark & Company Brand */}
          <div className="flex items-center gap-3">
            <a
              href="#top"
              className="text-sm font-extrabold tracking-tight text-slate-900 whitespace-nowrap flex items-center gap-2"
            >
              <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-black text-xs shadow-xs">
                مهرگان
              </span>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                سامانه ERP، فروش و حسابداری دوطرفه
              </span>
            </a>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              سال مالی ۱۴۰۵
            </span>
          </div>

          {/* Zone 2: Active User Info & Account Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-900">{activeUser.fullName}</span>
              <span className="text-[10px] text-slate-400 font-mono">(@{activeUser.username})</span>
            </div>

            <button
              type="button"
              onClick={() => setIsChangePassOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
              title="تغییر کلمه عبور کاربر جاری"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden xs:inline">رمز عبور</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>تغییر حساب</span>
            </button>
          </div>
        </div>

        {/* Zone 3: Main Operational Navigation Ribbon with Quick Actions & Color-Coded High-Frequency Menus */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
            {/* Quick Actions Ribbon & Interactive Submenu (دسترسی سریع با زیرمنوی آبشاری) */}
            <div className="relative">
              <div className="flex items-center gap-1.5 text-[11px] font-bold bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsQuickSubmenuOpen(!isQuickSubmenuOpen)}
                  className="text-amber-600 hover:text-amber-700 flex items-center gap-1 font-extrabold ml-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition-colors border border-amber-200"
                  title="کلیک برای باز کردن زیرمنوی دسترسی سریع"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>دسترسی سریع</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isQuickSubmenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('SALES')}
                  className="px-2 py-0.5 rounded text-slate-700 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
                  title="فروش سریع POS"
                >
                  🛒 فاکتور فروش POS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('TREASURY')}
                  className="px-2 py-0.5 rounded text-slate-700 bg-slate-100 hover:bg-teal-100 hover:text-teal-800 transition-colors cursor-pointer"
                  title="دریافت / پرداخت"
                >
                  💳 دریافت و پرداخت
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ACCOUNTING')}
                  className="px-2 py-0.5 rounded text-slate-700 bg-slate-100 hover:bg-purple-100 hover:text-purple-800 transition-colors cursor-pointer hidden md:inline-block"
                  title="ثبت هزینه / درآمد"
                >
                  💸 هزینه و درآمد
                </button>
              </div>

              {/* Interactive Flyout Submenu */}
              {isQuickSubmenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 text-right dir-rtl"
                  onClick={() => setIsQuickSubmenuOpen(false)}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      زیرمنوی میانبرهای سیستم
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">انتخاب ماژول</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveTab('SALES')}
                      className="p-2 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                        <span>🛒 فروش، POS و پیش‌فاکتور</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                        POS
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('PURCHASES')}
                      className="p-2 rounded-xl hover:bg-amber-50 text-slate-800 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-600" />
                        <span>🛍️ فاکتور خرید و بهای تمام‌شده</span>
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                        Landed Cost
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('TREASURY')}
                      className="p-2 rounded-xl hover:bg-teal-50 text-slate-800 hover:text-teal-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-teal-600" />
                        <span>💳 دریافت، پرداخت و چک صیادی</span>
                      </span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-mono">
                        خزانه
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('INVENTORY')}
                      className="p-2 rounded-xl hover:bg-indigo-50 text-slate-800 hover:text-indigo-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-600" />
                        <span>📦 موجودی انبار، کاردکس و بارکد</span>
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono">
                        کالا
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('PARTIES')}
                      className="p-2 rounded-xl hover:bg-blue-50 text-slate-800 hover:text-blue-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>👥 صورت‌حساب مشتریان و اشخاص</span>
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                        طرفین
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('ACCOUNTING')}
                      className="p-2 rounded-xl hover:bg-purple-50 text-slate-800 hover:text-purple-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        <span>📚 اسناد دوبل، تراز و دفاتر کل</span>
                      </span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                        حسابداری
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('INSTALLATION')}
                      className="p-2 rounded-xl hover:bg-cyan-50 text-slate-800 hover:text-cyan-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-cyan-600" />
                        <span>🔧 کارتابل نصابان و پروژه‌های CCTV</span>
                      </span>
                      <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-mono">
                        نصب
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Core Operations & Financial Menus */}
            <nav className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              {/* 0. DASHBOARD (داشبورد مدیریتی) - Slate/Indigo */}
              <button
                type="button"
                onClick={() => setActiveTab('DASHBOARD')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-slate-900 text-white font-extrabold shadow-sm ring-2 ring-slate-900/30'
                    : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
                }`}
                title="داشبورد اختصاصی و خلاصه عملکرد مدیریتی"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500" />
                <span>داشبورد</span>
              </button>

              {/* 1. SALES (فروش و POS) - Emerald */}
              <button
                type="button"
                onClick={() => setActiveTab('SALES')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'SALES'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm ring-2 ring-emerald-600/30'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                }`}
                title="فروش، صندوق فروش سریع POS، پیش‌فاکتور و مرجوعی"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-700" />
                <span>فروش و POS</span>
              </button>

              {/* 2. PURCHASES (خرید و تدارکات) - Amber */}
              <button
                type="button"
                onClick={() => setActiveTab('PURCHASES')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'PURCHASES'
                    ? 'bg-amber-600 text-white font-extrabold shadow-sm ring-2 ring-amber-600/30'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
                title="فاکتورهای خرید، پیش‌فاکتور ارزی و بهای تمام‌شده Landed Cost"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                <span>خرید و تدارکات</span>
              </button>

              {/* 3. TREASURY (عملیات پرداخت و دریافت) - Teal */}
              <button
                type="button"
                onClick={() => setActiveTab('TREASURY')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'TREASURY'
                    ? 'bg-teal-700 text-white font-extrabold shadow-sm ring-2 ring-teal-600/30'
                    : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                }`}
                title="صندوق‌ها، حساب‌های بانکی، چک‌های صیادی و اقساط"
              >
                <Landmark className="w-3.5 h-3.5 text-teal-600" />
                <span>عملیات پرداخت و دریافت</span>
              </button>

              {/* 4. PARTIES (اشخاص و طرفین) - Blue */}
              <button
                type="button"
                onClick={() => setActiveTab('PARTIES')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'PARTIES'
                    ? 'bg-blue-600 text-white font-extrabold shadow-sm ring-2 ring-blue-600/30'
                    : 'bg-blue-50 text-blue-900 border border-blue-300 hover:bg-blue-100'
                }`}
                title="مشتریان، تأمین‌کنندگان، نصابان و مانده‌حساب اشخاص"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>اشخاص و طرفین</span>
              </button>

              {/* 5. INVENTORY (کالا و انبارداری) - Indigo */}
              <button
                type="button"
                onClick={() => setActiveTab('INVENTORY')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'INVENTORY'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm ring-2 ring-indigo-600/30'
                    : 'bg-indigo-50 text-indigo-900 border border-indigo-300 hover:bg-indigo-100'
                }`}
                title="مدیریت کالا، کاردکس، سریال/مک‌آدرس و موجودی انبار"
              >
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>کالا و انبارداری</span>
              </button>

              {/* 6. ACCOUNTING (حسابداری) - Purple */}
              <button
                type="button"
                onClick={() => setActiveTab('ACCOUNTING')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'ACCOUNTING'
                    ? 'bg-purple-700 text-white font-extrabold shadow-sm ring-2 ring-purple-600/30'
                    : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                }`}
                title="کدینگ حساب‌ها، اسناد دوبل، تراز آزمایشی، سال مالی، مراکز هزینه و تحلیل سودآوری"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                <span>حسابداری</span>
              </button>

              {/* 7. INSTALLATION (خدمات و نصب CCTV) - Cyan */}
              <button
                type="button"
                onClick={() => setActiveTab('INSTALLATION')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer select-none ${
                  activeTab === 'INSTALLATION'
                    ? 'bg-cyan-600 text-white font-extrabold shadow-sm ring-2 ring-cyan-600/30'
                    : 'bg-cyan-50 text-cyan-900 border border-cyan-300 hover:bg-cyan-100'
                }`}
                title="سفارشات خدمات نصب، تکنسین‌ها و پروژه‌های نظارت تصویری"
              >
                <Wrench className="w-3.5 h-3.5 text-cyan-600" />
                <span>خدمات و نصب CCTV</span>
              </button>
            </nav>

            {/* System Sub-Menu Ribbon */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg text-[11px]">
              <span className="text-slate-400 font-semibold px-1.5 hidden md:inline">سیستم:</span>
              <button
                type="button"
                onClick={() => setActiveTab('DEPLOYMENT')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeTab === 'DEPLOYMENT' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                استقرار
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('USERS')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeTab === 'USERS' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                کاربران
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('RBAC')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeTab === 'RBAC' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                مجوزها
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AUDIT')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeTab === 'AUDIT' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                لاگ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SETTINGS_HEALTH')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeTab === 'SETTINGS_HEALTH' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                تنظیمات
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Default Password Reminder Banner if active user is default admin */}
      {isDefaultAdminPass && (
        <div className="bg-amber-100 border-b border-amber-300 px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-700 fill-amber-700 shrink-0" />
              <span>
                <strong>راه‌اندازی سریع اولیه:</strong> هم‌اکنون با کاربر ادمین پیش‌فرض (
                <span className="font-mono font-bold">admin / admin</span>) وارد شده‌اید. می‌توانید
                همین حالا کلمه عبور را به مقدار دلخواه تغییر دهید.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsChangePassOpen(true)}
              className="rounded bg-amber-800 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-amber-900 transition-colors"
            >
              تغییر فوری کلمه عبور admin
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'DASHBOARD' && (
          <DashboardView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
            onNavigateTab={(tab) => setActiveTab(tab as WorkspaceTab)}
          />
        )}
        {activeTab === 'SALES' && (
          <SalesManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'PURCHASES' && (
          <PurchasesManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'PARTIES' && (
          <PartiesManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'INVENTORY' && (
          <InventoryManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'ACCOUNTING' && (
          <AccountingManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'TREASURY' && (
          <TreasuryManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'INSTALLATION' && (
          <InstallationManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'DEPLOYMENT' && (
          <ConnectionDeploymentView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
        {activeTab === 'USERS' && (
          <UserManagementView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
            onSwitchUser={handleSwitchUser}
          />
        )}
        {activeTab === 'RBAC' && (
          <RbacConsoleView foundationData={foundationData} onRefresh={fetchFoundationData} />
        )}
        {activeTab === 'AUDIT' && <AuditLogView logs={foundationData.auditLogs} />}
        {activeTab === 'SETTINGS_HEALTH' && (
          <SettingsAndHealthView
            foundationData={foundationData}
            onRefresh={fetchFoundationData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            سامانه نرم‌افزاری <strong>حسابداری مهرگان</strong> — برنامه‌نویس و مالک فنی: <strong className="text-slate-800">حمید دشتی‌زاده</strong> (شماره پشتیبانی: <span className="font-mono text-slate-800" dir="ltr">09171791315</span>)
          </div>
          <div className="font-mono text-[11px] text-slate-600" dir="ltr">
            Mehregan ERP · Hamid Dashti Zadeh (09171791315) · Ready
          </div>
        </div>
      </footer>

      {/* Modals & Floating Agent Widget */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
        activeUser={activeUser}
      />
      <SmartAgentWidget
        foundationData={foundationData}
        onRefresh={fetchFoundationData}
        onNavigateTab={(tab) => {
          if (tab === 'PROFORMA' || tab === 'QUICK_SALE' || tab === 'RETURN') {
            setActiveTab('SALES');
          } else if (tab === 'PROJECTS' || tab === 'REQUISITION' || tab === 'INSTALLER') {
            setActiveTab('INSTALLATION');
          } else if (tab === 'EXPENSES' || tab === 'CHEQUES' || tab === 'INSTALLMENTS') {
            setActiveTab('TREASURY');
          } else if (tab === 'JOURNAL' || tab === 'TRIAL_BALANCE' || tab === 'PROFITABILITY') {
            setActiveTab('ACCOUNTING');
          } else {
            setActiveTab(tab as WorkspaceTab);
          }
        }}
      />
    </div>
  );
}

