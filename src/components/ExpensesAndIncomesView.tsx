import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  X,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  Wallet,
  Building2,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from 'lucide-react';
import {
  OperationalExpenseRecord,
  OperationalIncomeRecord,
  BankAccountRecord,
  CashBoxRecord,
} from '../types/foundation';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import { QuickMasterModal, QuickAddButton, QuickMasterType } from './QuickMasterModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ExpensesAndIncomesViewProps {
  expenses: OperationalExpenseRecord[];
  incomes: OperationalIncomeRecord[];
  bankAccounts: BankAccountRecord[];
  cashBoxes: CashBoxRecord[];
  onRefresh: () => void;
}

export function ExpensesAndIncomesView({
  expenses,
  incomes,
  bankAccounts,
  cashBoxes,
  onRefresh,
}: ExpensesAndIncomesViewProps) {
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'INCOMES'>('EXPENSES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [quickMasterType, setQuickMasterType] = useState<QuickMasterType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'EXPENSE' | 'INCOME';
    title: string;
    message: string;
    details: string;
    id: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // New Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    titleFa: '',
    categoryFa: 'اجاره',
    amountIrr: '',
    dateJalali: '1405/01/25',
    paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'POS',
    sourceBankOrCash: 'صندوق مرکزی',
    notesFa: '',
  });

  // New Income Form State
  const [incomeForm, setIncomeForm] = useState({
    titleFa: '',
    categoryFa: 'درآمدهای عملیاتی',
    amountIrr: '',
    dateJalali: '1405/01/25',
    receiptMethod: 'BANK_TRANSFER' as 'CASH' | 'BANK_TRANSFER' | 'POS',
    targetBankOrCash: 'بانک ملت - حساب جاری اصلی',
    notesFa: '',
  });

  // Summary Metrics
  const totalExpenseAmt = expenses.reduce((sum, e) => sum + (e.amountIrr || 0), 0);
  const totalIncomeAmt = incomes.reduce((sum, i) => sum + (i.amountIrr || 0), 0);
  const netOperatingBal = totalIncomeAmt - totalExpenseAmt;

  // Filtered lists
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.titleFa.includes(searchQuery) ||
      e.expenseCode.includes(searchQuery) ||
      (e.notesFa && e.notesFa.includes(searchQuery));
    const matchesCat = selectedCategory === 'ALL' || e.categoryFa === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredIncomes = incomes.filter((i) => {
    const matchesSearch =
      !searchQuery ||
      i.titleFa.includes(searchQuery) ||
      i.incomeCode.includes(searchQuery) ||
      (i.notesFa && i.notesFa.includes(searchQuery));
    const matchesCat = selectedCategory === 'ALL' || i.categoryFa === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.titleFa.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً عنوان هزینه را وارد نمایید.' });
      return;
    }
    const amt = Number(expenseForm.amountIrr.replace(/,/g, ''));
    if (!amt || amt <= 0) {
      setFeedback({ type: 'error', message: 'مبلغ هزینه باید بزرگتر از صفر باشد.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/operational-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleFa: expenseForm.titleFa.trim(),
          categoryFa: expenseForm.categoryFa,
          amountIrr: amt,
          dateJalali: expenseForm.dateJalali,
          paymentMethod: expenseForm.paymentMethod,
          sourceBankOrCash: expenseForm.sourceBankOrCash,
          notesFa: expenseForm.notesFa.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || 'هزینه با موفقیت ثبت شد.' });
        setIsExpenseModalOpen(false);
        setExpenseForm({
          titleFa: '',
          categoryFa: 'اجاره',
          amountIrr: '',
          dateJalali: '1405/01/25',
          paymentMethod: 'CASH',
          sourceBankOrCash: 'صندوق مرکزی',
          notesFa: '',
        });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت هزینه.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'عدم دسترسی به سرور.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.titleFa.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً عنوان درآمد را وارد نمایید.' });
      return;
    }
    const amt = Number(incomeForm.amountIrr.replace(/,/g, ''));
    if (!amt || amt <= 0) {
      setFeedback({ type: 'error', message: 'مبلغ درآمد باید بزرگتر از صفر باشد.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/operational-incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleFa: incomeForm.titleFa.trim(),
          categoryFa: incomeForm.categoryFa,
          amountIrr: amt,
          dateJalali: incomeForm.dateJalali,
          receiptMethod: incomeForm.receiptMethod,
          targetBankOrCash: incomeForm.targetBankOrCash,
          notesFa: incomeForm.notesFa.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || 'درآمد با موفقیت ثبت شد.' });
        setIsIncomeModalOpen(false);
        setIncomeForm({
          titleFa: '',
          categoryFa: 'درآمدهای عملیاتی',
          amountIrr: '',
          dateJalali: '1405/01/25',
          receiptMethod: 'BANK_TRANSFER',
          targetBankOrCash: 'بانک ملت - حساب جاری اصلی',
          notesFa: '',
        });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت درآمد.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'عدم دسترسی به سرور.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = (exp: OperationalExpenseRecord) => {
    setDeleteError(null);
    setDeleteTarget({
      type: 'EXPENSE',
      title: 'تایید حذف هزینه',
      message: `آیا از حذف کامل هزینه «${exp.titleFa}» اطمینان دارید؟`,
      details: `گروه: ${exp.categoryFa}\nمبلغ: ${(exp.amountIrr / 10).toLocaleString('fa-IR')} تومان`,
      id: exp.id,
    });
  };

  const handleDeleteIncome = (inc: OperationalIncomeRecord) => {
    setDeleteError(null);
    setDeleteTarget({
      type: 'INCOME',
      title: 'تایید حذف درآمد',
      message: `آیا از حذف کامل درآمد «${inc.titleFa}» اطمینان دارید؟`,
      details: `گروه: ${inc.categoryFa}\nمبلغ: ${(inc.amountIrr / 10).toLocaleString('fa-IR')} تومان`,
      id: inc.id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const url =
        deleteTarget.type === 'EXPENSE'
          ? `/api/operational-expenses/${deleteTarget.id}`
          : `/api/operational-incomes/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || 'حذف با موفقیت انجام شد.' });
        setDeleteTarget(null);
        setDeleteError(null);
        onRefresh();
      } else {
        const msg = data.messageFa || 'امکان حذف وجود ندارد.';
        setDeleteError(msg);
        setFeedback({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'خطای شبکه در ارتباط با سرور.';
      setDeleteError(msg);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'EXPENSES') {
      exportToExcel(
        'لیست_هزینه‌های_عملیاتی',
        'هزینه‌ها',
        [
          { header: 'کد هزینه', key: 'expenseCode' },
          { header: 'عنوان هزینه', key: 'titleFa' },
          { header: 'گروه هزینه', key: 'categoryFa' },
          { header: 'تاریخ شمسی', key: 'dateJalali' },
          { header: 'مبلغ (ریال)', key: 'amountIrr' },
          { header: 'منبع پرداخت', key: 'sourceBankOrCash' },
          { header: 'توضیحات', key: 'notesFa' },
        ],
        filteredExpenses as unknown as Record<string, unknown>[]
      );
    } else {
      exportToExcel(
        'لیست_درآمدهای_عملیاتی',
        'درآمدها',
        [
          { header: 'کد درآمد', key: 'incomeCode' },
          { header: 'عنوان درآمد', key: 'titleFa' },
          { header: 'گروه درآمد', key: 'categoryFa' },
          { header: 'تاریخ شمسی', key: 'dateJalali' },
          { header: 'مبلغ (ریال)', key: 'amountIrr' },
          { header: 'حساب مقصد', key: 'targetBankOrCash' },
          { header: 'توضیحات', key: 'notesFa' },
        ],
        filteredIncomes as unknown as Record<string, unknown>[]
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Cards */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <span>مدیریت هزینه‌ها و درآمدهای عملیاتی</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت سریع هزینه‌های جاری و درآمدهای متفرقه با به‌روزرسانی خودکار دیتابیس، خزانه و دفاتر مالی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setIsExpenseModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت هزینه جدید</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setIsIncomeModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت درآمد جدید</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">مجموع درآمدهای متفرقه/عملیاتی</span>
            <div className="text-lg font-black text-emerald-600 mt-1 dir-ltr text-right font-mono">
              {totalIncomeAmt.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">ریال</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">مجموع هزینه‌های جاری و اداری</span>
            <div className="text-lg font-black text-rose-600 mt-1 dir-ltr text-right font-mono">
              {totalExpenseAmt.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">ریال</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">خالص تراز درآمد و هزینه</span>
            <div
              className={`text-lg font-black mt-1 dir-ltr text-right font-mono ${
                netOperatingBal >= 0 ? 'text-blue-700' : 'text-rose-700'
              }`}
            >
              {netOperatingBal.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">ریال</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Tabs & Filtering Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('EXPENSES');
                setSelectedCategory('ALL');
              }}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'EXPENSES'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔻 لیست هزینه‌ها ({expenses.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('INCOMES');
                setSelectedCategory('ALL');
              }}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'INCOMES'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟢 لیست درآمدها ({incomes.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو در عنوان، کد یا شرح..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>خروجی اکسل</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeTab === 'EXPENSES') {
                  const columns = [
                    { header: 'کد هزینه', key: 'expenseCode' },
                    { header: 'عنوان هزینه', key: 'titleFa' },
                    { header: 'گروه', key: 'categoryFa' },
                    { header: 'تاریخ', key: 'dateJalali' },
                    { header: 'مبلغ (ریال)', key: 'amount' },
                    { header: 'منبع پرداخت', key: 'sourceBankOrCash' },
                    { header: 'توضیحات', key: 'notesFa' },
                  ];
                  const data = filteredExpenses.map((exp) => ({
                    ...exp,
                    amount: exp.amountIrr.toLocaleString(),
                  }));
                  exportToPdf('فهرست هزینه‌های عملیاتی و جاری مهرگان', columns, data, {
                    docNumber: `EXP-${Date.now().toString().slice(-6)}`,
                    summaryFa: `مجموع هزینه‌ها: ${totalExpenseAmt.toLocaleString()} ریال (${(totalExpenseAmt / 10).toLocaleString()} تومان)`,
                  });
                } else {
                  const columns = [
                    { header: 'کد درآمد', key: 'incomeCode' },
                    { header: 'عنوان درآمد', key: 'titleFa' },
                    { header: 'گروه', key: 'categoryFa' },
                    { header: 'تاریخ', key: 'dateJalali' },
                    { header: 'مبلغ (ریال)', key: 'amount' },
                    { header: 'حساب واریزی', key: 'destinationBankOrCash' },
                    { header: 'توضیحات', key: 'notesFa' },
                  ];
                  const data = filteredIncomes.map((inc) => ({
                    ...inc,
                    amount: inc.amountIrr.toLocaleString(),
                  }));
                  exportToPdf('فهرست درآمدهای غیرعملیاتی و متفرقه مهرگان', columns, data, {
                    docNumber: `INC-${Date.now().toString().slice(-6)}`,
                    summaryFa: `مجموع درآمدها: ${totalIncomeAmt.toLocaleString()} ریال (${(totalIncomeAmt / 10).toLocaleString()} تومان)`,
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ</span>
            </button>
          </div>
        </div>

        {/* 3. Table Display */}
        {activeTab === 'EXPENSES' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center">#</th>
                  <th className="p-3">کد هزینه</th>
                  <th className="p-3">عنوان هزینه</th>
                  <th className="p-3">گروه هزینه</th>
                  <th className="p-3 text-center">تاریخ</th>
                  <th className="p-3 text-left">مبلغ (ریال)</th>
                  <th className="p-3">منبع پرداخت</th>
                  <th className="p-3">توضیحات</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      هیچ هزینه‌ای ثبت نشده یا با فیلترها مطابقت ندارد.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-rose-700">{exp.expenseCode}</td>
                      <td className="p-3 font-bold text-slate-900">{exp.titleFa}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          {exp.categoryFa}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">{exp.dateJalali}</td>
                      <td className="p-3 text-left font-mono font-extrabold text-rose-600">
                        {exp.amountIrr.toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{exp.sourceBankOrCash}</td>
                      <td className="p-3 text-slate-500">{exp.notesFa || '-'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف هزینه"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center">#</th>
                  <th className="p-3">کد درآمد</th>
                  <th className="p-3">عنوان درآمد</th>
                  <th className="p-3">گروه درآمد</th>
                  <th className="p-3 text-center">تاریخ</th>
                  <th className="p-3 text-left">مبلغ (ریال)</th>
                  <th className="p-3">حساب مقصد</th>
                  <th className="p-3">توضیحات</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      هیچ درآمدی ثبت نشده یا با فیلترها مطابقت ندارد.
                    </td>
                  </tr>
                ) : (
                  filteredIncomes.map((inc, idx) => (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{inc.incomeCode}</td>
                      <td className="p-3 font-bold text-slate-900">{inc.titleFa}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {inc.categoryFa}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">{inc.dateJalali}</td>
                      <td className="p-3 text-left font-mono font-extrabold text-emerald-600">
                        {inc.amountIrr.toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{inc.targetBankOrCash}</td>
                      <td className="p-3 text-slate-500">{inc.notesFa || '-'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteIncome(inc)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف درآمد"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: REGISTER EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>ثبت هزینه جدید</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان هزینه *</label>
                <input
                  type="text"
                  placeholder="مثلاً اجاره دفتر مرکزی، قبوض برق..."
                  value={expenseForm.titleFa}
                  onChange={(e) => setExpenseForm({ ...expenseForm, titleFa: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">گروه هزینه</label>
                  <select
                    value={expenseForm.categoryFa}
                    onChange={(e) => setExpenseForm({ ...expenseForm, categoryFa: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="اجاره">اجاره ملک</option>
                    <option value="حقوق و دستمزد">حقوق و دستمزد</option>
                    <option value="قبوض">قبوض و خدمات عمومی</option>
                    <option value="بازاریابی">بازاریابی و تبلیغات</option>
                    <option value="ملزومات">ملزومات و ملزومات اداری</option>
                    <option value="حمل و نقل">حمل و نقل و ایاب و ذهاب</option>
                    <option value="سایر">سایر هزینه‌ها</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاریخ شمسی</label>
                  <input
                    type="text"
                    value={expenseForm.dateJalali}
                    onChange={(e) => setExpenseForm({ ...expenseForm, dateJalali: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مبلغ هزینه (ریال) *</label>
                <input
                  type="text"
                  placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
                  value={expenseForm.amountIrr}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amountIrr: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left font-extrabold text-rose-700 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نحوه پرداخت</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        paymentMethod: e.target.value as 'CASH' | 'BANK_TRANSFER' | 'POS',
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="CASH">نقدی از صندوق</option>
                    <option value="BANK_TRANSFER">حواله / کارت‌به‌کارت بانکی</option>
                    <option value="POS">کارتخوان POS</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">منبع پرداختی</label>
                    <button
                      type="button"
                      onClick={() => setQuickMasterType(expenseForm.paymentMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="افزودن سریع بانک یا صندوق جدید"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{expenseForm.paymentMethod === 'CASH' ? 'صندوق جدید' : 'بانک جدید'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      list="expense-sources-list"
                      placeholder="انتخاب یا تایپ بانک یا صندوق..."
                      value={expenseForm.sourceBankOrCash}
                      onChange={(e) => setExpenseForm({ ...expenseForm, sourceBankOrCash: e.target.value })}
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                    />
                    <datalist id="expense-sources-list">
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={`${b.bankNameFa} (${b.accountNumber})`} />
                      ))}
                      {cashBoxes.map((c) => (
                        <option key={c.id} value={`صندوق ${c.titleFa}`} />
                      ))}
                    </datalist>
                    <QuickAddButton
                      onClick={() => setQuickMasterType(expenseForm.paymentMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                      title="افزودن حساب بانکی یا صندوق جدید"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و بابت</label>
                <textarea
                  rows={2}
                  value={expenseForm.notesFa}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notesFa: e.target.value })}
                  placeholder="توضیحات تکمیلی..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت قطعی هزینه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER INCOME */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>ثبت درآمد جدید</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان درآمد *</label>
                <input
                  type="text"
                  placeholder="مثلاً درآمد خدمات مشاوره شبکه، فروش ضایعات..."
                  value={incomeForm.titleFa}
                  onChange={(e) => setIncomeForm({ ...incomeForm, titleFa: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">گروه درآمد</label>
                  <select
                    value={incomeForm.categoryFa}
                    onChange={(e) => setIncomeForm({ ...incomeForm, categoryFa: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="درآمدهای عملیاتی">درآمدهای عملیاتی</option>
                    <option value="خدمات مشاوره">خدمات مشاوره و طراحی</option>
                    <option value="سود بانکی">سود بانکی و سرمایه‌گذاری</option>
                    <option value="فروش ضایعات">فروش ضایعات و تجهیزات مستعمل</option>
                    <option value="سایر">سایر درآمدهای متفرقه</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاریخ شمسی</label>
                  <input
                    type="text"
                    value={incomeForm.dateJalali}
                    onChange={(e) => setIncomeForm({ ...incomeForm, dateJalali: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مبلغ درآمد (ریال) *</label>
                <input
                  type="text"
                  placeholder="مثلاً ۹۵,۰۰۰,۰۰۰"
                  value={incomeForm.amountIrr}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amountIrr: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left font-extrabold text-emerald-700 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نحوه دریافت</label>
                  <select
                    value={incomeForm.receiptMethod}
                    onChange={(e) =>
                      setIncomeForm({
                        ...incomeForm,
                        receiptMethod: e.target.value as 'CASH' | 'BANK_TRANSFER' | 'POS',
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="BANK_TRANSFER">واریز بانکی / حواله</option>
                    <option value="CASH">نقدی به صندوق</option>
                    <option value="POS">کارتخوان POS</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">حساب مقصد</label>
                    <button
                      type="button"
                      onClick={() => setQuickMasterType(incomeForm.receiptMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="افزودن سریع بانک یا صندوق جدید"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{incomeForm.receiptMethod === 'CASH' ? 'صندوق جدید' : 'بانک جدید'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      list="income-dest-list"
                      placeholder="انتخاب یا تایپ بانک یا صندوق..."
                      value={incomeForm.targetBankOrCash}
                      onChange={(e) => setIncomeForm({ ...incomeForm, targetBankOrCash: e.target.value })}
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                    />
                    <datalist id="income-dest-list">
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={`${b.bankNameFa} (${b.accountNumber})`} />
                      ))}
                      {cashBoxes.map((c) => (
                        <option key={c.id} value={`صندوق ${c.titleFa}`} />
                      ))}
                    </datalist>
                    <QuickAddButton
                      onClick={() => setQuickMasterType(incomeForm.receiptMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                      title="افزودن حساب بانکی یا صندوق جدید"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات</label>
                <textarea
                  rows={2}
                  value={incomeForm.notesFa}
                  onChange={(e) => setIncomeForm({ ...incomeForm, notesFa: e.target.value })}
                  placeholder="توضیحات تکمیلی..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت قطعی درآمد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Master Creation Modal */}
      <QuickMasterModal
        isOpen={quickMasterType !== null}
        onClose={() => setQuickMasterType(null)}
        type={quickMasterType || 'BANK_ACCOUNT'}
        onSuccess={(res) => {
          if (res.type === 'BANK_ACCOUNT' || res.type === 'CASH_BOX') {
            if (isExpenseModalOpen) {
              setExpenseForm((prev) => ({ ...prev, sourceBankOrCash: res.title }));
            }
            if (isIncomeModalOpen) {
              setIncomeForm((prev) => ({ ...prev, targetBankOrCash: res.title }));
            }
          }
        }}
        onRefresh={onRefresh}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        title={deleteTarget?.title || 'تایید حذف'}
        message={deleteTarget?.message || ''}
        details={deleteTarget?.details}
        errorMessage={deleteError}
        confirmText="حذف قطعی"
        cancelText="انصراف"
        isLoading={isDeleting}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
