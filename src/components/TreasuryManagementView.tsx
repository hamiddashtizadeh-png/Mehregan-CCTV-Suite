import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Receipt,
  FileCheck2,
  Calendar,
  AlertCircle,
  Plus,
  Search,
  DollarSign,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  CreditCard,
  Tag,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Filter,
  Trash2,
} from 'lucide-react';
import {
  FoundationDataResponse,
  CashBoxRecord,
  BankAccountRecord,
  ChequeRecord,
  TreasuryTransactionRecord,
  InstallmentRecord,
  OperationalExpenseRecord,
  ChequeStatus,
} from '../types/foundation';
import { QuickMasterModal, QuickAddButton, QuickMasterType } from './QuickMasterModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TreasuryManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => void;
}

type TreasurySubTab = 'OVERVIEW' | 'TRANSACTIONS' | 'CHEQUES' | 'INSTALLMENTS' | 'EXPENSES';

export const TreasuryManagementView: React.FC<TreasuryManagementViewProps> = ({
  foundationData,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TreasurySubTab>('OVERVIEW');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete Modal States
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'CHEQUE' | 'TRANSACTION';
    title: string;
    message: string;
    details: string;
    id: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Raw lists from store
  const cashBoxes = foundationData.cashBoxes || [];
  const bankAccounts = foundationData.bankAccounts || [];
  const cheques = foundationData.cheques || [];
  const treasuryTransactions = foundationData.treasuryTransactions || [];
  const installments = foundationData.installments || [];
  const operationalExpenses = foundationData.operationalExpenses || [];
  const parties = foundationData.parties || [];

  // Summary Metrics
  const totalCashBalance = useMemo(
    () => cashBoxes.reduce((acc, c) => acc + (c.balanceIrr || 0), 0),
    [cashBoxes]
  );
  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((acc, b) => acc + (b.balanceIrr || 0), 0),
    [bankAccounts]
  );
  const totalLiquidity = totalCashBalance + totalBankBalance;

  const pendingReceivedCheques = useMemo(
    () =>
      cheques
        .filter((c) => c.chequeType === 'INBOUND' && (c.status === 'IN_HAND' || c.status === 'DEPOSITED'))
        .reduce((acc, c) => acc + (c.amountIrr || 0), 0),
    [cheques]
  );

  const pendingIssuedCheques = useMemo(
    () =>
      cheques
        .filter((c) => c.chequeType === 'OUTBOUND' && c.status === 'IN_HAND')
        .reduce((acc, c) => acc + (c.amountIrr || 0), 0),
    [cheques]
  );

  const overdueInstallmentsCount = useMemo(
    () => installments.filter((i) => i.status === 'OVERDUE' || (i.status === 'PENDING' && i.dueDateJalali < '1405/01/25')).length,
    [installments]
  );

  // Search & Filter state
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [chequeFilterType, setChequeFilterType] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>('ALL');
  const [chequeFilterStatus, setChequeFilterStatus] = useState<string>('ALL');

  // Modals state
  const [showNewBoxModal, setShowNewBoxModal] = useState(false);
  const [showNewBankModal, setShowNewBankModal] = useState(false);
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [showNewChequeModal, setShowNewChequeModal] = useState(false);
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [selectedChequeForStatus, setSelectedChequeForStatus] = useState<ChequeRecord | null>(null);
  const [quickMasterType, setQuickMasterType] = useState<QuickMasterType | null>(null);
  const [quickMasterPartyRole, setQuickMasterPartyRole] = useState<'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'OTHER'>('CUSTOMER');

  // Forms State
  const [newBoxTitle, setNewBoxTitle] = useState('');
  const [newBoxInitialBalance, setNewBoxInitialBalance] = useState<number>(0);

  const [newBankName, setNewBankName] = useState('');
  const [newBankAccountNo, setNewBankAccountNo] = useState('');
  const [newBankShaba, setNewBankShaba] = useState('');
  const [newBankInitialBalance, setNewBankInitialBalance] = useState<number>(0);

  // Transaction Form State
  const [txType, setTxType] = useState<'RECEIPT' | 'PAYMENT' | 'TRANSFER'>('RECEIPT');
  const [txPartyId, setTxPartyId] = useState<number>(parties[0]?.id || 1);
  const [txAmountTomans, setTxAmountTomans] = useState<number>(1000000);
  const [txPaymentMethod, setTxPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'POS' | 'CHEQUE'>('POS');
  const [txSourceAccountType, setTxSourceAccountType] = useState<'CASH' | 'BANK'>('BANK');
  const [txSourceAccountId, setTxSourceAccountId] = useState<number>(bankAccounts[0]?.id || 1);
  const [txTargetAccountType, setTxTargetAccountType] = useState<'CASH' | 'BANK'>('CASH');
  const [txTargetAccountId, setTxTargetAccountId] = useState<number>(cashBoxes[0]?.id || 1);
  const [txNotes, setTxNotes] = useState('');

  // Cheque Form State
  const [chequeNo, setChequeNo] = useState('');
  const [chequeType, setChequeType] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [chequePartyId, setChequePartyId] = useState<number>(parties[0]?.id || 1);
  const [chequeBankName, setChequeBankName] = useState('بانک تجارت');
  const [chequeAmountTomans, setChequeAmountTomans] = useState<number>(5000000);
  const [chequeIssueDate, setChequeIssueDate] = useState('1405/01/25');
  const [chequeDueDate, setChequeDueDate] = useState('1405/02/25');
  const [chequeNotes, setChequeNotes] = useState('');

  // Expense Form State
  const [expenseCategory, setExpenseCategory] = useState('اجاره');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmountTomans, setExpenseAmountTomans] = useState<number>(500000);
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'POS'>('CASH');
  const [expenseNotes, setExpenseNotes] = useState('');

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const handleCreateCashBox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/treasury/cash-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleFa: newBoxTitle,
          balanceIrr: newBoxInitialBalance * 10,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setShowNewBoxModal(false);
        setNewBoxTitle('');
        setNewBoxInitialBalance(0);
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ثبت صندوق جدید.' });
    }
  };

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/treasury/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankNameFa: newBankName,
          accountNumber: newBankAccountNo,
          shabaNumber: newBankShaba,
          balanceIrr: newBankInitialBalance * 10,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setShowNewBankModal(false);
        setNewBankName('');
        setNewBankAccountNo('');
        setNewBankShaba('');
        setNewBankInitialBalance(0);
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ثبت حساب بانکی.' });
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        txType,
        partyId: txPartyId,
        amountIrr: txAmountTomans * 10,
        paymentMethod: txPaymentMethod,
        notesFa: txNotes,
        dateJalali: '1405/01/25',
      };

      if (txType === 'RECEIPT') {
        if (txSourceAccountType === 'BANK') payload.targetBankAccountId = txSourceAccountId;
        else payload.targetCashBoxId = txSourceAccountId;
      } else if (txType === 'PAYMENT') {
        if (txSourceAccountType === 'BANK') payload.sourceBankAccountId = txSourceAccountId;
        else payload.sourceCashBoxId = txSourceAccountId;
      } else if (txType === 'TRANSFER') {
        if (txSourceAccountType === 'BANK') payload.sourceBankAccountId = txSourceAccountId;
        else payload.sourceCashBoxId = txSourceAccountId;

        if (txTargetAccountType === 'BANK') payload.targetBankAccountId = txTargetAccountId;
        else payload.targetCashBoxId = txTargetAccountId;
      }

      const res = await fetch('/api/treasury/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setShowNewTxModal(false);
        setTxNotes('');
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ثبت تراکنش مالی.' });
    }
  };

  const handleCreateCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/treasury/cheques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chequeNumber: chequeNo,
          chequeType,
          partyId: chequePartyId,
          bankNameFa: chequeBankName,
          amountIrr: chequeAmountTomans * 10,
          issueDateJalali: chequeIssueDate,
          dueDateJalali: chequeDueDate,
          notesFa: chequeNotes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setShowNewChequeModal(false);
        setChequeNo('');
        setChequeNotes('');
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ثبت چک.' });
    }
  };

  const handleUpdateChequeStatus = async (chequeId: number, status: ChequeStatus) => {
    try {
      const res = await fetch(`/api/treasury/cheques/${chequeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          clearedDateJalali: status === 'CLEARED' ? '1405/01/25' : undefined,
          depositBankAccountId: bankAccounts[0]?.id || 1,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setSelectedChequeForStatus(null);
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در به‌روزرسانی وضعیت چک.' });
    }
  };

  const handlePayInstallment = async (installmentId: number) => {
    try {
      const res = await fetch(`/api/treasury/installments/${installmentId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidDateJalali: '1405/01/25',
          paymentMethod: 'POS',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در پرداخت قسط.' });
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/treasury/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryFa: expenseCategory,
          titleFa: expenseTitle,
          amountIrr: expenseAmountTomans * 10,
          dateJalali: '1405/01/25',
          paymentMethod: expensePaymentMethod,
          notesFa: expenseNotes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setShowNewExpenseModal(false);
        setExpenseTitle('');
        setExpenseNotes('');
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ثبت هزینه.' });
    }
  };

  const handleDeleteCheque = (chq: ChequeRecord) => {
    setDeleteError(null);
    setDeleteTarget({
      type: 'CHEQUE',
      title: 'تایید حذف چک صیادی',
      message: `آیا از حذف چک صیادی شماره «${chq.chequeNumber}» اطمینان دارید؟`,
      details: `بانک: ${chq.bankNameFa || '-'}\nمبلغ: ${(chq.amountIrr / 10).toLocaleString('fa-IR')} تومان`,
      id: chq.id,
    });
  };

  const handleDeleteTransaction = (tx: TreasuryTransactionRecord) => {
    setDeleteError(null);
    setDeleteTarget({
      type: 'TRANSACTION',
      title: 'تایید حذف تراکنش خزانه',
      message: `آیا از حذف تراکنش مالی «${tx.txNumber}» اطمینان دارید؟`,
      details: `عنوان: ${(tx as any).titleFa || tx.partyNameFa}\nمبلغ: ${(tx.amountIrr / 10).toLocaleString('fa-IR')} تومان`,
      id: tx.id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const url =
        deleteTarget.type === 'CHEQUE'
          ? `/api/treasury/cheques/${deleteTarget.id}`
          : `/api/treasury/transactions/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || 'حذف با موفقیت انجام گردید.' });
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

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (chequeFilterType !== 'ALL' && c.chequeType !== chequeFilterType) return false;
      if (chequeFilterStatus !== 'ALL' && c.status !== chequeFilterStatus) return false;
      return true;
    });
  }, [cheques, chequeFilterType, chequeFilterStatus]);

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            بستن
          </button>
        </div>
      )}

      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquidity */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-emerald-400" />
              مجموع موجودی نقد و بانک
            </span>
            <span className="bg-emerald-800/80 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              محیط عملیاتی
            </span>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black tracking-tight font-mono">
              {(totalLiquidity / 10).toLocaleString()} <span className="text-xs text-emerald-200 font-sans font-normal">تومان</span>
            </h3>
            <p className="text-[11px] text-emerald-300/80 mt-1">
              صندوق‌ها: {(totalCashBalance / 10).toLocaleString()} | بانک‌ها: {(totalBankBalance / 10).toLocaleString()} تومان
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-emerald-800/50 text-[11px] text-emerald-200">
            <span>تعداد حساب‌های فعال:</span>
            <span className="font-bold">{cashBoxes.length + bankAccounts.length} حساب</span>
          </div>
        </div>

        {/* Pending Inbound Cheques */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-blue-600" />
              چک‌های دریافتی در انتظار وصول
            </span>
            <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
              پاس‌نشده
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-xl font-extrabold text-slate-900 font-mono">
              {(pendingReceivedCheques / 10).toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">تومان</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              اسناد دریافتی موجود در صندوق
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>تعداد اسناد:</span>
            <span className="font-bold text-blue-600">
              {cheques.filter((c) => c.chequeType === 'INBOUND' && (c.status === 'IN_HAND' || c.status === 'DEPOSITED')).length} فقره
            </span>
          </div>
        </div>

        {/* Pending Outbound Cheques */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-600" />
              چک‌های پرداختی سررسید آتی
            </span>
            <span className="bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              تعهدات
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-xl font-extrabold text-slate-900 font-mono">
              {(pendingIssuedCheques / 10).toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">تومان</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              تعهدات چک صادره به تامین‌کنندگان
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>تعداد چک‌ها:</span>
            <span className="font-bold text-amber-600">
              {cheques.filter((c) => c.chequeType === 'OUTBOUND' && c.status === 'IN_HAND').length} فقره
            </span>
          </div>
        </div>

        {/* Overdue Installments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-rose-600" />
              برنامه اقساط و سررسیدها
            </span>
            {overdueInstallmentsCount > 0 ? (
              <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                {overdueInstallmentsCount} قسط معوق
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                منظم
              </span>
            )}
          </div>
          <div className="my-2">
            <h3 className="text-xl font-extrabold text-slate-900 font-mono">
              {installments.filter((i) => i.status === 'PENDING').length} <span className="text-xs text-slate-500 font-sans font-normal">قسط فعال</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              دفتر اقساط و مطالبات زمان‌بندی‌شده
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>مطالبات سررسیدشده:</span>
            <span className="font-bold text-rose-600 font-mono">
              {(
                installments
                  .filter((i) => i.status === 'OVERDUE' || (i.status === 'PENDING' && i.dueDateJalali < '1405/01/25'))
                  .reduce((acc, i) => acc + i.amountIrr, 0) / 10
              ).toLocaleString()}{' '}
              تومان
            </span>
          </div>
        </div>
      </div>

      {/* Main Treasury Subtabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubTab('OVERVIEW')}
            className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition-all whitespace-nowrap ${
              activeSubTab === 'OVERVIEW'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            صندوق‌ها و حساب‌های بانکی
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('TRANSACTIONS')}
            className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition-all whitespace-nowrap ${
              activeSubTab === 'TRANSACTIONS'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            دریافت‌ها، پرداخت‌ها و جابه‌جایی
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('CHEQUES')}
            className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition-all whitespace-nowrap ${
              activeSubTab === 'CHEQUES'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مدیریت چک‌های صیادی ({cheques.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('INSTALLMENTS')}
            className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition-all whitespace-nowrap ${
              activeSubTab === 'INSTALLMENTS'
                ? 'bg-white text-rose-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            برنامه اقساط و سررسیدها
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('EXPENSES')}
            className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition-all whitespace-nowrap ${
              activeSubTab === 'EXPENSES'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            هزینه‌های عملیاتی ({operationalExpenses.length})
          </button>
        </div>

        {/* Global Treasury Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewTxModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            ثبت دریافت / پرداخت جدید
          </button>
          <button
            type="button"
            onClick={() => setShowNewChequeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs"
          >
            <CreditCard className="w-4 h-4" />
            ثبت چک جدید
          </button>
        </div>
      </div>

      {/* SUBTAB 1: OVERVIEW & ACCOUNTS (صندوق‌ها و حساب‌های بانکی) */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Boxes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  صندوق‌های نقدی و تنخواه‌گردان ({cashBoxes.length} صندوق)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewBoxModal(true)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-md transition-colors"
                >
                  + تعریف صندوق جدید
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {cashBoxes.map((box) => (
                  <div key={box.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{box.titleFa}</span>
                        <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-1.5 py-0.5 rounded">
                          {box.boxCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        وضعیت: <span className="text-emerald-700 font-bold">فعال</span> · مسئول صندوق: مسعود احمدی
                      </p>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-sm font-extrabold text-slate-900">
                        {(box.balanceIrr / 10).toLocaleString()}
                      </span>{' '}
                      <span className="text-xs text-slate-500 font-sans">تومان</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Accounts */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  حساب‌های بانکی و کارتخوان‌ها ({bankAccounts.length} حساب)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewBankModal(true)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-md transition-colors"
                >
                  + افتتاح / اضافه حساب
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {bankAccounts.map((acc) => (
                  <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{acc.bankNameFa}</span>
                        <span className="bg-blue-50 text-blue-700 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                          {acc.accountCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        شماره حساب: {acc.accountNumber}
                        {acc.shabaNumber && ` · شبا: ${acc.shabaNumber}`}
                      </p>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-sm font-extrabold text-slate-900">
                        {(acc.balanceIrr / 10).toLocaleString()}
                      </span>{' '}
                      <span className="text-xs text-slate-500 font-sans">تومان</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Cash Flow Feed */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                سوابق اخیر گردش وجوه نقد و بانک ({treasuryTransactions.length} تراکنش)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">شماره تراکنش</th>
                    <th className="px-3.5 py-3">نوع رویداد</th>
                    <th className="px-3.5 py-3">طرف حساب / شرح</th>
                    <th className="px-3.5 py-3">تاریخ</th>
                    <th className="px-3.5 py-3">روش پرداخت</th>
                    <th className="px-3.5 py-3">مبلغ (تومان)</th>
                    <th className="px-3.5 py-3 text-center">تاییدیه audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {treasuryTransactions.slice(0, 10).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{tx.txNumber}</td>
                      <td className="px-3.5 py-3 font-bold">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md ${
                            tx.txType === 'RECEIPT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.txType === 'PAYMENT' || tx.txType === 'EXPENSE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {tx.txType === 'RECEIPT'
                            ? 'دریافت وجه'
                            : tx.txType === 'PAYMENT'
                            ? 'پرداخت وجه'
                            : tx.txType === 'EXPENSE'
                            ? 'هزینه عملیاتی'
                            : 'انتقال بین‌حسابی'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">
                        {tx.partyNameFa || tx.notesFa || 'تراکنش عمومی خزانه'}
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono text-[11px]">{tx.dateJalali}</td>
                      <td className="px-3.5 py-3 text-slate-600 font-medium">
                        {tx.paymentMethod === 'POS'
                          ? 'کارتخوان'
                          : tx.paymentMethod === 'CASH'
                          ? 'نقدی'
                          : tx.paymentMethod === 'CHEQUE'
                          ? 'چک صیادی'
                          : 'حواله پایا/ساتنا'}
                      </td>
                      <td
                        className={`px-3.5 py-3 font-extrabold font-mono ${
                          tx.txType === 'RECEIPT' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {(tx.amountIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span title="ثبت‌شده در Audit Log">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 inline-block" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: TRANSACTIONS (دریافت و پرداخت) */}
      {activeSubTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              دفتر جامع دریافت و پرداخت‌های خزانه ({treasuryTransactions.length} تراکنش)
            </h3>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو بر اساس طرف حساب، شماره یا شرح..."
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">شماره تراکنش</th>
                  <th className="px-3.5 py-3">نوع رویداد</th>
                  <th className="px-3.5 py-3">طرف حساب</th>
                  <th className="px-3.5 py-3">تاریخ</th>
                  <th className="px-3.5 py-3">روش پرداخت</th>
                  <th className="px-3.5 py-3">مبلغ (تومان)</th>
                  <th className="px-3.5 py-3">توضیحات و شرح</th>
                  <th className="px-3.5 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {treasuryTransactions
                  .filter((t) =>
                    txSearchQuery
                      ? (t.partyNameFa || '').includes(txSearchQuery) ||
                        t.txNumber.includes(txSearchQuery) ||
                        (t.notesFa || '').includes(txSearchQuery)
                      : true
                  )
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{tx.txNumber}</td>
                      <td className="px-3.5 py-3 font-bold">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md ${
                            tx.txType === 'RECEIPT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.txType === 'PAYMENT' || tx.txType === 'EXPENSE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {tx.txType === 'RECEIPT'
                            ? 'دریافت وجه'
                            : tx.txType === 'PAYMENT'
                            ? 'پرداخت وجه'
                            : tx.txType === 'EXPENSE'
                            ? 'هزینه عملیاتی'
                            : 'انتقال بین‌حسابی'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">
                        {tx.partyNameFa || 'سایر طرفین / عمومی'}
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono text-[11px]">{tx.dateJalali}</td>
                      <td className="px-3.5 py-3 text-slate-600 font-medium">
                        {tx.paymentMethod === 'POS'
                          ? 'کارتخوان'
                          : tx.paymentMethod === 'CASH'
                          ? 'نقدی'
                          : tx.paymentMethod === 'CHEQUE'
                          ? 'چک صیادی'
                          : 'حواله پایا/ساتنا'}
                      </td>
                      <td
                        className={`px-3.5 py-3 font-extrabold font-mono ${
                          tx.txType === 'RECEIPT' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {(tx.amountIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 text-[11px]">{tx.notesFa || '-'}</td>
                      <td className="px-3.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف تراکنش مالی"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CHEQUE MANAGEMENT (مدیریت چک‌ها) */}
      {activeSubTab === 'CHEQUES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              دفتر چک‌های دریافتی و پرداختی صیادی ({filteredCheques.length} فقره)
            </h3>

            {/* Filters */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setChequeFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                    chequeFilterType === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  همه چک‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setChequeFilterType('INBOUND')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                    chequeFilterType === 'INBOUND' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  دریافتی
                </button>
                <button
                  type="button"
                  onClick={() => setChequeFilterType('OUTBOUND')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                    chequeFilterType === 'OUTBOUND' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  پرداختی
                </button>
              </div>

              <select
                value={chequeFilterStatus}
                onChange={(e) => setChequeFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="IN_HAND">در نزد صندوق / صادرشده</option>
                <option value="DEPOSITED">واگذارشده به بانک</option>
                <option value="CLEARED">وصول / پاس‌شده</option>
                <option value="BOUNCED">برگشت‌خورده</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">شماره صیادی</th>
                  <th className="px-3.5 py-3">نوع چک</th>
                  <th className="px-3.5 py-3">طرف حساب / صادرکننده</th>
                  <th className="px-3.5 py-3">بانک عامل</th>
                  <th className="px-3.5 py-3">تاریخ سررسید</th>
                  <th className="px-3.5 py-3">مبلغ (تومان)</th>
                  <th className="px-3.5 py-3">وضعیت</th>
                  <th className="px-3.5 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCheques.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      هیچ چکی بر اساس فیلترهای انتخابی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredCheques.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{c.chequeNumber}</td>
                      <td className="px-3.5 py-3 font-bold">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md ${
                            c.chequeType === 'INBOUND' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.chequeType === 'INBOUND' ? 'دریافتی از مشتری' : 'پرداختی به فروشنده'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">{c.partyNameFa}</td>
                      <td className="px-3.5 py-3 text-slate-600">
                        {c.bankNameFa} {c.branchNameFa ? `(${c.branchNameFa})` : ''}
                      </td>
                      <td className="px-3.5 py-3 text-slate-900 font-mono font-bold text-[11px]">
                        {c.dueDateJalali}
                      </td>
                      <td className="px-3.5 py-3 font-extrabold text-slate-900 font-mono">
                        {(c.amountIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            c.status === 'CLEARED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'BOUNCED'
                              ? 'bg-rose-100 text-rose-800'
                              : c.status === 'DEPOSITED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status === 'CLEARED'
                            ? 'وصول / پاس شده'
                            : c.status === 'BOUNCED'
                            ? 'برگشت خورده'
                            : c.status === 'DEPOSITED'
                            ? 'واگذار به بانک'
                            : 'در نزد صندوق'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.status !== 'CLEARED' && c.status !== 'BOUNCED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateChequeStatus(c.id, 'CLEARED')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded transition-all"
                                title="ثبت وصول قطعی چک و افزایش/کاهش موجودی بانک"
                              >
                                وصول / پاس
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateChequeStatus(c.id, 'BOUNCED')}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded transition-all"
                                title="ثبت برگشت چک"
                              >
                                برگشت
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCheque(c)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف کامل چک"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: INSTALLMENTS (اقساط و سررسیدها) */}
      {activeSubTab === 'INSTALLMENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              جدول زمان‌بندی اقساط و سررسیدهای مالی ({installments.length} قسط)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">کد قسط</th>
                  <th className="px-3.5 py-3">عنوان قسط</th>
                  <th className="px-3.5 py-3">طرف حساب</th>
                  <th className="px-3.5 py-3">شماره قسط</th>
                  <th className="px-3.5 py-3">تاریخ سررسید</th>
                  <th className="px-3.5 py-3">مبلغ قسط (تومان)</th>
                  <th className="px-3.5 py-3">وضعیت</th>
                  <th className="px-3.5 py-3 text-center">تسویه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installments.map((inst) => {
                  const isOverdue = inst.status === 'PENDING' && inst.dueDateJalali < '1405/01/25';
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{inst.installmentCode}</td>
                      <td className="px-3.5 py-3 font-semibold text-slate-900">{inst.titleFa}</td>
                      <td className="px-3.5 py-3 text-slate-700 font-medium">{inst.partyNameFa}</td>
                      <td className="px-3.5 py-3 font-mono">
                        {inst.installmentNumber} از {inst.totalInstallments}
                      </td>
                      <td className="px-3.5 py-3 font-mono font-bold text-[11px]">
                        {inst.dueDateJalali}
                      </td>
                      <td className="px-3.5 py-3 font-extrabold text-slate-900 font-mono">
                        {(inst.amountIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            inst.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inst.status === 'PAID'
                            ? 'تسویه‌شده'
                            : isOverdue
                            ? 'سررسید گذشته (معوق)'
                            : 'در انتظار سررسید'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {inst.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => handlePayInstallment(inst.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition-all shadow-xs"
                          >
                            تسویه قسط
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: OPERATIONAL EXPENSES (هزینه‌ها) */}
      {activeSubTab === 'EXPENSES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                مدیریت و ثبت هزینه‌های عملیاتی و جاری کسب‌وکار ({operationalExpenses.length} ثبت)
              </h3>
              <button
                type="button"
                onClick={() => setShowNewExpenseModal(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs"
              >
                + ثبت هزینه جدید
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">کد هزینه</th>
                    <th className="px-3.5 py-3">سرفصل هزینه</th>
                    <th className="px-3.5 py-3">شرح کامل هزینه</th>
                    <th className="px-3.5 py-3">تاریخ پرداخت</th>
                    <th className="px-3.5 py-3">منبع پرداخت</th>
                    <th className="px-3.5 py-3">مبلغ (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operationalExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{exp.expenseCode}</td>
                      <td className="px-3.5 py-3 font-bold text-amber-800">{exp.categoryFa}</td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">{exp.titleFa}</td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono text-[11px]">{exp.dateJalali}</td>
                      <td className="px-3.5 py-3 text-slate-600 font-medium">{exp.sourceBankOrCash}</td>
                      <td className="px-3.5 py-3 font-extrabold text-slate-900 font-mono">
                        {(exp.amountIrr / 10).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE CASH BOX */}
      {showNewBoxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCashBox}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              تعریف صندوق نقدی / تنخواه‌گردان جدید
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                عنوان صندوق:
              </label>
              <input
                type="text"
                placeholder="مثلاً: صندوق دوم فروشگاه یا تنخواه مدیر فنی"
                value={newBoxTitle}
                onChange={(e) => setNewBoxTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                موجودی اولیه (تومان):
              </label>
              <input
                type="number"
                value={newBoxInitialBalance}
                onChange={(e) => setNewBoxInitialBalance(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
              >
                ثبت و اضافه صندوق
              </button>
              <button
                type="button"
                onClick={() => setShowNewBoxModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs rounded-lg"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: CREATE BANK ACCOUNT */}
      {showNewBankModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBankAccount}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              افتتاح و ثبت حساب بانکی جدید
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                نام بانک و شعبه:
              </label>
              <input
                type="text"
                placeholder="مثلاً: بانک تجارت - شعبه مرکزی"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                شماره حساب / کارتخوان:
              </label>
              <input
                type="text"
                placeholder="010203040506"
                value={newBankAccountNo}
                onChange={(e) => setNewBankAccountNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                شماره شبا (اختیاری):
              </label>
              <input
                type="text"
                placeholder="IR000000000000000000000000"
                value={newBankShaba}
                onChange={(e) => setNewBankShaba(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                موجودی اولیه (تومان):
              </label>
              <input
                type="number"
                value={newBankInitialBalance}
                onChange={(e) => setNewBankInitialBalance(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg"
              >
                ثبت حساب بانکی
              </button>
              <button
                type="button"
                onClick={() => setShowNewBankModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs rounded-lg"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: CREATE TREASURY TRANSACTION */}
      {showNewTxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTransaction}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              ثبت رویداد دریافت، پرداخت یا انتقال بین‌حسابی
            </h3>

            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTxType('RECEIPT')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  txType === 'RECEIPT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                دریافت وجه
              </button>
              <button
                type="button"
                onClick={() => setTxType('PAYMENT')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  txType === 'PAYMENT' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                پرداخت وجه
              </button>
              <button
                type="button"
                onClick={() => setTxType('TRANSFER')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  txType === 'TRANSFER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                انتقال بین حساب
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>طرف حساب:</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMasterPartyRole(txType === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER');
                    setQuickMasterType('PARTY');
                  }}
                  className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="افزودن سریع شخص / طرف حساب جدید"
                >
                  <Plus className="w-3 h-3" />
                  <span>شخص جدید</span>
                </button>
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={txPartyId}
                  onChange={(e) => setTxPartyId(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.partyCode}) {p.mobile ? `· ${p.mobile}` : ''}
                    </option>
                  ))}
                </select>
                <QuickAddButton
                  onClick={() => {
                    setQuickMasterPartyRole(txType === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER');
                    setQuickMasterType('PARTY');
                  }}
                  title="افزودن سریع شخص جدید"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  مبلغ (تومان):
                </label>
                <input
                  type="number"
                  value={txAmountTomans}
                  onChange={(e) => setTxAmountTomans(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-extrabold text-emerald-800"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  روش پرداخت:
                </label>
                <select
                  value={txPaymentMethod}
                  onChange={(e) => setTxPaymentMethod(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'POS' | 'CHEQUE')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="POS">کارتخوان (POS)</option>
                  <option value="CASH">نقدی</option>
                  <option value="BANK_TRANSFER">حواله پایا / ساتنا</option>
                  <option value="CHEQUE">چک صیادی</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>حساب مبدا / مقصد:</span>
                <button
                  type="button"
                  onClick={() => setQuickMasterType(txSourceAccountType === 'BANK' ? 'BANK_ACCOUNT' : 'CASH_BOX')}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="افزودن سریع حساب یا صندوق جدید"
                >
                  <Plus className="w-3 h-3" />
                  <span>{txSourceAccountType === 'BANK' ? 'بانک جدید' : 'صندوق جدید'}</span>
                </button>
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={txSourceAccountType}
                  onChange={(e) => setTxSourceAccountType(e.target.value as 'CASH' | 'BANK')}
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="BANK">حساب بانکی</option>
                  <option value="CASH">صندوق نقدی</option>
                </select>

                <select
                  value={txSourceAccountId}
                  onChange={(e) => setTxSourceAccountId(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  {txSourceAccountType === 'BANK'
                    ? bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankNameFa} (مانده: {(b.balanceIrr / 10).toLocaleString()} تومان)
                        </option>
                      ))
                    : cashBoxes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.titleFa} (مانده: {(c.balanceIrr / 10).toLocaleString()} تومان)
                        </option>
                      ))}
                </select>

                <QuickAddButton
                  onClick={() => setQuickMasterType(txSourceAccountType === 'BANK' ? 'BANK_ACCOUNT' : 'CASH_BOX')}
                  title="افزودن سریع حساب یا صندوق جدید"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                توضیحات و بابت:
              </label>
              <input
                type="text"
                placeholder="مثلاً: بابت تسویه فاکتور فروش یا واریز پیش‌پرداخت"
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
              >
                ثبت نهایی تراکنش
              </button>
              <button
                type="button"
                onClick={() => setShowNewTxModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs rounded-lg"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: CREATE CHEQUE */}
      {showNewChequeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCheque}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              ثبت چک صیادی دریافتی / پرداختی جدید
            </h3>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChequeType('INBOUND')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  chequeType === 'INBOUND' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                چک دریافتی (از مشتری)
              </button>
              <button
                type="button"
                onClick={() => setChequeType('OUTBOUND')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  chequeType === 'OUTBOUND' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                چک پرداختی (به تامین‌کننده)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  شماره ۱۶ رقمی صیادی:
                </label>
                <input
                  type="text"
                  placeholder="CHQ-1405-..."
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>طرف حساب:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickMasterPartyRole(chequeType === 'INBOUND' ? 'CUSTOMER' : 'SUPPLIER');
                      setQuickMasterType('PARTY');
                    }}
                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>شخص جدید</span>
                  </button>
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={chequePartyId}
                    onChange={(e) => setChequePartyId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.partyCode}) {p.mobile ? `· ${p.mobile}` : ''}
                      </option>
                    ))}
                  </select>
                  <QuickAddButton
                    onClick={() => {
                      setQuickMasterPartyRole(chequeType === 'INBOUND' ? 'CUSTOMER' : 'SUPPLIER');
                      setQuickMasterType('PARTY');
                    }}
                    title="افزودن سریع طرف حساب چک"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  بانک عامل:
                </label>
                <input
                  type="text"
                  value={chequeBankName}
                  onChange={(e) => setChequeBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  مبلغ چک (تومان):
                </label>
                <input
                  type="number"
                  value={chequeAmountTomans}
                  onChange={(e) => setChequeAmountTomans(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-extrabold text-indigo-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  تاریخ صدور:
                </label>
                <input
                  type="text"
                  value={chequeIssueDate}
                  onChange={(e) => setChequeIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  تاریخ سررسید:
                </label>
                <input
                  type="text"
                  value={chequeDueDate}
                  onChange={(e) => setChequeDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                توضیحات و بابت:
              </label>
              <input
                type="text"
                value={chequeNotes}
                onChange={(e) => setChequeNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg"
              >
                ثبت چک در دفتر
              </button>
              <button
                type="button"
                onClick={() => setShowNewChequeModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs rounded-lg"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: CREATE OPERATIONAL EXPENSE */}
      {showNewExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateExpense}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-600" />
              ثبت هزینه عملیاتی / جاری جدید
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                سرفصل هزینه:
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-amber-900"
              >
                <option value="اجاره">اجاره دفتر و فروشگاه</option>
                <option value="قبوض">قبوض آب، برق، گاز و اینترنت</option>
                <option value="حقوق و دستمزد">حقوق، مزایا و دستمزد پرسنل</option>
                <option value="بازاریابی">بازاریابی و تبلیغات</option>
                <option value="ملزومات">ملزومات اداری و مصرفی</option>
                <option value="سایر">سایر هزینه‌های متفرقه</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                عنوان و شرح هزینه:
              </label>
              <input
                type="text"
                placeholder="مثلاً: اجاره فروردین‌ماه دفتر مرکزی"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  مبلغ (تومان):
                </label>
                <input
                  type="number"
                  value={expenseAmountTomans}
                  onChange={(e) => setExpenseAmountTomans(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-extrabold text-amber-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  روش پرداخت:
                </label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'POS')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="CASH">نقدی از صندوق</option>
                  <option value="BANK_TRANSFER">حواله پایا / کارت به کارت</option>
                  <option value="POS">کارتخوان</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg"
              >
                ثبت هزینه و کسر از خزانه
              </button>
              <button
                type="button"
                onClick={() => setShowNewExpenseModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs rounded-lg"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUICK MASTER CREATION MODAL */}
      <QuickMasterModal
        isOpen={quickMasterType !== null}
        onClose={() => setQuickMasterType(null)}
        type={quickMasterType || 'PARTY'}
        defaultPartyRole={quickMasterPartyRole}
        onSuccess={(result) => {
          if (result.type === 'PARTY') {
            setTxPartyId(result.id);
            setChequePartyId(result.id);
          } else if (result.type === 'BANK_ACCOUNT') {
            setTxSourceAccountType('BANK');
            setTxSourceAccountId(result.id);
            setChequeBankName(result.entity?.bankNameFa || result.title);
          } else if (result.type === 'CASH_BOX') {
            setTxSourceAccountType('CASH');
            setTxSourceAccountId(result.id);
          }
          setFeedback({
            type: 'success',
            message: `«${result.title}» با موفقیت ثبت و بلافاصله انتخاب گردید.`,
          });
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
};
