import React, { useState } from 'react';
import {
  FoundationDataResponse,
  PurchaseInvoiceRecord,
  PurchaseProformaRecord,
  PurchasePaymentRecord,
  PurchaseReturnRecord,
  ForeignCurrencyCode,
  CostAllocationMethod,
  PurchasePaymentMethod,
} from '../types/foundation';
import {
  ShoppingBag,
  FileText,
  DollarSign,
  Truck,
  RotateCcw,
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Barcode,
  Tag,
  CreditCard,
  X,
  Info,
  Printer,
  Download,
  Monitor,
  Trash2,
} from 'lucide-react';
import { printHtmlContent, downloadInvoiceHtml } from '../utils/printUtils';
import { QuickMasterModal, QuickAddButton, QuickMasterType } from './QuickMasterModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PurchasesManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => void;
}

type TabType = 'INVOICES' | 'PROFORMAS' | 'LANDED_COST_ENGINE' | 'CREATE_INVOICE' | 'PAYMENTS_DEBT' | 'RETURNS';

export function PurchasesManagementView({ foundationData, onRefresh }: PurchasesManagementViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('INVOICES');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Selected Records
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<PurchaseInvoiceRecord | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<PurchaseInvoiceRecord | null>(null);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);
  const [quickMasterType, setQuickMasterType] = useState<QuickMasterType | null>(null);
  const [quickMasterRole, setQuickMasterRole] = useState<'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'OTHER'>('SUPPLIER');

  // Notifications / Alert State
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoiceRecord | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State for Payment
  const [payAmountIrr, setPayAmountIrr] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PurchasePaymentMethod>('SATNA_PAYA');
  const [paySourceBank, setPaySourceBank] = useState('بانک ملت - حساب جاری مرکزی مهرگان');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Form State for Create Invoice
  const [formSupplierId, setFormSupplierId] = useState<number>(
    foundationData.parties?.find((p) => p.primaryType === 'SUPPLIER' || p.roles?.includes('SUPPLIER'))?.id || 0
  );
  const [formWarehouseId, setFormWarehouseId] = useState<number>(
    foundationData.warehouses?.find((w) => w.isDefault)?.id || foundationData.warehouses?.[0]?.id || 1
  );
  const [formCurrency, setFormCurrency] = useState<ForeignCurrencyCode>('IRR');
  const [formExchangeRate, setFormExchangeRate] = useState<number>(1);
  const [formAllocationMethod, setFormAllocationMethod] = useState<CostAllocationMethod>('BY_VALUE');
  const [formSupplierInvNum, setFormSupplierInvNum] = useState('');
  const [formDateJalali, setFormDateJalali] = useState('1405/01/25');
  const [formDueDateJalali, setFormDueDateJalali] = useState('1405/02/25');
  const [formNotes, setFormNotes] = useState('');

  // Landed costs inputs
  const [landedFreight, setLandedFreight] = useState<number>(0);
  const [landedInsurance, setLandedInsurance] = useState<number>(0);
  const [landedPackaging, setLandedPackaging] = useState<number>(0);
  const [landedCustoms, setLandedCustoms] = useState<number>(0);
  const [landedNonRefundableTax, setLandedNonRefundableTax] = useState<number>(0);
  const [landedOther, setLandedOther] = useState<number>(0);

  // Lines for New Invoice
  const [invoiceLines, setInvoiceLines] = useState<
    Array<{
      itemId: number;
      quantity: number;
      unitPriceForeign: number;
      discountIrr: number;
      vatAmountIrr: number;
      serialNumbersText: string;
      macAddressesText: string;
      notesFa: string;
    }>
  >([
    {
      itemId: foundationData.items?.[0]?.id || 1,
      quantity: 5,
      unitPriceForeign: 42000000,
      discountIrr: 0,
      vatAmountIrr: 0,
      serialNumbersText: 'SN-TEST-NEW-01, SN-TEST-NEW-02, SN-TEST-NEW-03, SN-TEST-NEW-04, SN-TEST-NEW-05',
      macAddressesText: '',
      notesFa: 'ردیفت اول خرید دوربین',
    },
  ]);

  // Landed Cost Engine Interactive Calculator State
  const [calcMethod, setCalcMethod] = useState<CostAllocationMethod>('BY_VALUE');
  const [calcFreight, setCalcFreight] = useState<number>(15000000);
  const [calcInsurance, setCalcInsurance] = useState<number>(5000000);
  const [calcCustoms, setCalcCustoms] = useState<number>(35000000);
  const [calcTax, setCalcTax] = useState<number>(15000000);
  const [calcLines, setCalcLines] = useState<
    Array<{ itemId: number; quantity: number; unitPriceIrr: number }>
  >([
    { itemId: 1, quantity: 10, unitPriceIrr: 40000000 },
    { itemId: 3, quantity: 4, unitPriceIrr: 120000000 },
  ]);

  // Derived Lists
  const invoices = foundationData.purchaseInvoices || [];
  const proformas = foundationData.purchaseProformas || [];
  const payments = foundationData.purchasePayments || [];
  const returns = foundationData.purchaseReturns || [];
  const suppliers =
    foundationData.parties?.filter(
      (p) => p.primaryType === 'SUPPLIER' || (p.roles && p.roles.includes('SUPPLIER'))
    ) || [];

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.supplierTitleFa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.supplierInvoiceNumber && inv.supplierInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Total Metrics
  const totalPurchasesIrr = invoices.reduce((acc, i) => acc + i.totalInvoicePayableToSupplierIrr, 0);
  const totalRemainingDebtIrr = invoices.reduce((acc, i) => acc + i.remainingDebtIrr, 0);
  const totalLandedCostsAllocatedIrr = invoices.reduce(
    (acc, i) => acc + i.landedCosts.totalLandedCostsIrr,
    0
  );
  const totalPaidIrr = payments.reduce((acc, p) => acc + p.amountIrr, 0);

  // Handle Add Item Line in Form
  const handleAddLine = () => {
    const firstItem = foundationData.items?.[0];
    setInvoiceLines([
      ...invoiceLines,
      {
        itemId: firstItem?.id || 1,
        quantity: 1,
        unitPriceForeign: firstItem?.purchasePriceIrr || 10000000,
        discountIrr: 0,
        vatAmountIrr: 0,
        serialNumbersText: '',
        macAddressesText: '',
        notesFa: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (invoiceLines.length === 1) return;
    setInvoiceLines(invoiceLines.filter((_, i) => i !== index));
  };

  // Submit New Purchase Invoice
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSubmitting(true);

    try {
      const formattedLines = invoiceLines.map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        unitPriceForeign: Number(l.unitPriceForeign),
        discountIrr: Number(l.discountIrr) || 0,
        vatAmountIrr: Number(l.vatAmountIrr) || 0,
        serialNumbers: l.serialNumbersText
          ? l.serialNumbersText
              .split(/[\n,]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        macAddresses: l.macAddressesText
          ? l.macAddressesText
              .split(/[\n,]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        notesFa: l.notesFa,
      }));

      const payload = {
        supplierInvoiceNumber: formSupplierInvNum || undefined,
        supplierId: formSupplierId,
        targetWarehouseId: formWarehouseId,
        dateJalali: formDateJalali,
        dueDateJalali: formDueDateJalali,
        currency: formCurrency,
        exchangeRateToIrr: formExchangeRate,
        costAllocationMethod: formAllocationMethod,
        landedCosts: {
          freightCostIrr: landedFreight,
          insuranceCostIrr: landedInsurance,
          packagingCostIrr: landedPackaging,
          customsCostIrr: landedCustoms,
          nonRefundableTaxIrr: landedNonRefundableTax,
          otherLandedCostIrr: landedOther,
        },
        lines: formattedLines,
        notesFa: formNotes,
      };

      const res = await fetch('/api/purchases/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.messageFa || 'خطا در ثبت فاکتور خرید.');
      }

      setActionSuccess(
        `فاکتور خرید [${data.invoice.invoiceNumber}] و رسید انبار [${data.invoice.inventoryDocNumber}] با بهای تمام‌شده مستند ثبت گردید.`
      );
      onRefresh();
      setActiveTab('INVOICES');
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = (invoice: PurchaseInvoiceRecord) => {
    setDeleteError(null);
    setInvoiceToDelete(invoice);
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/purchases/invoices/${invoiceToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setActionSuccess(data.messageFa || `فاکتور خرید ${invoiceToDelete.invoiceNumber} با موفقیت حذف گردید.`);
        setInvoiceToDelete(null);
        setDeleteError(null);
        onRefresh();
      } else {
        const msg = data.messageFa || 'خطا در حذف فاکتور خرید.';
        setDeleteError(msg);
        setActionError(msg);
      }
    } catch {
      const msg = 'خطا در برقراری ارتباط با سرور هنگام حذف فاکتور خرید.';
      setDeleteError(msg);
      setActionError(msg);
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setActionError(null);
    setActionSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/purchases/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: paymentInvoice.supplierId,
          purchaseInvoiceId: paymentInvoice.id,
          paymentDateJalali: '1405/01/28',
          amountIrr: payAmountIrr,
          paymentMethod: payMethod,
          sourceAccountOrBank: paySourceBank,
          trackingReference: payRef,
          notesFa: payNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.messageFa || 'خطا در ثبت پرداخت.');
      }

      setActionSuccess(data.messageFa);
      setIsPaymentModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                ماژول جامع خرید، ارز، بهای تمام‌شده و بدهی تأمین‌کنندگان (مرحله ۵)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                مدیریت پیش‌فاکتور ارزی، فاکتور خرید قطعی، تخصیص هزینه‌های سربار (Landed Cost)، تسویه بدهی و مرجوعی کالا
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('CREATE_INVOICE')}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>ثبت فاکتور خرید جدید</span>
            </button>
          </div>
        </div>

        {/* Global KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-600" />
              <span>کل خریدهای دوره (ارزش پایه)</span>
            </div>
            <div className="mt-2 text-base font-extrabold text-slate-900 font-mono">
              {totalPurchasesIrr.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">ریال</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-600 font-mono">
              {(totalPurchasesIrr / 10).toLocaleString()} تومان
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="text-[11px] font-medium text-amber-800 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>مانده کل بدهی به تأمین‌کنندگان</span>
            </div>
            <div className="mt-2 text-base font-extrabold text-amber-950 font-mono">
              {totalRemainingDebtIrr.toLocaleString()}{' '}
              <span className="text-xs font-normal text-amber-800">ریال</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-800 font-mono">
              بستانکاری تأمین‌کننده در سیستم
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="text-[11px] font-medium text-indigo-800 flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-indigo-600" />
              <span>هزینه‌های سربار تخصیص‌یافته</span>
            </div>
            <div className="mt-2 text-base font-extrabold text-indigo-950 font-mono">
              {totalLandedCostsAllocatedIrr.toLocaleString()}{' '}
              <span className="text-xs font-normal text-indigo-800">ریال</span>
            </div>
            <div className="mt-1 text-[11px] text-indigo-800">
              حمل، بیمه، بسته‌بندی، گمرک و مالیات
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="text-[11px] font-medium text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>مجموع پرداختی‌های ثبت‌شده</span>
            </div>
            <div className="mt-2 text-base font-extrabold text-emerald-950 font-mono">
              {totalPaidIrr.toLocaleString()}{' '}
              <span className="text-xs font-normal text-emerald-800">ریال</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-800 font-mono">
              تسویه از طریق حواله/ساتنا/چک
            </div>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-xs overflow-x-auto gap-1">
        {[
          { key: 'INVOICES', label: 'فاکتورهای خرید', icon: FileText, count: invoices.length },
          { key: 'PROFORMAS', label: 'پیش‌فاکتورها و سفارشات', icon: ShoppingBag, count: proformas.length },
          { key: 'LANDED_COST_ENGINE', label: 'موتور تخصیص بهای تمام‌شده', icon: Calculator },
          { key: 'CREATE_INVOICE', label: 'ثبت فاکتور خرید جدید', icon: Plus },
          { key: 'PAYMENTS_DEBT', label: 'دفتر پرداخت و بدهی تأمین‌کنندگان', icon: CreditCard, count: suppliers.length },
          { key: 'RETURNS', label: 'برگشت از خرید', icon: RotateCcw, count: returns.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PURCHASE INVOICES LIST */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس شماره فاکتور، شماره فاکتور فروشنده یا نام تأمین‌کننده..."
                className="w-full rounded-lg border border-slate-300 pr-9 pl-4 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">فیلتر وضعیت:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="CONFIRMED">تاییدشده (پرداخت‌نشده)</option>
                <option value="PARTIALLY_PAID">پرداخت جزئی</option>
                <option value="PAID">تسویه‌شده کامل</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">شماره فاکتور</th>
                    <th className="px-4 py-3">تأمین‌کننده</th>
                    <th className="px-4 py-3">انبار مقصد</th>
                    <th className="px-4 py-3">تاریخ / سررسید</th>
                    <th className="px-4 py-3">ارز / نرخ</th>
                    <th className="px-4 py-3">ارزش پایه اقلام</th>
                    <th className="px-4 py-3">هزینه سربار</th>
                    <th className="px-4 py-3">مانده بدهی</th>
                    <th className="px-4 py-3 text-center">وضعیت</th>
                    <th className="px-4 py-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        هیچ فاکتور خریدی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700 dir-ltr text-right">
                          {inv.invoiceNumber}
                          {inv.supplierInvoiceNumber && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              فروشنده: {inv.supplierInvoiceNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {inv.supplierTitleFa}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {inv.targetWarehouseTitleFa}
                          {inv.inventoryDocNumber && (
                            <span className="block text-[10px] font-mono text-emerald-700">
                              رسید: {inv.inventoryDocNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          <div>{inv.dateJalali}</div>
                          <div className="text-[10px] text-slate-500">تا: {inv.dueDateJalali}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">
                            {inv.currency}
                          </span>
                          {inv.currency !== 'IRR' && (
                            <span className="block text-[10px] text-slate-500">
                              نرخ: {inv.exchangeRateToIrr.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                          {inv.subtotalNetItemsIrr.toLocaleString()} ریال
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                          +{inv.landedCosts.totalLandedCostsIrr.toLocaleString()} ریال
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-800">
                          {inv.remainingDebtIrr.toLocaleString()} ریال
                        </td>
                        <td className="px-4 py-3 text-center">
                          {inv.status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              تسویه شده
                            </span>
                          )}
                          {inv.status === 'PARTIALLY_PAID' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                              <Clock className="h-3 w-3" />
                              پرداخت جزئی
                            </span>
                          )}
                          {inv.status === 'CONFIRMED' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800">
                              تاییدشده
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                            >
                              جزئیات
                            </button>

                            {inv.remainingDebtIrr > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentInvoice(inv);
                                  setPayAmountIrr(inv.remainingDebtIrr);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                              >
                                ثبت پرداخت
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(inv)}
                              className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف فاکتور خرید"
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
        </div>
      )}

      {/* TAB 2: PROFORMAS */}
      {activeTab === 'PROFORMAS' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              <span>پیش‌فاکتورها و سفارشات خرید ارزی (Purchase Orders & Proformas)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">شماره سفارش</th>
                    <th className="px-4 py-3">تأمین‌کننده</th>
                    <th className="px-4 py-3">تاریخ / اعتبار</th>
                    <th className="px-4 py-3">ارز / نرخ تبدیل</th>
                    <th className="px-4 py-3">مبلغ کل (ریال)</th>
                    <th className="px-4 py-3 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proformas.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dir-ltr text-right">
                        {p.proformaNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.supplierTitleFa}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {p.dateJalali} تا {p.validUntilJalali}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">{p.currency}</span> @{' '}
                        {p.exchangeRateToIrr.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {p.subtotalIrr.toLocaleString()} ریال
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === 'CONVERTED' ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                            تبدیل‌شده به فاکتور
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800">
                            تاییدشده
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LANDED COST ALLOCATION CALCULATOR ENGINE */}
      {activeTab === 'LANDED_COST_ENGINE' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <Calculator className="h-5 w-5 text-indigo-600" />
              <span>موتور محاسباتی بهای تمام‌شده و تخصیص هزینه‌های سربار (Landed Cost Engine)</span>
            </div>
            <p className="text-xs text-indigo-950 leading-relaxed">
              هزینه‌های سربار خرید شامل **حمل و نقل، بیمه، بسته‌بندی، حقوق گمرکی و مالیات غیرقابل استرداد** طبق دو روش رسمی **«بر اساس ارزش ریالی اقلام (BY_VALUE)»** یا **«بر اساس تعداد/تراژ کالا (BY_QUANTITY)»** به بهای پایه خرید اضافه می‌شوند. برای کالاهای سریال‌دار، این عدد مستقیماً روی شناسه واحد سریال (`unitCostIrr`) درج می‌گردد.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Input Controls */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                ۱. تنظیم هزینه‌های سربار محموله
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">روش تخصیص هزینه سربار:</label>
                  <select
                    value={calcMethod}
                    onChange={(e) => setCalcMethod(e.target.value as CostAllocationMethod)}
                    className="w-full rounded-lg border border-slate-300 p-2 font-bold text-slate-800"
                  >
                    <option value="BY_VALUE">بر اساس ارزش ریالی اقلام (BY_VALUE)</option>
                    <option value="BY_QUANTITY">بر اساس تعداد کالاها (BY_QUANTITY)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">هزینه حمل بار (ریال):</label>
                  <input
                    type="number"
                    value={calcFreight}
                    onChange={(e) => setCalcFreight(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">بیمه محموله (ریال):</label>
                  <input
                    type="number"
                    value={calcInsurance}
                    onChange={(e) => setCalcInsurance(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">حقوق و عوارض گمرک (ریال):</label>
                  <input
                    type="number"
                    value={calcCustoms}
                    onChange={(e) => setCalcCustoms(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مالیات غیرقابل استرداد (ریال):</label>
                  <input
                    type="number"
                    value={calcTax}
                    onChange={(e) => setCalcTax(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Live Result Table */}
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>۲. خروجی تفکیکی بهای تمام‌شده نهایی هر واحد</span>
                <span className="font-mono text-indigo-700">
                  مجموع سربار: {(calcFreight + calcInsurance + calcCustoms + calcTax).toLocaleString()} ریال
                </span>
              </h4>

              {(() => {
                const totalExtra = calcFreight + calcInsurance + calcCustoms + calcTax;
                const totalBaseNet = calcLines.reduce((acc, l) => acc + l.quantity * l.unitPriceIrr, 0);
                const totalQty = calcLines.reduce((acc, l) => acc + l.quantity, 0);

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th className="px-3 py-2">کالا</th>
                          <th className="px-3 py-2 text-center">تعداد</th>
                          <th className="px-3 py-2">قیمت پایه (ریال)</th>
                          <th className="px-3 py-2">سهم سربار هر واحد</th>
                          <th className="px-3 py-2">بهای تمام‌شده نهایی واحد</th>
                          <th className="px-3 py-2">جمع کل ردیف (انبار)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {calcLines.map((line, idx) => {
                          const item = foundationData.items?.find((i) => i.id === line.itemId);
                          const lineNet = line.quantity * line.unitPriceIrr;
                          let extraPerUnit = 0;
                          if (calcMethod === 'BY_VALUE' && totalBaseNet > 0) {
                            const share = lineNet / totalBaseNet;
                            extraPerUnit = Math.round((totalExtra * share) / line.quantity);
                          } else if (calcMethod === 'BY_QUANTITY' && totalQty > 0) {
                            extraPerUnit = Math.round(totalExtra / totalQty);
                          }
                          const finalUnitCost = line.unitPriceIrr + extraPerUnit;
                          const totalLineValuation = line.quantity * finalUnitCost;

                          return (
                            <tr key={idx}>
                              <td className="px-3 py-2.5 font-sans font-semibold text-slate-900">
                                {item?.titleFa || `کالا ${line.itemId}`}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold">{line.quantity}</td>
                              <td className="px-3 py-2.5 text-slate-700">{line.unitPriceIrr.toLocaleString()}</td>
                              <td className="px-3 py-2.5 font-bold text-indigo-700">
                                +{extraPerUnit.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 font-extrabold text-blue-900 bg-blue-50/50">
                                {finalUnitCost.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                {totalLineValuation.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CREATE PURCHASE INVOICE FORM */}
      {activeTab === 'CREATE_INVOICE' && (
        <form onSubmit={handleSubmitInvoice} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              <span>ثبت فاکتور قطعی خرید و صدور خودکار رسید انبار</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Transactional Accounting & Inventory Sync
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>انتخاب تأمین‌کننده (فروشنده):</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMasterRole('SUPPLIER');
                    setQuickMasterType('PARTY');
                  }}
                  className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="افزودن سریع تأمین‌کننده جدید"
                >
                  <Plus className="w-3 h-3" />
                  <span>تأمین‌کننده جدید</span>
                </button>
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-slate-300 p-2 font-semibold text-slate-800"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.partyCode}) {s.mobile ? `· ${s.mobile}` : ''}
                    </option>
                  ))}
                </select>
                <QuickAddButton
                  onClick={() => {
                    setQuickMasterRole('SUPPLIER');
                    setQuickMasterType('PARTY');
                  }}
                  title="افزودن سریع تأمین‌کننده جدید"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>انبار مقصد جهت ورود کالا:</span>
                <button
                  type="button"
                  onClick={() => setQuickMasterType('WAREHOUSE')}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="افزودن سریع انبار جدید"
                >
                  <Plus className="w-3 h-3" />
                  <span>انبار جدید</span>
                </button>
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={formWarehouseId}
                  onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-slate-300 p-2 font-semibold text-slate-800"
                  required
                >
                  {foundationData.warehouses?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.titleFa} ({w.warehouseCode})
                    </option>
                  ))}
                </select>
                <QuickAddButton
                  onClick={() => setQuickMasterType('WAREHOUSE')}
                  title="افزودن سریع انبار جدید"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">شماره فاکتور فروشنده:</label>
              <input
                type="text"
                value={formSupplierInvNum}
                onChange={(e) => setFormSupplierInvNum(e.target.value)}
                placeholder="مثلاً INV-PARS-9912"
                className="w-full rounded-lg border border-slate-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ارز فاکتور:</label>
              <select
                value={formCurrency}
                onChange={(e) => {
                  const curr = e.target.value as ForeignCurrencyCode;
                  setFormCurrency(curr);
                  if (curr === 'USD') setFormExchangeRate(920000);
                  else if (curr === 'AED') setFormExchangeRate(250000);
                  else if (curr === 'EUR') setFormExchangeRate(1000000);
                  else setFormExchangeRate(1);
                }}
                className="w-full rounded-lg border border-slate-300 p-2 font-bold text-slate-800"
              >
                <option value="IRR">ریال ایران (IRR)</option>
                <option value="AED">درهم امارات (AED)</option>
                <option value="USD">دلار آمریکا (USD)</option>
                <option value="EUR">یورو (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">نرخ تبدیل به ریال:</label>
              <input
                type="number"
                value={formExchangeRate}
                onChange={(e) => setFormExchangeRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">روش تخصیص سربار:</label>
              <select
                value={formAllocationMethod}
                onChange={(e) => setFormAllocationMethod(e.target.value as CostAllocationMethod)}
                className="w-full rounded-lg border border-slate-300 p-2 font-semibold text-slate-800"
              >
                <option value="BY_VALUE">بر اساس ارزش ریالی اقلام (BY_VALUE)</option>
                <option value="BY_QUANTITY">بر اساس تعداد کالاها (BY_QUANTITY)</option>
              </select>
            </div>
          </div>

          {/* Add-on Landed Costs Inputs */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" />
              <span>هزینه‌های سربار و بهای تمام‌شده خرید (Landed Costs)</span>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">حمل و نقل (ریال):</label>
                <input
                  type="number"
                  value={landedFreight}
                  onChange={(e) => setLandedFreight(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">بیمه محموله (ریال):</label>
                <input
                  type="number"
                  value={landedInsurance}
                  onChange={(e) => setLandedInsurance(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">بسته‌بندی (ریال):</label>
                <input
                  type="number"
                  value={landedPackaging}
                  onChange={(e) => setLandedPackaging(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">گمرک و عوارض (ریال):</label>
                <input
                  type="number"
                  value={landedCustoms}
                  onChange={(e) => setLandedCustoms(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">مالیات غیرقابل‌استرداد:</label>
                <input
                  type="number"
                  value={landedNonRefundableTax}
                  onChange={(e) => setLandedNonRefundableTax(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">سایر هزینه‌ها (ریال):</label>
                <input
                  type="number"
                  value={landedOther}
                  onChange={(e) => setLandedOther(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Item Lines Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-slate-900">اقلام فاکتور خرید و شماره‌های سریال</h4>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>افزودن ردیف کالا</span>
              </button>
            </div>

            {invoiceLines.map((line, idx) => {
              const selectedItem = foundationData.items?.find((i) => i.id === line.itemId);
              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700">ردیف {idx + 1}</span>
                    {invoiceLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-red-600 hover:text-red-800 text-[11px] font-bold"
                      >
                        حذف ردیف
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">کالا:</label>
                      <select
                        value={line.itemId}
                        onChange={(e) => {
                          const newLines = [...invoiceLines];
                          newLines[idx].itemId = Number(e.target.value);
                          setInvoiceLines(newLines);
                        }}
                        className="w-full rounded-lg border border-slate-300 p-2 font-semibold text-slate-800 bg-white"
                      >
                        {foundationData.items?.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.titleFa} ({item.itemCode}) {item.isSerialized ? '[سریال‌دار]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">تعداد:</label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => {
                          const newLines = [...invoiceLines];
                          newLines[idx].quantity = Number(e.target.value);
                          setInvoiceLines(newLines);
                        }}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        قیمت واحد ({formCurrency}):
                      </label>
                      <input
                        type="number"
                        value={line.unitPriceForeign}
                        onChange={(e) => {
                          const newLines = [...invoiceLines];
                          newLines[idx].unitPriceForeign = Number(e.target.value);
                          setInvoiceLines(newLines);
                        }}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold bg-white"
                      />
                    </div>
                  </div>

                  {selectedItem?.isSerialized && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-1">
                      <label className="block font-bold text-amber-900 text-[11px]">
                        شماره‌های سریال این کالا (دقیقاً {line.quantity} عدد با کاما یا خط جدید جدا شوند):
                      </label>
                      <textarea
                        rows={2}
                        value={line.serialNumbersText}
                        onChange={(e) => {
                          const newLines = [...invoiceLines];
                          newLines[idx].serialNumbersText = e.target.value;
                          setInvoiceLines(newLines);
                        }}
                        placeholder="SN-DH-1001, SN-DH-1002, ..."
                        className="w-full rounded border border-amber-300 p-2 font-mono text-xs bg-white dir-ltr text-left"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? 'در حال ثبت...' : 'ثبت قطعی فاکتور خرید و صدور رسید انبار'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: PAYMENTS & SUPPLIER DEBT LEDGER */}
      {activeTab === 'PAYMENTS_DEBT' && (
        <div className="space-y-6">
          {/* Supplier Balances Summary Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>دفتر حساب و وضعیت بدهی به تأمین‌کنندگان (بستانکاری فروشندگان)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">کد / نام تأمین‌کننده</th>
                    <th className="px-4 py-3">تلفن و شهر</th>
                    <th className="px-4 py-3">جمع کل خریدهای ثبت‌شده</th>
                    <th className="px-4 py-3">جمع کل پرداختی‌ها</th>
                    <th className="px-4 py-3">مانده صافی حساب (بدهی ما)</th>
                    <th className="px-4 py-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {suppliers.map((s) => {
                    const netBalance = s.transactionsSummary?.netBalanceIrr || 0;
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-sans font-bold text-slate-900">
                          {s.fullName} ({s.partyCode})
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-600">
                          {s.city} · {s.mobile}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">
                          {(s.transactionsSummary?.totalPurchasesIrr || 0).toLocaleString()} ریال
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">
                          {(s.transactionsSummary?.totalPaymentsIrr || 0).toLocaleString()} ریال
                        </td>
                        <td className="px-4 py-3 font-extrabold text-amber-800">
                          {netBalance.toLocaleString()} ریال
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const inv = invoices.find(
                                (i) => i.supplierId === s.id && i.remainingDebtIrr > 0
                              );
                              if (inv) {
                                setPaymentInvoice(inv);
                                setPayAmountIrr(inv.remainingDebtIrr);
                              } else {
                                setPaymentInvoice(null);
                                setPayAmountIrr(netBalance > 0 ? netBalance : 10000000);
                              }
                              setIsPaymentModalOpen(true);
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            پرداخت وجه
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Records History */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>تاریخچه پرداخت‌های ثبت‌شده به تأمین‌کنندگان</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">شماره رسید پرداخت</th>
                    <th className="px-4 py-3">تأمین‌کننده</th>
                    <th className="px-4 py-3">فاکتور مربوطه</th>
                    <th className="px-4 py-3">تاریخ</th>
                    <th className="px-4 py-3">روش و حساب مبدا</th>
                    <th className="px-4 py-3">شماره پیگیری</th>
                    <th className="px-4 py-3">مبلغ (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-bold text-emerald-700">{p.paymentNumber}</td>
                      <td className="px-4 py-3 font-sans font-semibold text-slate-900">
                        {p.supplierTitleFa}
                      </td>
                      <td className="px-4 py-3 text-blue-700 font-bold">
                        {p.invoiceNumber || 'پرداخت علی‌الحساب'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.paymentDateJalali}</td>
                      <td className="px-4 py-3 font-sans text-slate-700">
                        {p.paymentMethod} · {p.sourceAccountOrBank}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{p.trackingReference}</td>
                      <td className="px-4 py-3 font-extrabold text-emerald-800">
                        {p.amountIrr.toLocaleString()} ریال
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RETURNS */}
      {activeTab === 'RETURNS' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-600" />
              <span>اسناد برگشت از خرید به تأمین‌کنندگان (Purchase Returns)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">شماره برگشتی</th>
                    <th className="px-4 py-3">عطف به فاکتور خرید</th>
                    <th className="px-4 py-3">تأمین‌کننده</th>
                    <th className="px-4 py-3">انبار خروج</th>
                    <th className="px-4 py-3">تاریخ</th>
                    <th className="px-4 py-3">مبلغ بستانکاری (ریال)</th>
                    <th className="px-4 py-3">رسید انبار خروج</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans">
                        هیچ سند برگشت از خریدی تاکنون ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    returns.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-bold text-red-700">{r.returnNumber}</td>
                        <td className="px-4 py-3 font-bold text-blue-700">{r.invoiceNumber}</td>
                        <td className="px-4 py-3 font-sans font-semibold text-slate-900">
                          {r.supplierTitleFa}
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-700">
                          {r.sourceWarehouseTitleFa}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.dateJalali}</td>
                        <td className="px-4 py-3 font-extrabold text-red-800">
                          {r.totalReturnCreditIrr.toLocaleString()} ریال
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-bold">{r.inventoryDocNumber}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: INVOICE DETAIL VIEW */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  جزئیات فاکتور قطعی خرید [{selectedInvoice.invoiceNumber}]
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl font-mono">
              <div>
                <span className="text-slate-500 font-sans block">تأمین‌کننده:</span>
                <span className="font-bold text-slate-900 font-sans">
                  {selectedInvoice.supplierTitleFa}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">انبار ورود:</span>
                <span className="font-bold text-slate-900 font-sans">
                  {selectedInvoice.targetWarehouseTitleFa}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">ارز و نرخ:</span>
                <span className="font-bold text-slate-900">
                  {selectedInvoice.currency} @ {selectedInvoice.exchangeRateToIrr.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">رسید انبار صادرشده:</span>
                <span className="font-bold text-emerald-700">
                  {selectedInvoice.inventoryDocNumber}
                </span>
              </div>
            </div>

            {/* Landed cost summary breakdown */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-1">
              <span className="font-bold text-indigo-900 block">
                تفکیک هزینه‌های سربار بهای تمام‌شده (Landed Costs):
              </span>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 font-mono text-[11px]">
                <div>حمل: {selectedInvoice.landedCosts.freightCostIrr.toLocaleString()}</div>
                <div>بیمه: {selectedInvoice.landedCosts.insuranceCostIrr.toLocaleString()}</div>
                <div>گمرک: {selectedInvoice.landedCosts.customsCostIrr.toLocaleString()}</div>
                <div>مالیات: {selectedInvoice.landedCosts.nonRefundableTaxIrr.toLocaleString()}</div>
                <div>بسته‌بندی: {selectedInvoice.landedCosts.packagingCostIrr.toLocaleString()}</div>
                <div className="font-bold text-indigo-900">
                  جمع: {selectedInvoice.landedCosts.totalLandedCostsIrr.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Lines table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2">کالا</th>
                    <th className="px-3 py-2 text-center">تعداد</th>
                    <th className="px-3 py-2">قیمت پایه (ریال)</th>
                    <th className="px-3 py-2">سهم سربار واحد</th>
                    <th className="px-3 py-2">بهای تمام‌شده واحد</th>
                    <th className="px-3 py-2">شماره‌های سریال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {selectedInvoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-2 font-sans font-semibold text-slate-900">
                        {line.itemTitleFa} ({line.itemCode})
                      </td>
                      <td className="px-3 py-2 text-center font-bold">{line.quantity}</td>
                      <td className="px-3 py-2 text-slate-700">{line.unitPriceIrr.toLocaleString()}</td>
                      <td className="px-3 py-2 text-indigo-700 font-bold">
                        +{line.allocatedLandedCostPerUnitIrr.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-extrabold text-blue-900 bg-blue-50/50">
                        {line.finalLandedCostPerUnitIrr.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        {line.serialNumbers?.join(', ') || 'بدون سریال'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-900"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER PAYMENT */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleSubmitPayment}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <span>ثبت پرداخت وجه و تسویه بدهی تأمین‌کننده</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {paymentInvoice && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-1 font-mono">
                <span className="font-bold font-sans text-blue-900 block">
                  عطف به فاکتور خرید: {paymentInvoice.invoiceNumber}
                </span>
                <span className="block text-slate-700 font-sans">
                  تأمین‌کننده: {paymentInvoice.supplierTitleFa}
                </span>
                <span className="block text-amber-800 font-bold">
                  مانده بدهی این فاکتور: {paymentInvoice.remainingDebtIrr.toLocaleString()} ریال
                </span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">مبلغ پرداختی (ریال):</label>
                <input
                  type="number"
                  value={payAmountIrr}
                  onChange={(e) => setPayAmountIrr(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">روش پرداخت:</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PurchasePaymentMethod)}
                  className="w-full rounded-lg border border-slate-300 p-2 font-semibold text-slate-800"
                >
                  <option value="SATNA_PAYA">حواله ساتنا / پایا</option>
                  <option value="BANK_TRANSFER">حواله کارت به کارت / حساب</option>
                  <option value="CHEQUE">چک صیادی بانکی</option>
                  <option value="POS">کارتخوان / پوز</option>
                  <option value="CASH">نقد و صندوق</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>بانک / حساب مبدا پرداخت:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickMasterType('BANK_ACCOUNT')}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      + بانک
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setQuickMasterType('CASH_BOX')}
                      className="text-[10px] text-amber-600 hover:text-amber-800 font-bold"
                    >
                      + صندوق
                    </button>
                  </div>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    list="purchase-pay-source-list"
                    value={paySourceBank}
                    onChange={(e) => setPaySourceBank(e.target.value)}
                    placeholder="انتخاب یا تایپ نام بانک یا صندوق..."
                    className="flex-1 rounded-lg border border-slate-300 p-2 text-xs"
                    required
                  />
                  <datalist id="purchase-pay-source-list">
                    {(foundationData.bankAccounts || []).map((b) => (
                      <option key={b.id} value={`${b.bankNameFa} (${b.accountNumber})`} />
                    ))}
                    {(foundationData.cashBoxes || []).map((c) => (
                      <option key={c.id} value={`صندوق ${c.titleFa} (${c.boxCode})`} />
                    ))}
                  </datalist>
                  <QuickAddButton
                    onClick={() => setQuickMasterType(payMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                    title="افزودن حساب بانکی یا صندوق جدید"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">شماره پیگیری / فیش / شناسه صیاد:</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="مثلاً PAYA-991823"
                  className="w-full rounded-lg border border-slate-300 p-2 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">توضیحات و بابت:</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="توضیحات تکمیلی سند پرداخت"
                  className="w-full rounded-lg border border-slate-300 p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'در حال ثبت...' : 'ثبت قطعی پرداخت'}
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
        defaultPartyRole={quickMasterRole}
        onSuccess={(result) => {
          if (result.type === 'PARTY') {
            setFormSupplierId(result.id);
          } else if (result.type === 'WAREHOUSE') {
            setFormWarehouseId(result.id);
          } else if (result.type === 'BANK_ACCOUNT') {
            setPaySourceBank(result.title);
          } else if (result.type === 'CASH_BOX') {
            setPaySourceBank(`صندوق ${result.title}`);
          }
          setActionSuccess(`«${result.title}» با موفقیت ثبت و بلافاصله انتخاب گردید.`);
        }}
        onRefresh={onRefresh}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={invoiceToDelete !== null}
        title="تایید حذف فاکتور خرید"
        message={`آیا از حذف دائمی فاکتور خرید «${invoiceToDelete?.invoiceNumber}» اطمینان دارید؟`}
        details={`این عملیات کالاها را از انبار خارج و مانده حساب تأمین‌کننده را تعدیل خواهد کرد.\nمبلغ فاکتور: ${(invoiceToDelete?.totalInvoicePayableToSupplierIrr || 0).toLocaleString('fa-IR')} ریال`}
        errorMessage={deleteError}
        confirmText="حذف فاکتور خرید"
        cancelText="انصراف"
        isLoading={isDeletingInvoice}
        isDestructive={true}
        onConfirm={handleConfirmDeleteInvoice}
        onClose={() => {
          setInvoiceToDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
