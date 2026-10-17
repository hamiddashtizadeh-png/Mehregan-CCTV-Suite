import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  Users,
  Package,
  Landmark,
  BookOpen,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  Building2,
  ChevronLeft,
  DollarSign,
  FileText,
  Boxes,
  Wrench,
  Search,
  Calendar,
  Filter,
  Sparkles,
  RefreshCw,
  CreditCard,
  BarChart3,
  PieChart,
  Layers,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Settings,
  LayoutGrid,
  X,
} from 'lucide-react';
import { FoundationDataResponse, SalesInvoiceRecord } from '../types/foundation';

interface DashboardViewProps {
  foundationData: FoundationDataResponse;
  onNavigateTab: (tab: string) => void;
  onRefresh: () => void;
}

export interface WidgetVisibility {
  kpiCards: boolean;
  salesChart: boolean;
  liquidityChart: boolean;
  recentInvoices: boolean;
  cctvProjects: boolean;
  bankVault: boolean;
  lowStockAlerts: boolean;
  quickShortcuts: boolean;
}

const DEFAULT_WIDGETS: WidgetVisibility = {
  kpiCards: true,
  salesChart: true,
  liquidityChart: true,
  recentInvoices: true,
  cctvProjects: true,
  bankVault: true,
  lowStockAlerts: true,
  quickShortcuts: true,
};

type DashboardPerspective = 'ALL' | 'TREASURY' | 'SALES' | 'PROJECTS' | 'INVENTORY';

