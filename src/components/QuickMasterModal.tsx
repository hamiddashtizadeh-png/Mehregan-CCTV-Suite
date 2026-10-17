import React, { useState } from 'react';
import {
  X,
  Plus,
  UserPlus,
  Warehouse,
  Landmark,
  Wallet,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PartyRecord, WarehouseRecord, BankAccountRecord, CashBoxRecord } from '../types/foundation';

export type QuickMasterType = 'PARTY' | 'WAREHOUSE' | 'BANK_ACCOUNT' | 'CASH_BOX';

export interface QuickMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: QuickMasterType;
  defaultPartyRole?: 'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'OTHER';
  onSuccess: (result: { id: number; title: string; entity: any; type: QuickMasterType }) => void;
  onRefresh?: () => Promise<void> | void;
}

export function QuickMasterModal({
  isOpen,
  onClose,
  type,
  defaultPartyRole = 'CUSTOMER',
  onSuccess,
  onRefresh,
}: QuickMasterModalProps) {
  // Party state
  const [partyFullName, setPartyFullName] = useState('');
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'OTHER'>(defaultPartyRole);
  const [partyMobile, setPartyMobile] = useState('');
  const [partyNationalId, setPartyNationalId] = useState('');
  const [partyAddress, setPartyAddress] = useState('');

  // Warehouse state
  const [warehouseTitle, setWarehouseTitle] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [warehouseManager, setWarehouseManager] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');

  // Bank Account state
  const [bankName, setBankName] = useState('ملت');
  const [accountNumber, setAccountNumber] = useState('');
  const [shabaNumber, setShabaNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [bankInitialBalance, setBankInitialBalance] = useState<number>(0);

  // Cash Box state
  const [cashBoxTitle, setCashBoxTitle] = useState('');
  const [cashBoxCode, setCashBoxCode] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [cashInitialBalance, setCashInitialBalance] = useState<number>(0);

  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (type === 'PARTY') {
        if (!partyFullName.trim()) {
          throw new Error('لطفاً نام و نام‌خانوادگی / عنوان شخص را وارد نمایید.');
        }

        const res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allowDuplicates: true,
            fullName: partyFullName.trim(),
            primaryType: partyType,
            mobile: partyMobile.trim() || undefined,
            nationalId: partyNationalId.trim() || undefined,
            addressFa: partyAddress.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.messageFa || 'خطا در ثبت شخص جدید.');
        }

        const party: PartyRecord = data.party;
        if (onRefresh) await onRefresh();
        onSuccess({
          id: party.id,
          title: party.fullName,
          entity: party,
          type: 'PARTY',
        });
        onClose();
      } else if (type === 'WAREHOUSE') {
        if (!warehouseTitle.trim()) {
          throw new Error('لطفاً عنوان انبار را وارد کنید.');
        }

        const res = await fetch('/api/master/warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titleFa: warehouseTitle.trim(),
            warehouseCode: warehouseCode.trim() || undefined,
            code: warehouseCode.trim() || undefined,
            managerNameFa: warehouseManager.trim() || undefined,
            addressFa: warehouseAddress.trim() || undefined,
            locationAddressFa: warehouseAddress.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.messageFa || 'خطا در ایجاد انبار جدید.');
        }

        const wh: WarehouseRecord = data.warehouse;
        if (onRefresh) await onRefresh();
        onSuccess({
          id: wh.id,
          title: wh.titleFa,
          entity: wh,
          type: 'WAREHOUSE',
        });
        onClose();
      } else if (type === 'BANK_ACCOUNT') {
        if (!bankName.trim()) {
          throw new Error('لطفاً نام بانک را وارد فرمایید.');
        }
        if (!accountNumber.trim()) {
          throw new Error('شماره حساب یا شماره کارت الزامی است.');
        }

        const res = await fetch('/api/master/bank-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankNameFa: bankName.trim(),
            accountNumber: accountNumber.trim(),
            shabaNumber: shabaNumber.trim() || null,
            balanceIrr: Number(bankInitialBalance) || 0,
            cardHolderFa: cardHolder.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.messageFa || 'خطا در ثبت حساب بانکی جدید.');
        }

        const bank: BankAccountRecord = data.account;
        if (onRefresh) await onRefresh();
        onSuccess({
          id: bank.id,
          title: `${bank.bankNameFa} (${bank.accountNumber})`,
          entity: bank,
          type: 'BANK_ACCOUNT',
        });
        onClose();
      } else if (type === 'CASH_BOX') {
        if (!cashBoxTitle.trim()) {
          throw new Error('لطفاً عنوان صندوق را وارد نمایید.');
        }

        const res = await fetch('/api/master/cash-boxes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titleFa: cashBoxTitle.trim(),
            boxCode: cashBoxCode.trim() || undefined,
            responsiblePersonFa: cashierName.trim() || undefined,
            balanceIrr: Number(cashInitialBalance) || 0,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.messageFa || 'خطا در تعریف صندوق نقدی.');
        }

        const box: CashBoxRecord = data.cashBox;
        if (onRefresh) await onRefresh();
        onSuccess({
          id: box.id,
          title: box.titleFa,
          entity: box,
          type: 'CASH_BOX',
        });
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'خطای غیرمنتظره در ثبت اطلاعات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles = {
    PARTY: {
      header: 'افزودن سریع شخص / طرف تجاری',
      sub: 'تعریف فوری مشتری، همکار، نصاب یا تأمین‌کننده بدون خروج از فرم جاری',
      icon: <UserPlus className="w-5 h-5 text-emerald-600" />,
      color: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    },
    WAREHOUSE: {
      header: 'افزودن سریع انبار جدید',
      sub: 'تعریف فوری انبار قطعات، انبار مرکزی یا شعبه جدید',
      icon: <Warehouse className="w-5 h-5 text-blue-600" />,
      color: 'border-blue-500 bg-blue-50 text-blue-800',
    },
    BANK_ACCOUNT: {
      header: 'افزودن سریع حساب بانکی / کارتخوان',
      sub: 'ثبت فوری حساب جاری، پس‌انداز یا پوز متصل به سیستم',
      icon: <Landmark className="w-5 h-5 text-indigo-600" />,
      color: 'border-indigo-500 bg-indigo-50 text-indigo-800',
    },
    CASH_BOX: {
      header: 'افزودن سریع صندوق نقدی',
      sub: 'تعریف فوری صندوق فروشگاه، دخل نقدی یا صندوق تنخواه',
      icon: <Wallet className="w-5 h-5 text-amber-600" />,
      color: 'border-amber-500 bg-amber-50 text-amber-800',
    },
  };

  const meta = titles[type];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              {meta.icon}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{meta.header}</h3>
              <p className="text-[11px] text-slate-500">{meta.sub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ===================== PARTY FORM ===================== */}
          {type === 'PARTY' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام و نام‌خانوادگی / عنوان تجاری <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="مثال: مهندس حسینی / شرکت دیدبان نو"
                  value={partyFullName}
                  onChange={(e) => setPartyFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">نقش طرف حساب:</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  >
                    <option value="CUSTOMER">خریدار / مشتری</option>
                    <option value="SUPPLIER">تأمین‌کننده / فروشنده</option>
                    <option value="INSTALLER">نصاب / مجری پروژه</option>
                    <option value="OTHER">سایر اشخاص</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">شماره همراه:</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="09123456789"
                    value={partyMobile}
                    onChange={(e) => setPartyMobile(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-left focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">کد ملی / شناسه اقتصادی (اختیاری):</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="اختیاری"
                  value={partyNationalId}
                  onChange={(e) => setPartyNationalId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">آدرس / یادداشت:</label>
                <input
                  type="text"
                  placeholder="آدرس، شماره تماس دوم یا توضیحات..."
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ===================== WAREHOUSE FORM ===================== */}
          {type === 'WAREHOUSE' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان انبار <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="مثال: انبار قطعات دوربین / انبار شعبه ۲"
                  value={warehouseTitle}
                  onChange={(e) => setWarehouseTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">کد انبار (اختیاری):</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="خودکار یا WH-03"
                    value={warehouseCode}
                    onChange={(e) => setWarehouseCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">نام مسئول / انباردار:</label>
                  <input
                    type="text"
                    placeholder="اختیاری"
                    value={warehouseManager}
                    onChange={(e) => setWarehouseManager(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">محل فیزیکی / آدرس انبار:</label>
                <input
                  type="text"
                  placeholder="مثال: طبقه منفی یک فروشگاه مرکزی"
                  value={warehouseAddress}
                  onChange={(e) => setWarehouseAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ===================== BANK ACCOUNT FORM ===================== */}
          {type === 'BANK_ACCOUNT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام بانک <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ملت، ملی، سامان، تجارت..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره حساب یا کارت <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: 50222910..."
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">نام صاحب حساب / عنوان کارتخوان:</label>
                <input
                  type="text"
                  placeholder="مثال: فروشگاه مهرگان - حساب متصل به پوز"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">شماره شبا (اختیاری):</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="IR..."
                    value={shabaNumber}
                    onChange={(e) => setShabaNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">موجودی اولیه (تومان):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={bankInitialBalance ? bankInitialBalance / 10 : ''}
                    onChange={(e) => setBankInitialBalance(Math.max(0, Number(e.target.value) * 10))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-left focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== CASH BOX FORM ===================== */}
          {type === 'CASH_BOX' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان صندوق نقدی <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="مثال: دخل فروشگاه مرکزی / صندوق پذیرش"
                  value={cashBoxTitle}
                  onChange={(e) => setCashBoxTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">کد صندوق (اختیاری):</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="خودکار یا CB-1002"
                    value={cashBoxCode}
                    onChange={(e) => setCashBoxCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">مسئول صندوق / صندوقدار:</label>
                  <input
                    type="text"
                    placeholder="اختیاری"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">موجودی نقدی اولیه (تومان):</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={cashInitialBalance ? cashInitialBalance / 10 : ''}
                  onChange={(e) => setCashInitialBalance(Math.max(0, Number(e.target.value) * 10))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-left focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال ثبت...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>ثبت و انتخاب فوری</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * QuickAddButton: A small plus button placed alongside dropdowns.
 */
export function QuickAddButton({
  onClick,
  title,
  className = '',
}: {
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-200 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs ${className}`}
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  );
}