export const DashboardView: React.FC<DashboardViewProps> = ({
  foundationData,
  onNavigateTab,
  onRefresh,
}) => {
  const [activePerspective, setActivePerspective] = useState<DashboardPerspective>('ALL');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Widget Visibility State (Persisted in localStorage)
  const [widgets, setWidgets] = useState<WidgetVisibility>(() => {
    try {
      const saved = localStorage.getItem('mehregan_dashboard_widgets_v1');
      if (saved) return { ...DEFAULT_WIDGETS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_WIDGETS;
  });

  const [isWidgetManagerOpen, setIsWidgetManagerOpen] = useState(false);

  const toggleWidget = (key: keyof WidgetVisibility) => {
    setWidgets((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('mehregan_dashboard_widgets_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Live Iranian clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Safe extractions
  const salesInvoices = foundationData.salesInvoices || [];
  const purchaseInvoices = foundationData.purchaseInvoices || [];
  const bankAccounts = foundationData.bankAccounts || [];
  const cashBoxes = foundationData.cashBoxes || [];
  const items = foundationData.items || [];
  const parties = foundationData.parties || [];
  const installationJobs = foundationData.installationJobs || [];
  const projects = foundationData.projects || [];
  const cheques = foundationData.cheques || [];

  // Financial calculations
  const totalSalesIrr = useMemo(
    () => salesInvoices.reduce((sum, inv) => sum + (inv.totalInvoiceAmountIrr || 0), 0),
    [salesInvoices]
  );

  const totalPurchasesIrr = useMemo(
    () =>
      purchaseInvoices.reduce(
        (sum, inv) => sum + (inv.totalInvoicePayableToSupplierIrr || inv.totalInventoryValuationIrr || 0),
        0
      ),
    [purchaseInvoices]
  );

  const totalBankBalanceIrr = useMemo(
    () => bankAccounts.reduce((sum, b) => sum + (b.balanceIrr || 0), 0),
    [bankAccounts]
  );

  const totalCashBalanceIrr = useMemo(
    () => cashBoxes.reduce((sum, c) => sum + (c.balanceIrr || 0), 0),
    [cashBoxes]
  );

  const totalLiquidityIrr = totalBankBalanceIrr + totalCashBalanceIrr;

  // Receivables & Payables
  const { totalReceivablesIrr, totalPayablesIrr } = useMemo(() => {
    let recv = 0;
    let pay = 0;
    parties.forEach((p) => {
      const bal = Number((p as any).currentBalanceIrr) || 0;
      if (bal > 0) recv += bal;
      else if (bal < 0) pay += Math.abs(bal);
    });
    return { totalReceivablesIrr: recv, totalPayablesIrr: pay };
  }, [parties]);

  // Cheques calculations
  const inHandCheques = useMemo(
    () => cheques.filter((c) => c.chequeType === 'INBOUND' && (c.status === 'IN_HAND' || c.status === 'DEPOSITED')),
    [cheques]
  );
  const totalInHandChequesIrr = useMemo(
    () => inHandCheques.reduce((sum, c) => sum + (c.amountIrr || 0), 0),
    [inHandCheques]
  );

  // Low stock inventory
  const lowStockItems = useMemo(
    () => items.filter((item) => item.isLowStock || (item as any).stock <= item.minStockAlert),
    [items]
  );

  // Active projects & installation jobs
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'),
    [projects]
  );
  const activeJobs = useMemo(
    () => installationJobs.filter((j) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED'),
    [installationJobs]
  );

  // Filtered recent sales invoices
  const filteredSales = useMemo(() => {
    return salesInvoices
      .filter((inv) => {
        const matchesQuery =
          !invoiceSearchQuery.trim() ||
          inv.invoiceNumber.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
          inv.customerTitleFa.toLowerCase().includes(invoiceSearchQuery.toLowerCase());

        const matchesStatus =
          invoiceStatusFilter === 'ALL'
            ? true
            : invoiceStatusFilter === 'PAID'
            ? inv.status === 'PAID'
            : inv.status !== 'PAID';

        return matchesQuery && matchesStatus;
      })
      .slice(0, 6);
  }, [salesInvoices, invoiceSearchQuery, invoiceStatusFilter]);

  // Sales Trend Data (Recent 7 invoices for SVG spark chart)
  const salesChartData = useMemo(() => {
    const sorted = [...salesInvoices].reverse().slice(-7);
    if (sorted.length === 0) {
      return [
        { label: 'شنبه', fullLabel: 'شنبه', amountIrr: 0, amountToman: 0, heightPct: 15 },
        { label: '۱شنبه', fullLabel: '۱شنبه', amountIrr: 0, amountToman: 0, heightPct: 15 },
        { label: '۲شنبه', fullLabel: '۲شنبه', amountIrr: 0, amountToman: 0, heightPct: 15 },
        { label: '۳شنبه', fullLabel: '۳شنبه', amountIrr: 0, amountToman: 0, heightPct: 15 },
        { label: '۴شنبه', fullLabel: '۴شنبه', amountIrr: 0, amountToman: 0, heightPct: 15 },
        { label: '۵شنبه', fullLabel: '۵شنبه', amountIrr: 0, amountToman: 0, heightPct: 15 },
        { label: 'جمعه', fullLabel: 'جمعه', amountIrr: 0, amountToman: 0, heightPct: 15 },
      ];
    }
    const maxVal = Math.max(...sorted.map((s) => s.totalInvoiceAmountIrr || 0), 1000000);
    return sorted.map((s, idx) => ({
      label: s.dateJalali ? s.dateJalali.split('/').slice(1).join('/') : `#${idx + 1}`,
      fullLabel: `${s.customerTitleFa} (${s.invoiceNumber})`,
      amountIrr: s.totalInvoiceAmountIrr,
      amountToman: Math.round(s.totalInvoiceAmountIrr / 10),
      heightPct: Math.max(12, Math.min(100, Math.round(((s.totalInvoiceAmountIrr || 0) / maxVal) * 100))),
    }));
  }, [salesInvoices]);

  // Donut chart asset distribution
  const totalAssets = totalLiquidityIrr + totalInHandChequesIrr || 1;
  const bankPct = Math.round((totalBankBalanceIrr / totalAssets) * 100);
  const cashPct = Math.round((totalCashBalanceIrr / totalAssets) * 100);
  const chequePct = Math.round((totalInHandChequesIrr / totalAssets) * 100);

  return (
    <div className="space-y-6 text-slate-800 pb-12">
      {/* 1. EXECUTIVE HERO COMMAND HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800/80">
        {/* Ambient background glow elements */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Brand & Greeting */}
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {foundationData.settings?.companyName || 'حسابداری یکپارچه مهرگان'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                {currentTimeStr}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>خوش آمدید، {foundationData.activeUser?.fullName || 'مدیر سیستم'}</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                {foundationData.activeUser?.jobTitle || 'مدیریت ارشد'}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              مرکز پایش هوشمند شاخص‌های مالی، جریان نقدینگی، فروشگاه POS، انبارداری و پروژه‌های نصب دوربین مداربسته در یک نگاه.
            </p>
          </div>

          {/* Quick Actions & Sync */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => onNavigateTab('SALES')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>فاکتور فروش POS</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('TREASURY')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-lg shadow-teal-950/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>دریافت / پرداخت</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('INSTALLATION')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-950/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>پروژه و نصب جدید</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              title="بروزرسانی داده‌های داشبورد"
              className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Mini-Ticker Ribbon inside Header */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="text-slate-400 block text-[11px]">موجودی در دسترس:</span>
              <span className="font-mono font-black text-white text-sm">
                {(totalLiquidityIrr / 10).toLocaleString('fa-IR')}
                <span className="text-[10px] text-slate-400 font-normal mr-1">تومان</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <div>
              <span className="text-slate-400 block text-[11px]">فاکتورهای ثبت‌شده:</span>
              <span className="font-mono font-black text-white text-sm">
                {salesInvoices.length}{' '}
                <span className="text-[10px] text-slate-400 font-normal">سند</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <div>
              <span className="text-slate-400 block text-[11px]">پروژه‌های فعال نصب:</span>
              <span className="font-mono font-black text-white text-sm">
                {activeProjects.length + activeJobs.length}{' '}
                <span className="text-[10px] text-slate-400 font-normal">پروژه</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${lowStockItems.length > 0 ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <div>
              <span className="text-slate-400 block text-[11px]">هشدار موجودی انبار:</span>
              <span className={`font-mono font-black text-sm ${lowStockItems.length > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {lowStockItems.length}{' '}
                <span className="text-[10px] text-slate-400 font-normal">قلم کالا</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE PERSPECTIVE / VIEW FILTER TABS & WIDGET TOGGLES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              دیدگاه تحلیلی:
            </span>
            <button
              type="button"
              onClick={() => setActivePerspective('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activePerspective === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              نمای جامع فرماندهی
            </button>
            <button
              type="button"
              onClick={() => setActivePerspective('TREASURY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activePerspective === 'TREASURY'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
              }`}
            >
              نقدینگی و بانک‌ها
            </button>
            <button
              type="button"
              onClick={() => setActivePerspective('SALES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activePerspective === 'SALES'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
              }`}
            >
              فروش و مطالبات
            </button>
            <button
              type="button"
              onClick={() => setActivePerspective('PROJECTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activePerspective === 'PROJECTS'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-900'
              }`}
            >
              پروژه‌ها و نصب CCTV
            </button>
            <button
              type="button"
              onClick={() => setActivePerspective('INVENTORY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activePerspective === 'INVENTORY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
              }`}
            >
              انبار و تدارکات
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWidgetManagerOpen(!isWidgetManagerOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-all cursor-pointer shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-600" />
              <span>مدیریت و تنظیم ویجت‌ها ({Object.values(widgets).filter(Boolean).length}/8)</span>
            </button>
            <div className="text-[11px] text-slate-500 font-normal px-2 hidden sm:block">
              سال مالی: <strong className="text-slate-800 font-mono">1404</strong>
            </div>
          </div>
        </div>

        {/* WIDGET VISIBILITY CONTROL PANEL */}
        {isWidgetManagerOpen && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-700 shadow-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-extrabold text-white">تنظیمات نمایش و سفارشی‌سازی ویجت‌های داشبورد</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsWidgetManagerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {[
                { key: 'kpiCards', label: 'کارت‌های شاخص کلیدی KPI' },
                { key: 'salesChart', label: 'نمودار تحلیل فروش' },
                { key: 'liquidityChart', label: 'نمودار ترکیب نقدینگی' },
                { key: 'recentInvoices', label: 'جدول فاکتورهای اخیر' },
                { key: 'cctvProjects', label: 'پروژه‌های نصب CCTV' },
                { key: 'bankVault', label: 'موجودی بانک و صندوق' },
                { key: 'lowStockAlerts', label: 'دیده‌بان موجودی انبار' },
                { key: 'quickShortcuts', label: 'پنل عمودی میانبرها (راست)' },
              ].map((w) => {
                const active = widgets[w.key as keyof WidgetVisibility];
                return (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => toggleWidget(w.key as keyof WidgetVisibility)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer font-bold text-right ${
                      active
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 opacity-60'
                    }`}
                  >
                    <span className="truncate">{w.label}</span>
                    {active ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MAIN DASHBOARD CONTAINER WITH RIGHT VERTICAL SHORTCUTS SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* RIGHT COLUMN IN RTL: VERTICAL QUICK ACCESS SHORTCUTS PANEL (1 Col on lg) */}
        {widgets.quickShortcuts && (
          <div className="lg:col-span-1 space-y-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>میانبرهای عمودی دسترسی سریع</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-extrabold font-mono">عمودی</span>
            </div>

            <div className="flex flex-col gap-2">
              {/* 1. SALES */}
              <button
                type="button"
                onClick={() => onNavigateTab('SALES')}
                className="w-full p-3 bg-linear-to-r from-emerald-50/80 to-teal-50/40 border border-emerald-200 hover:border-emerald-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">فروش و POS</span>
                    <span className="text-[10px] text-emerald-700 block font-medium">صدور فاکتور و تسویه</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* 2. PURCHASES */}
              <button
                type="button"
                onClick={() => onNavigateTab('PURCHASES')}
                className="w-full p-3 bg-linear-to-r from-amber-50/80 to-orange-50/40 border border-amber-200 hover:border-amber-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">خرید و تدارکات</span>
                    <span className="text-[10px] text-amber-700 block font-medium">تأمین و بهای تمام‌شده</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* 3. TREASURY */}
              <button
                type="button"
                onClick={() => onNavigateTab('TREASURY')}
                className="w-full p-3 bg-linear-to-r from-teal-50/80 to-emerald-50/40 border border-teal-200 hover:border-teal-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">خزانه و چک</span>
                    <span className="text-[10px] text-teal-700 block font-medium">بانک، صندوق و صیاد</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* 4. PARTIES */}
              <button
                type="button"
                onClick={() => onNavigateTab('PARTIES')}
                className="w-full p-3 bg-linear-to-r from-blue-50/80 to-indigo-50/40 border border-blue-200 hover:border-blue-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">طرفین و مشتریان</span>
                    <span className="text-[10px] text-blue-700 block font-medium">گردش حساب و وضعیت</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* 5. INVENTORY */}
              <button
                type="button"
                onClick={() => onNavigateTab('INVENTORY')}
                className="w-full p-3 bg-linear-to-r from-indigo-50/80 to-purple-50/40 border border-indigo-200 hover:border-indigo-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">کالا و انبارداری</span>
                    <span className="text-[10px] text-indigo-700 block font-medium">کاردکس و بارکد</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* 6. ACCOUNTING */}
              <button
                type="button"
                onClick={() => onNavigateTab('ACCOUNTING')}
                className="w-full p-3 bg-linear-to-r from-purple-50/80 to-pink-50/40 border border-purple-200 hover:border-purple-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">حسابداری کل</span>
                    <span className="text-[10px] text-purple-700 block font-medium">اسناد دوبل و دفاتر</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* 7. INSTALLATION */}
              <button
                type="button"
                onClick={() => onNavigateTab('INSTALLATION')}
                className="w-full p-3 bg-linear-to-r from-cyan-50/80 to-blue-50/40 border border-cyan-200 hover:border-cyan-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">خدمات و نصب CCTV</span>
                    <span className="text-[10px] text-cyan-700 block font-medium">پروژه‌های نظارتی</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* 8. SETTINGS_HEALTH */}
              <button
                type="button"
                onClick={() => onNavigateTab('SETTINGS_HEALTH')}
                className="w-full p-3 bg-linear-to-r from-slate-50 to-slate-100 border border-slate-200 hover:border-slate-400 hover:shadow-xs rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-800 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">تنظیمات و سلامت</span>
                    <span className="text-[10px] text-slate-600 block font-medium">پیکربندی سیستم</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* LEFT COLUMN IN RTL: MAIN ANALYTICAL DASHBOARD CONTENT (3 Cols on lg) */}
        <div className={`${widgets.quickShortcuts ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
          {/* 3. PRIMARY EXECUTIVE KPI METRIC CARDS */}
          {widgets.kpiCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Liquidity */}
        <div
          onClick={() => onNavigateTab('TREASURY')}
          className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between ${
            activePerspective === 'TREASURY' || activePerspective === 'ALL'
              ? 'border-slate-200 hover:border-teal-400 ring-1 ring-transparent hover:ring-teal-400/20'
              : 'opacity-60 border-slate-200'
          }`}
        >
          <div className="absolute top-0 right-0 w-1.5 h-full bg-teal-500 rounded-r" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">کل نقدینگی و خزانه</span>
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                {(totalLiquidityIrr / 10).toLocaleString('fa-IR')}
                <span className="text-[10px] font-normal text-slate-500 mr-1.5">تومان</span>
              </p>
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.round((totalBankBalanceIrr / (totalLiquidityIrr || 1)) * 100)}%` }}
                    className="bg-teal-600 h-full"
                    title="بانک‌ها"
                  />
                  <div
                    style={{ width: `${Math.round((totalCashBalanceIrr / (totalLiquidityIrr || 1)) * 100)}%` }}
                    className="bg-emerald-400 h-full"
                    title="صندوق‌ها"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>بانک: {Math.round((totalBankBalanceIrr / (totalLiquidityIrr || 1)) * 100)}%</span>
                  <span>صندوق: {Math.round((totalCashBalanceIrr / (totalLiquidityIrr || 1)) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-teal-700 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>مدیریت حساب‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Card 2: Total Sales */}
        <div
          onClick={() => onNavigateTab('SALES')}
          className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between ${
            activePerspective === 'SALES' || activePerspective === 'ALL'
              ? 'border-slate-200 hover:border-emerald-400 ring-1 ring-transparent hover:ring-emerald-400/20'
              : 'opacity-60 border-slate-200'
          }`}
        >
          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">فروش کل دوره‌ای</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-emerald-700 tracking-tight font-mono tabular-nums">
                {(totalSalesIrr / 10).toLocaleString('fa-IR')}
                <span className="text-[10px] font-normal text-slate-500 mr-1.5">تومان</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                تعداد: <strong className="text-slate-800 font-mono">{salesInvoices.length}</strong> فاکتور رسمی
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>میز فروش POS</span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Card 3: Receivables */}
        <div
          onClick={() => onNavigateTab('PARTIES')}
          className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between ${
            activePerspective === 'SALES' || activePerspective === 'ALL'
              ? 'border-slate-200 hover:border-blue-400 ring-1 ring-transparent hover:ring-blue-400/20'
              : 'opacity-60 border-slate-200'
          }`}
        >
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500 rounded-r" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">مطالبات از خریداران</span>
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-blue-700 tracking-tight font-mono tabular-nums">
                {(totalReceivablesIrr / 10).toLocaleString('fa-IR')}
                <span className="text-[10px] font-normal text-slate-500 mr-1.5">تومان</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1 truncate" title={`بدهی به تأمین‌کنندگان: ${(totalPayablesIrr / 10).toLocaleString('fa-IR')} تومان`}>
                بدهی تأمین‌کننده: {(totalPayablesIrr / 10).toLocaleString('fa-IR')}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-blue-700 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>صورت‌حساب اشخاص</span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Card 4: Installation & Projects */}
        <div
          onClick={() => onNavigateTab('INSTALLATION')}
          className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between ${
            activePerspective === 'PROJECTS' || activePerspective === 'ALL'
              ? 'border-slate-200 hover:border-cyan-400 ring-1 ring-transparent hover:ring-cyan-400/20'
              : 'opacity-60 border-slate-200'
          }`}
        >
          <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-500 rounded-r" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">پروژه‌های نصب دوربین</span>
              <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                {activeProjects.length + activeJobs.length}
                <span className="text-[10px] font-normal text-slate-500 mr-1.5">مورد فعال</span>
              </p>
              <p className="text-[11px] text-cyan-800 font-medium mt-1">
                کارتابل نصابان و پیشرفت میدانی
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-cyan-700 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>مدیریت پروژه‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Card 5: In-hand Cheques */}
        <div
          onClick={() => onNavigateTab('TREASURY')}
          className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between ${
            activePerspective === 'TREASURY' || activePerspective === 'ALL'
              ? 'border-slate-200 hover:border-indigo-400 ring-1 ring-transparent hover:ring-indigo-400/20'
              : 'opacity-60 border-slate-200'
          }`}
        >
          <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500 rounded-r" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">چک‌های نزد صندوق</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-indigo-700 tracking-tight font-mono tabular-nums">
                {(totalInHandChequesIrr / 10).toLocaleString('fa-IR')}
                <span className="text-[10px] font-normal text-slate-500 mr-1.5">تومان</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                تعداد: <strong className="text-slate-800 font-mono">{inHandCheques.length}</strong> فقره چک دریافتنی
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>دفتر چک و سررسید</span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Card 6: Low Stock Alert */}
        <div
          onClick={() => onNavigateTab('INVENTORY')}
          className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between ${
            activePerspective === 'INVENTORY' || activePerspective === 'ALL'
              ? 'border-slate-200 hover:border-amber-400 ring-1 ring-transparent hover:ring-amber-400/20'
              : 'opacity-60 border-slate-200'
          }`}
        >
          <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 rounded-r" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">اقلام نیازمند سفارش</span>
              <div
                className={`p-2.5 rounded-xl group-hover:scale-110 transition-all ${
                  lowStockItems.length > 0
                    ? 'bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                {lowStockItems.length}
                <span className="text-[10px] font-normal text-slate-500 mr-1.5">کالا</span>
              </p>
              <p
                className={`text-[11px] font-bold mt-1 ${
                  lowStockItems.length > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {lowStockItems.length > 0 ? 'کمتر از نقطه سفارش انبار' : 'موجودی انبار در حد مطلوب'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-700 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>کاردکس و انبارداری</span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    )}

    {/* 4. VISUAL CHARTS ROW: SALES VELOCITY & LIQUIDITY ALLOCATION */}
    {(widgets.salesChart || widgets.liquidityChart) && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1 (2 cols): Recent Sales Velocity Spark-Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  نمودار تحلیلی روند گردش و مبالغ فاکتورهای فروش اخیر
                </h3>
                <p className="text-[11px] text-slate-500">
                  ارزش ریالی تراکنش‌های فروش متوالی در فروشگاه و دفتر مرکزی
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('SALES')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50/60 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <span>مشاهده کل فاکتورها</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SVG Animated Chart Visualization */}
          <div className="pt-6 pb-2">
            <div className="h-48 flex items-end gap-3 sm:gap-6 justify-between px-2 sm:px-4">
              {salesChartData.map((d, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-lg font-mono pointer-events-none whitespace-nowrap mb-1">
                    {d.amountToman ? `${d.amountToman.toLocaleString('fa-IR')} تومان` : '۰ تومان'}
                  </div>

                  {/* Animated Bar with gradient */}
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl overflow-hidden h-full flex items-end">
                    <div
                      style={{ height: `${d.heightPct}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-xs relative"
                    >
                      <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
                    </div>
                  </div>

                  {/* Label */}
                  <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-900 font-bold">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                فروش خالص نقدی و اعتباری
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
                میانگین ارزش فاکتورها
              </span>
            </div>
            <span className="font-mono text-slate-600">
              مجموع ۷ فاکتور اخیر: {(salesChartData.reduce((s, x) => s + (x.amountToman || 0), 0)).toLocaleString('fa-IR')} تومان
            </span>
          </div>
        </div>

        {/* Chart 2 (1 col): Liquidity & Vault Distribution (Interactive Donut / Bar) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">ترکیب دارایی‌های نقدینگی</h3>
                <p className="text-[11px] text-slate-500">توزیع بین بانک، صندوق و اسناد نزد صندوق</p>
              </div>
            </div>
          </div>

          {/* Donut representation */}
          <div className="py-4 flex items-center justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" className="text-slate-100 stroke-current" strokeWidth="12" fill="transparent" />
                {/* Bank slice */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="text-teal-600 stroke-current transition-all duration-1000"
                  strokeWidth="12"
                  strokeDasharray={`${(bankPct * 238.76) / 100} 238.76`}
                  strokeDashoffset="0"
                  fill="transparent"
                />
                {/* Cash slice */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="text-emerald-400 stroke-current transition-all duration-1000"
                  strokeWidth="12"
                  strokeDasharray={`${(cashPct * 238.76) / 100} 238.76`}
                  strokeDashoffset={`${-((bankPct * 238.76) / 100)}`}
                  fill="transparent"
                />
                {/* Cheque slice */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="text-indigo-500 stroke-current transition-all duration-1000"
                  strokeWidth="12"
                  strokeDasharray={`${(chequePct * 238.76) / 100} 238.76`}
                  strokeDashoffset={`${-(((bankPct + cashPct) * 238.76) / 100)}`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-[10px] text-slate-400 font-bold block">مجموع نقدینگی</span>
                <span className="text-sm font-black font-mono text-slate-900 block tabular-nums">
                  {(totalAssets / 10).toLocaleString('fa-IR')}
                </span>
                <span className="text-[9px] text-slate-500">تومان</span>
              </div>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-teal-600 inline-block" />
                <span className="font-bold text-slate-800">حساب‌های بانکی ({bankAccounts.length})</span>
              </div>
              <span className="font-mono font-bold text-teal-800">
                {(totalBankBalanceIrr / 10).toLocaleString('fa-IR')} ت ({bankPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-400 inline-block" />
                <span className="font-bold text-slate-800">صندوق‌های نقدی ({cashBoxes.length})</span>
              </div>
              <span className="font-mono font-bold text-emerald-800">
                {(totalCashBalanceIrr / 10).toLocaleString('fa-IR')} ت ({cashPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block" />
                <span className="font-bold text-slate-800">چک‌های نزد صندوق ({inHandCheques.length})</span>
              </div>
              <span className="font-mono font-bold text-indigo-800">
                {(totalInHandChequesIrr / 10).toLocaleString('fa-IR')} ت ({chequePct}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* 5. MAIN OPERATIONS SPLIT: RECENT INVOICES & CCTV PROJECTS VS BANK VAULT & ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Invoices Table with Search & CCTV Active Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Table: Recent Sales Invoices */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  آخرین فاکتورهای فروش صادرشده
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  جستجو و فیلتر سریع فاکتورهای رسمی و تسویه‌حساب مشتریان
                </p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    placeholder="جستجوی فاکتور / خریدار..."
                    className="w-full pr-8 pl-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setInvoiceStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                      invoiceStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    همه
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceStatusFilter('PAID')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                      invoiceStatusFilter === 'PAID' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    تسویه
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceStatusFilter('PENDING')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                      invoiceStatusFilter === 'PENDING' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    بدهکار
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                    <th className="p-3">شماره فاکتور</th>
                    <th className="p-3">خریدار / مشتری</th>
                    <th className="p-3 text-center">تاریخ صدور</th>
                    <th className="p-3 text-left">مبلغ کل (تومان)</th>
                    <th className="p-3 text-center">وضعیت تسویه</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        موردی منطبق با فیلتر یا جستجو یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-3 font-mono font-bold text-slate-900" dir="ltr">
                          #{inv.invoiceNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900">{inv.customerTitleFa}</div>
                          {inv.notesFa && (
                            <span className="text-[10px] text-slate-400 truncate max-w-xs block">
                              {inv.notesFa}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">{inv.dateJalali}</td>
                        <td className="p-3 text-left font-mono font-black text-slate-900 tabular-nums">
                          {(inv.totalInvoiceAmountIrr / 10).toLocaleString('fa-IR')}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-block ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {inv.status === 'PAID'
                              ? 'تسویه کامل'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'تسویه ناقص'
                              : 'در انتظار پرداخت'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => onNavigateTab('SALES')}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                            title="مشاهده در ماژول فروش"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active CCTV Projects & Installations Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    پروژه‌ها و سفارشات نصب فعال دوربین مداربسته (CCTV)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    نظارت بر کارتابل نصابان، بازدیدهای میدانی و تحویل تجهیزات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('INSTALLATION')}
                className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer bg-cyan-50/60 px-3 py-1.5 rounded-xl border border-cyan-200 hover:bg-cyan-100 transition-colors"
              >
                <span>مشاهده کارتابل نصابان</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {projects.slice(0, 4).length === 0 && installationJobs.slice(0, 4).length === 0 ? (
                <div className="col-span-2 p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  هیچ سفارش یا پروژه فعالی در جریان نیست. برای ثبت پروژه به بخش خدمات و نصب مراجعه کنید.
                </div>
              ) : (
                projects.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onNavigateTab('INSTALLATION')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/30 border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-cyan-900 bg-cyan-100/70 px-2 py-0.5 rounded-md">
                        {p.projectCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'IN_PROGRESS'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status === 'COMPLETED'
                          ? 'تکمیل‌شده'
                          : p.status === 'IN_PROGRESS'
                          ? 'در حال اجرا'
                          : 'در انتظار'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 truncate">{p.titleFa}</h4>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        مشتری: <strong>{p.customerTitleFa}</strong> · نصاب:{' '}
                        <span className="text-cyan-800 font-bold">{p.installerTitleFa || 'تعیین‌نشده'}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">مبلغ قرارداد:</span>
                      <span className="font-mono font-black text-slate-900">
                        {(p.contractAmountIrr / 10).toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Real-time Bank Balances & Critical Inventory Alerts */}
        <div className="space-y-6">
          {/* Real-time Bank Accounts and Cash Registers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-teal-600" />
                <h3 className="font-black text-sm text-slate-900">موجودی حساب‌ها و صندوق‌ها</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('TREASURY')}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <span>خزانه</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 bg-gradient-to-r from-slate-50 to-teal-50/20 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-teal-300 transition-all"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      {b.bankNameFa}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">حساب: {b.accountNumber}</p>
                  </div>
                  <div className="text-left font-mono font-black text-teal-800 text-xs tabular-nums">
                    {(b.balanceIrr / 10).toLocaleString('fa-IR')}{' '}
                    <span className="text-[10px] font-normal text-slate-500">تومان</span>
                  </div>
                </div>
              ))}

              {cashBoxes.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 bg-gradient-to-r from-slate-50 to-emerald-50/20 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition-all"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {c.titleFa}
                    </p>
                    <p className="text-[10px] text-slate-500">صندوق نقدی فروشگاه</p>
                  </div>
                  <div className="text-left font-mono font-black text-slate-900 text-xs tabular-nums">
                    {(c.balanceIrr / 10).toLocaleString('fa-IR')}{' '}
                    <span className="text-[10px] font-normal text-slate-500">تومان</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Inventory Low Stock Alerts */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-black text-sm text-slate-900">دیده‌بان موجودی کالای بحرانی</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('INVENTORY')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>انبارداری</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {lowStockItems.length === 0 ? (
                <div className="p-5 text-center text-emerald-700 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-xs">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  تمامی اقلام کالا دارای موجودی بالاتر از نقطه هشدار می‌باشند.
                </div>
              ) : (
                lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-amber-50/50 border border-amber-200 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[170px]">{item.titleFa}</p>
                      <p className="text-[10px] text-slate-500">
                        کد: <span className="font-mono">{item.itemCode || (item as any).code}</span> · حداقل هشدار: {item.minStockAlert}
                      </p>
                    </div>
                    <div className="text-left font-mono font-black text-amber-900 text-xs">
                      {item.totalStock ?? (item as any).stock ?? 0} <span className="text-[10px] font-normal">{item.unitNameFa || (item as any).unitFa || 'عدد'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

        </div>
      </div>
    </div>
  );
};
