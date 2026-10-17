import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Zap,
  FileText,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  Barcode,
  CreditCard,
  DollarSign,
  UserCheck,
  Building2,
  Package,
  Layers,
  ChevronDown,
  X,
  Eye,
  TrendingUp,
  Receipt,
  FileCheck,
  Download,
  FileSpreadsheet,
  Monitor,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import { printHtmlContent, downloadInvoiceHtml } from '../utils/printUtils';
import { QuickMasterModal, QuickAddButton, QuickMasterType } from './QuickMasterModal';
import { PriceInput } from './PriceInput';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  FoundationDataResponse,
  SalesInvoiceRecord,
  SalesProformaRecord,
  SalesReturnRecord,
  SalesReceiptRecord,
  SalesPaymentMethod,
  ItemRecord,
  ItemSerialRecord,
  WarehouseRecord,
  PartyRecord,
} from '../types/foundation';

interface SalesManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => void;
}

type SalesSubTab = 'QUICK_POS' | 'INVOICES' | 'PROFORMAS' | 'RETURNS';

interface CartLine {
  itemId: number;
  itemCode: string;
  itemTitleFa: string;
  unitNameFa: string;
  isSerialized: boolean;
  quantity: number;
  unitPriceIrr: number;
  discountIrr: number;
  vatAmountIrr: number;
  selectedSerials: string[];
}

export const SalesManagementView: React.FC<SalesManagementViewProps> = ({
  foundationData,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SalesSubTab>('QUICK_POS');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Lists from foundationData
  const salesInvoices = foundationData.salesInvoices || [];
  const salesProformas = foundationData.salesProformas || [];
  const salesReturns = foundationData.salesReturns || [];
  const items = foundationData.items || [];
  const warehouses = foundationData.warehouses || [];
  const parties = foundationData.parties || [];

  const customers = useMemo(
    () => parties.filter((p) => p.roles?.includes('CUSTOMER') || p.primaryType === 'CUSTOMER'),
    [parties]
  );

  const walkInCustomer = useMemo(
    () => customers.find((c) => c.partyCode === 'PRT-10000') || customers[0] || null,
    [customers]
  );

  // --------------------------------------------------------------------------
  // QUICK POS STATE
  // --------------------------------------------------------------------------
  const [posWarehouseId, setPosWarehouseId] = useState<number>(warehouses[0]?.id || 1);
  const [posCustomerId, setPosCustomerId] = useState<number>(walkInCustomer?.id || 1);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<SalesPaymentMethod>('POS');
  const [posPaidAmount, setPosPaidAmount] = useState<number>(0);
  const [posTerminalName, setPosTerminalName] = useState('کارتخوان مرکزی صندوق');
  const [posTrackingRef, setPosTrackingRef] = useState('');
  const [posNotes, setPosNotes] = useState('');
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Modal States
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<SalesInvoiceRecord | null>(null);
  const [printMode, setPrintMode] = useState<'A4' | 'POS_RECEIPT' | 'FAST_SIMPLE'>('FAST_SIMPLE');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [serialPickerLineIndex, setSerialPickerLineIndex] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<SalesInvoiceRecord | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<SalesInvoiceRecord | null>(null);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [quickMasterType, setQuickMasterType] = useState<QuickMasterType | null>(null);
  const [quickMasterDefaultRole, setQuickMasterDefaultRole] = useState<'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'OTHER'>('CUSTOMER');

  // Return Form State
  const [returnWarehouseId, setReturnWarehouseId] = useState<number>(warehouses[0]?.id || 1);
  const [returnLines, setReturnLines] = useState<
    Array<{ itemId: number; quantity: number; unitRefundIrr: number; serialNumbers: string[]; reasonFa: string }>
  >([]);

  // Receipt Form State
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptMethod, setReceiptMethod] = useState<SalesPaymentMethod>('POS');
  const [receiptBank, setReceiptBank] = useState('کارتخوان سامان - صندوق');
  const [receiptRef, setReceiptRef] = useState('');

  // Proforma Form State
  const [proformaCustomerId, setProformaCustomerId] = useState<number>(customers[0]?.id || 1);
  const [proformaLines, setProformaLines] = useState<
    Array<{ itemId: number; quantity: number; unitPriceIrr: number; discountIrr: number; vatAmountIrr: number }>
  >([]);

  // Auto-fill default paid amount when cart total changes
  const cartSubtotal = useMemo(
    () => cartLines.reduce((acc, l) => acc + (l.unitPriceIrr - l.discountIrr) * l.quantity, 0),
    [cartLines]
  );
  const cartVatTotal = useMemo(
    () => cartLines.reduce((acc, l) => acc + l.vatAmountIrr, 0),
    [cartLines]
  );
  const cartTotalPayable = cartSubtotal + cartVatTotal;

  useEffect(() => {
    setPosPaidAmount(cartTotalPayable);
  }, [cartTotalPayable]);

  // Search Items Filter
  const filteredSearchItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return [];
    const q = itemSearchQuery.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.titleFa.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q)) ||
        (i.model && i.model.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [itemSearchQuery, items]);

  // Handle Add Item to Cart
  const handleAddItemToCart = (item: ItemRecord) => {
    setCartLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.itemId === item.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            itemId: item.id,
            itemCode: item.itemCode,
            itemTitleFa: item.titleFa,
            unitNameFa: item.unitNameFa || 'عدد',
            isSerialized: Boolean(item.isSerialized),
            quantity: 1,
            unitPriceIrr: item.salePriceIrr || 0,
            discountIrr: 0,
            vatAmountIrr: 0,
            selectedSerials: [],
          },
        ];
      }
    });
    setItemSearchQuery('');
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  const handleRemoveFromCart = (index: number) => {
    setCartLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCartLine = (index: number, field: keyof CartLine, val: number) => {
    setCartLines((prev) => {
      const updated = [...prev];
      (updated[index] as unknown as Record<string, number>)[field] = val;
      return updated;
    });
  };

  // Submit Quick POS Sale
  const handleCheckoutQuickPos = async () => {
    if (cartLines.length === 0) {
      setFeedback({ type: 'error', message: 'سبد فروش سریع خالی است.' });
      return;
    }

    // Validate serials for serialized items
    for (const l of cartLines) {
      if (l.isSerialized && l.selectedSerials.length !== l.quantity) {
        setFeedback({
          type: 'error',
          message: `برای کالای «${l.itemTitleFa}» باید دقیقاً ${l.quantity} شماره سریال انتخاب کنید (تعداد انتخاب‌شده فعلی: ${l.selectedSerials.length}).`,
        });
        return;
      }
    }

    setIsSubmittingPos(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleType: 'QUICK_POS_SALE',
          customerId: posCustomerId || walkInCustomer?.id || 1,
          sourceWarehouseId: posWarehouseId,
          lines: cartLines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            unitPriceIrr: l.unitPriceIrr,
            discountIrr: l.discountIrr,
            vatAmountIrr: l.vatAmountIrr,
            serialNumbers: l.isSerialized ? l.selectedSerials : undefined,
          })),
          paidAmountIrr: posPaidAmount,
          paymentDetails: {
            paymentMethod,
            posTerminalOrBank: posTerminalName,
            trackingReference: posTrackingRef || `POS-${Date.now().toString().slice(-6)}`,
          },
          notesFa: posNotes || 'فروش سریع صندوق',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.messageFa || 'خطا در ثبت فروش سریع.');
      }

      setFeedback({
        type: 'success',
        message: `فاکتور فروش سریع [${data.invoice.invoiceNumber}] با موفقیت ثبت شد. خروج انبار [${data.invoice.inventoryDocNumber}] صادر گردید.`,
      });

      // Clear cart
      setCartLines([]);
      setPosNotes('');
      setPosTrackingRef('');

      // Refresh foundation data
      onRefresh();

      // Open print modal
      setSelectedInvoiceForView(data.invoice);
      setPrintMode('POS_RECEIPT');
      setShowPrintModal(true);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'خطا در ثبت فروش سریع.',
      });
    } finally {
      setIsSubmittingPos(false);
    }
  };

  // Convert Proforma To Invoice
  const handleConvertProforma = async (proformaId: number) => {
    try {
      const res = await fetch(`/api/sales/proformas/${proformaId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWarehouseId: 1,
          paymentDetails: {
            paymentMethod: 'POS',
            posTerminalOrBank: 'صندوق مرکزی',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.messageFa || 'خطا در تبدیل پیش‌فاکتور.');

      setFeedback({
        type: 'success',
        message: `پیش‌فاکتور با موفقیت به فاکتور فروش «${data.invoice.invoiceNumber}» تبدیل گردید.`,
      });
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'خطا در تبدیل پیش‌فاکتور.',
      });
    }
  };

  // Cancel Invoice
  const handleCancelInvoice = async (invoiceId: number) => {
    const reason = window.prompt('لطفاً علت لغو فاکتور فروش را وارد کنید:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/sales/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasonFa: reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.messageFa || 'خطا در لغو فاکتور.');

      setFeedback({
        type: 'success',
        message: `فاکتور فروش «${data.invoice.invoiceNumber}» لغو گردید و کالا به انبار بازگشت.`,
      });
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'خطا در لغو فاکتور.',
      });
    }
  };

  // Delete Confirmation State
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    errorMessage?: string | null;
    isLoading?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  // Delete Invoice Permanently
  const handleDeleteInvoice = (invoiceId: number, invoiceNumber: string) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تایید حذف فاکتور فروش',
      message: `آیا از حذف دائمی فاکتور فروش «${invoiceNumber}» اطمینان دارید؟`,
      details: 'این عملیات کالاهای فروخته شده را به انبار بازگردانده و بدهی/مانده مشتری را کسر می‌نماید.',
      errorMessage: null,
      onConfirm: async () => {
        setDeleteConfirmState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));
        try {
          const res = await fetch(`/api/sales/invoices/${invoiceId}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.messageFa || 'خطا در حذف فاکتور فروش.');

          setFeedback({
            type: 'success',
            message: data.messageFa || `فاکتور فروش «${invoiceNumber}» با موفقیت حذف گردید.`,
          });
          setDeleteConfirmState((prev) => ({ ...prev, isOpen: false, isLoading: false, errorMessage: null }));
          onRefresh();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'خطا در حذف فاکتور فروش.';
          setFeedback({
            type: 'error',
            message: errMsg,
          });
          setDeleteConfirmState((prev) => ({ ...prev, isLoading: false, errorMessage: errMsg }));
        }
      },
    });
  };

  // Delete Proforma
  const handleDeleteProforma = (proformaId: number, proformaNumber: string) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تایید حذف پیش‌فاکتور فروش',
      message: `آیا از حذف پیش‌فاکتور فروش «${proformaNumber}» اطمینان دارید؟`,
      details: 'این پیش‌فاکتور به صورت کامل از سیستم حذف خواهد شد.',
      errorMessage: null,
      onConfirm: async () => {
        setDeleteConfirmState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));
        try {
          const res = await fetch(`/api/sales/proformas/${proformaId}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.messageFa || 'خطا در حذف پیش‌فاکتور.');

          setFeedback({
            type: 'success',
            message: data.messageFa || `پیش‌فاکتور «${proformaNumber}» با موفقیت حذف گردید.`,
          });
          setDeleteConfirmState((prev) => ({ ...prev, isOpen: false, isLoading: false, errorMessage: null }));
          onRefresh();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'خطا در حذف پیش‌فاکتور.';
          setFeedback({
            type: 'error',
            message: errMsg,
          });
          setDeleteConfirmState((prev) => ({ ...prev, isLoading: false, errorMessage: errMsg }));
        }
      },
    });
  };

  // Submit Sales Return
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReturnModal) return;

    try {
      const res = await fetch('/api/sales/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesInvoiceId: showReturnModal.id,
          targetWarehouseId: returnWarehouseId,
          lines: returnLines,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.messageFa || 'خطا در ثبت مرجوعی فروش.');

      setFeedback({
        type: 'success',
        message: `سند برگشت از فروش «${data.salesReturn.returnNumber}» با موفقیت ثبت گردید.`,
      });
      setShowReturnModal(null);
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'خطا در ثبت مرجوعی.',
      });
    }
  };

  // Submit Receipt Payment
  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;

    try {
      const res = await fetch('/api/sales/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: showPaymentModal.customerId,
          salesInvoiceId: showPaymentModal.id,
          amountIrr: receiptAmount,
          paymentMethod: receiptMethod,
          destinationBankOrCash: receiptBank,
          trackingReference: receiptRef || `REC-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.messageFa || 'خطا در ثبت دریافت وجه.');

      setFeedback({
        type: 'success',
        message: `رسید دریافت «${data.receipt.receiptNumber}» به مبلغ ${receiptAmount.toLocaleString()} ریال با موفقیت ثبت شد.`,
      });
      setShowPaymentModal(null);
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'خطا در ثبت دریافت وجه.',
      });
    }
  };

  // KPI Calculations
  const kpiTotalSales = useMemo(
    () => salesInvoices.reduce((acc, i) => (i.status !== 'CANCELLED' ? acc + i.totalInvoiceAmountIrr : acc), 0),
    [salesInvoices]
  );
  const kpiTotalCogs = useMemo(
    () => salesInvoices.reduce((acc, i) => (i.status !== 'CANCELLED' ? acc + i.totalCogsIrr : acc), 0),
    [salesInvoices]
  );
  const kpiGrossProfit = kpiTotalSales - kpiTotalCogs;
  const kpiRemainingDebt = useMemo(
    () => salesInvoices.reduce((acc, i) => (i.status !== 'CANCELLED' ? acc + i.remainingBalanceIrr : acc), 0),
    [salesInvoices]
  );

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            مدیریت فروش، پیش‌فاکتور و صندوق فروش سریع (Quick POS)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ماژول کامل فروش آنی حضوری، صدور پیش‌فاکتور، ثبت دریافت وجه، محاسبه بهای تمام‌شده COGS و مرجوعی فروش
          </p>
        </div>

        {/* SubTab Switches */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('QUICK_POS')}
            className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'QUICK_POS'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            فروش سریع صندوق
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('INVOICES')}
            className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'INVOICES'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            فاکتورهای فروش
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('PROFORMAS')}
            className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'PROFORMAS'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            پیش‌فاکتورها
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('RETURNS')}
            className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'RETURNS'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            مرجوعی فروش
          </button>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards (Visible across tabs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">مجموع فروش قطعی</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {(kpiTotalSales / 10).toLocaleString()} <span className="text-xs font-normal text-slate-500">تومان</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">بهای تمام‌شده COGS</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {(kpiTotalCogs / 10).toLocaleString()} <span className="text-xs font-normal text-slate-500">تومان</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">سود ناخالص فروش</p>
            <p className="text-base font-bold text-emerald-700 mt-0.5">
              {(kpiGrossProfit / 10).toLocaleString()} <span className="text-xs font-normal text-slate-500">تومان</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">مانده طلب از مشتریان</p>
            <p className="text-base font-bold text-rose-600 mt-0.5">
              {(kpiRemainingDebt / 10).toLocaleString()} <span className="text-xs font-normal text-slate-500">تومان</span>
            </p>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: QUICK POS SALE (فروش سریع صندوق) */}
      {activeSubTab === 'QUICK_POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Item Search & Cart Items (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-blue-600" />
                  جستجوی سریع کالا / اسکن بارکد / کد کالا / مدل / نام
                </span>
                <span className="text-slate-400 font-normal">آماده اتصال به بارکدخوان نوری</span>
              </label>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setSelectedSearchIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (filteredSearchItems.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedSearchIndex((prev) =>
                        prev < filteredSearchItems.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedSearchIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredSearchItems.length - 1
                      );
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const target = filteredSearchItems[selectedSearchIndex] || filteredSearchItems[0];
                      if (target) {
                        handleAddItemToCart(target);
                        setSelectedSearchIndex(0);
                      }
                    } else if (e.key === 'Escape') {
                      setItemSearchQuery('');
                      setSelectedSearchIndex(0);
                    }
                  }}
                  placeholder="بارکد یا نام کالا را تایپ کنید (با دکمه‌های ↑ و ↓ انتخاب و با Enter ثبت کنید)..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
                  autoFocus
                />
              </div>

              {/* Search Suggestions Dropdown with Keyboard Navigation */}
              {filteredSearchItems.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span>نتایج جستجو ({filteredSearchItems.length} کالا)</span>
                    <span className="text-blue-600 font-mono">کلیدهای ↑ و ↓ برای پیمایش · کلید Enter جهت افزودن سریع</span>
                  </div>
                  {filteredSearchItems.map((item, idx) => {
                    const isSelected = selectedSearchIndex === idx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleAddItemToCart(item);
                          setSelectedSearchIndex(0);
                        }}
                        onMouseEnter={() => setSelectedSearchIndex(idx)}
                        className={`w-full text-right px-4 py-2.5 transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 border-r-4 border-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-blue-900 font-black' : 'text-slate-800'}`}>
                            {item.titleFa}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            کد: <span className="font-mono">{item.itemCode}</span> {item.model ? `| مدل: ${item.model}` : ''}{' '}
                            {item.barcode ? `| بارکد: ${item.barcode}` : ''}
                          </p>
                        </div>
                        <div className="text-left shrink-0 flex items-center gap-2.5">
                          <p className="text-xs font-black text-blue-700 font-mono">
                            {((item.salePriceIrr || 0) / 10).toLocaleString()} تومان
                          </p>
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded shadow-xs">
                              ثبت [Enter ↵]
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-xs">
                              + افزودن
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  اقلام انتخابی سبد فروش سریع ({cartLines.length} کالا)
                </h3>
                {cartLines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartLines([])}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    پاک کردن سبد
                  </button>
                )}
              </div>

              {cartLines.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-xs font-medium">سبد فروش خالی است.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    بارکد کالا را اسکن کنید یا از کادر جستجو کالا را انتخاب نمایید.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">شرح کالا</th>
                        <th className="px-3 py-2.5 text-center">تعداد</th>
                        <th className="px-3 py-2.5">قیمت واحد (تومان)</th>
                        <th className="px-3 py-2.5">تخفیف (تومان)</th>
                        <th className="px-3 py-2.5">جمع کل (تومان)</th>
                        <th className="px-3 py-2.5 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cartLines.map((line, idx) => {
                        const lineNet =
                          (line.unitPriceIrr - line.discountIrr) * line.quantity + line.vatAmountIrr;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-3">
                              <p className="font-bold text-slate-900">{line.itemTitleFa}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">کد: {line.itemCode}</p>

                              {line.isSerialized && (
                                <div className="mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSerialPickerLineIndex(idx)}
                                    className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md hover:bg-blue-100 font-semibold flex items-center gap-1"
                                  >
                                    <Barcode className="w-3 h-3" />
                                    {line.selectedSerials.length > 0
                                      ? `سریال‌ها (${line.selectedSerials.length}): ${line.selectedSerials.join(', ')}`
                                      : 'انتخاب شماره سریال‌ها...'}
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 text-center">
                              <div className="inline-flex items-center border border-slate-300 rounded-md bg-white">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCartLine(idx, 'quantity', Math.max(1, line.quantity - 1))
                                  }
                                  className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 rounded-r-md font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2.5 font-bold text-slate-900">{line.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCartLine(idx, 'quantity', line.quantity + 1)
                                  }
                                  className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 rounded-l-md font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={line.unitPriceIrr / 10}
                                onChange={(e) =>
                                  handleUpdateCartLine(idx, 'unitPriceIrr', (Number(e.target.value) || 0) * 10)
                                }
                                className="w-24 px-2 py-1 border border-slate-300 rounded-md text-xs font-semibold bg-white text-slate-900"
                              />
                            </td>

                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={line.discountIrr / 10}
                                onChange={(e) =>
                                  handleUpdateCartLine(idx, 'discountIrr', (Number(e.target.value) || 0) * 10)
                                }
                                className="w-20 px-2 py-1 border border-slate-300 rounded-md text-xs font-semibold bg-white text-slate-900"
                              />
                            </td>

                            <td className="px-3 py-3 font-extrabold text-slate-900">
                              {(lineNet / 10).toLocaleString()}
                            </td>

                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(idx)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Checkout, Customer & Payment Details (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                تنظیمات فروش و تسویه سریع صندوق
              </h3>

              {/* Warehouse Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>انبار خروج کالا:</span>
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
                    value={posWarehouseId}
                    onChange={(e) => setPosWarehouseId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-hidden"
                  >
                    {warehouses.map((w) => (
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

              {/* Customer Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>مشتری / خریدار:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMasterDefaultRole('CUSTOMER');
                        setQuickMasterType('PARTY');
                      }}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="افزودن سریع شخص / خریدار جدید"
                    >
                      <Plus className="w-3 h-3" />
                      <span>شخص جدید</span>
                    </button>
                  </div>
                  {walkInCustomer && (
                    <button
                      type="button"
                      onClick={() => setPosCustomerId(walkInCustomer.id)}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      انتخاب خریدار عمومی حضوری
                    </button>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={posCustomerId}
                    onChange={(e) => setPosCustomerId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-hidden"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.partyCode}) {c.mobile ? `· ${c.mobile}` : ''}
                      </option>
                    ))}
                  </select>
                  <QuickAddButton
                    onClick={() => {
                      setQuickMasterDefaultRole('CUSTOMER');
                      setQuickMasterType('PARTY');
                    }}
                    title="افزودن سریع شخص / مشتری جدید"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  روش دریافت وجه:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'POS'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    کارتخوان (POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'CASH'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    نقدی / صندوق
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    حواله / پایا
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'CREDIT'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    نسیه / بدهکار
                  </button>
                </div>
              </div>

              {/* Paid Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    مبلغ دریافتی (تومان):
                  </label>
                  <button
                    type="button"
                    onClick={() => setPosPaidAmount(cartTotalPayable)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer"
                  >
                    تسویه کل مبلغ
                  </button>
                </div>
                <PriceInput
                  value={posPaidAmount / 10}
                  onChange={(val) => setPosPaidAmount(val * 10)}
                  placeholder="0"
                  unit="تومان"
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-extrabold text-emerald-700 focus:bg-white"
                />
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[10px] font-semibold text-slate-600">
                      {paymentMethod === 'CASH' ? 'نام صندوق / متصدی:' : 'کارتخوان / بانک:'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setQuickMasterType(paymentMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                      className="text-[9px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      title="افزودن سریع بانک یا صندوق"
                    >
                      + {paymentMethod === 'CASH' ? 'صندوق' : 'بانک'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      list="pos-payment-sources"
                      value={posTerminalName}
                      onChange={(e) => setPosTerminalName(e.target.value)}
                      placeholder={paymentMethod === 'CASH' ? 'صندوق اصلی' : 'کارتخوان سامان / ملت'}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium"
                    />
                    <datalist id="pos-payment-sources">
                      {(foundationData.bankAccounts || []).map((b) => (
                        <option key={b.id} value={`${b.bankNameFa} (${b.accountNumber})`} />
                      ))}
                      {(foundationData.cashBoxes || []).map((c) => (
                        <option key={c.id} value={`صندوق ${c.titleFa}`} />
                      ))}
                    </datalist>
                    <QuickAddButton
                      onClick={() => setQuickMasterType(paymentMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                      title="افزودن سریع حساب یا صندوق"
                      className="p-1.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    شماره پیگیری:
                  </label>
                  <input
                    type="text"
                    value={posTrackingRef}
                    onChange={(e) => setPosTrackingRef(e.target.value)}
                    placeholder="اختیاری..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium"
                  />
                </div>
              </div>

              {/* Cart Financial Breakdown */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>جمع اقلام:</span>
                  <span className="font-semibold">{(cartSubtotal / 10).toLocaleString()} تومان</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>مالیات بر ارزش افزوده:</span>
                  <span className="font-semibold">{(cartVatTotal / 10).toLocaleString()} تومان</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>مبلغ کل قابل پرداخت:</span>
                  <span className="text-blue-700">{(cartTotalPayable / 10).toLocaleString()} تومان</span>
                </div>
                {cartTotalPayable > posPaidAmount && (
                  <div className="flex justify-between text-rose-600 font-bold text-xs pt-1">
                    <span>مانده بدهکار مشتری:</span>
                    <span>{((cartTotalPayable - posPaidAmount) / 10).toLocaleString()} تومان</span>
                  </div>
                )}
              </div>

              {/* Final Submit Button */}
              <button
                type="button"
                disabled={isSubmittingPos || cartLines.length === 0}
                onClick={handleCheckoutQuickPos}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                {isSubmittingPos ? 'در حال صدور فاکتور و خروج انبار...' : 'ثبت نهایی و چاپ فیش خرید (F8)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SALES INVOICES LIST (فاکتورهای فروش) */}
      {activeSubTab === 'INVOICES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              فهرست فاکتورهای رسمی و فروش سریع ({salesInvoices.length} فاکتور)
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const exportData = salesInvoices.map((inv) => ({
                    invoiceNumber: inv.invoiceNumber,
                    invoiceType:
                      inv.saleType === 'QUICK_POS_SALE'
                        ? 'فروش سریع پوز'
                        : inv.saleType === 'PROFORMA_CONVERTED'
                        ? 'پیش‌فاکتور'
                        : 'فروش عادی',
                    customerTitleFa: inv.customerTitleFa,
                    dateJalali: inv.dateJalali,
                    totalToman: (inv.totalInvoiceAmountIrr / 10).toLocaleString(),
                    cogsToman: (inv.totalCogsIrr / 10).toLocaleString(),
                    paidToman: (inv.paidAmountIrr / 10).toLocaleString(),
                    remainingToman: (inv.remainingBalanceIrr / 10).toLocaleString(),
                    status:
                      inv.status === 'PAID'
                        ? 'تسویه کامل'
                        : inv.status === 'PARTIALLY_PAID'
                        ? 'پرداخت جزئی'
                        : inv.status === 'CANCELLED'
                        ? 'لغو شده'
                        : 'صادر شده',
                  }));

                  exportToExcel(
                    `فاکتورهای_فروش_${Date.now()}`,
                    'فاکتورهای فروش',
                    [
                      { header: 'شماره فاکتور', key: 'invoiceNumber', width: 18 },
                      { header: 'نوع فروش', key: 'invoiceType', width: 16 },
                      { header: 'مشتری', key: 'customerTitleFa', width: 26 },
                      { header: 'تاریخ', key: 'dateJalali', width: 14 },
                      { header: 'مبلغ کل (تومان)', key: 'totalToman', width: 18 },
                      { header: 'بهای تمام‌شده (تومان)', key: 'cogsToman', width: 18 },
                      { header: 'دریافتی (تومان)', key: 'paidToman', width: 18 },
                      { header: 'مانده بدهی (تومان)', key: 'remainingToman', width: 18 },
                      { header: 'وضعیت', key: 'status', width: 14 },
                    ],
                    exportData
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="دانلود خروجی اکسل فاکتورها"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                خروجی اکسل (Excel)
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportData = salesInvoices.map((inv) => ({
                    invoiceNumber: inv.invoiceNumber,
                    customerTitleFa: inv.customerTitleFa,
                    dateJalali: inv.dateJalali,
                    totalToman: `${(inv.totalInvoiceAmountIrr / 10).toLocaleString()} تومان`,
                    paidToman: `${(inv.paidAmountIrr / 10).toLocaleString()} تومان`,
                    remainingToman: `${(inv.remainingBalanceIrr / 10).toLocaleString()} تومان`,
                    status: inv.status === 'PAID' ? 'تسویه کامل' : inv.status === 'PARTIALLY_PAID' ? 'پرداخت جزئی' : 'صادر شده',
                  }));

                  exportToPdf(
                    'گزارش رسمی فهرست فاکتورهای فروش و وضعیت مطالبات',
                    [
                      { header: 'شماره فاکتور', key: 'invoiceNumber' },
                      { header: 'خریدار / طرف حساب', key: 'customerTitleFa' },
                      { header: 'تاریخ صدور', key: 'dateJalali' },
                      { header: 'مبلغ فاکتور', key: 'totalToman' },
                      { header: 'مبلغ دریافتی', key: 'paidToman' },
                      { header: 'مانده بدهی', key: 'remainingToman' },
                      { header: 'وضعیت تسویه', key: 'status' },
                    ],
                    exportData,
                    {
                      docNumber: `REP-SALES-${Date.now().toString().slice(-6)}`,
                      summaryFa: `تعداد کل فاکتورها: ${salesInvoices.length} فقره | مجموع فروش: ${(salesInvoices.reduce((s, i) => s + i.totalInvoiceAmountIrr, 0) / 10).toLocaleString()} تومان`,
                    }
                  );
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="خروجی و چاپ PDF فاکتورها"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                خروجی PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">شماره فاکتور</th>
                  <th className="px-3.5 py-3">نوع فروش</th>
                  <th className="px-3.5 py-3">مشتری</th>
                  <th className="px-3.5 py-3">تاریخ</th>
                  <th className="px-3.5 py-3">مبلغ کل (تومان)</th>
                  <th className="px-3.5 py-3">بهای تمام‌شده COGS</th>
                  <th className="px-3.5 py-3">دریافتی</th>
                  <th className="px-3.5 py-3">مانده بدهی</th>
                  <th className="px-3.5 py-3">رسید انبار</th>
                  <th className="px-3.5 py-3">وضعیت</th>
                  <th className="px-3.5 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      هیچ فاکتور فروشی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  salesInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-bold text-blue-700">{inv.invoiceNumber}</td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            inv.saleType === 'QUICK_POS_SALE'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.saleType === 'PROFORMA_CONVERTED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.saleType === 'QUICK_POS_SALE'
                            ? 'فروش سریع POS'
                            : inv.saleType === 'PROFORMA_CONVERTED'
                            ? 'تبدیلی پیش‌فاکتور'
                            : 'فروش عادی'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">{inv.customerTitleFa}</td>
                      <td className="px-3.5 py-3 text-slate-500">{inv.dateJalali}</td>
                      <td className="px-3.5 py-3 font-extrabold text-slate-900">
                        {(inv.totalInvoiceAmountIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 font-medium text-slate-600">
                        {(inv.totalCogsIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 text-emerald-700 font-bold">
                        {(inv.paidAmountIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 text-rose-600 font-bold">
                        {(inv.remainingBalanceIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono text-[11px]">
                        {inv.inventoryDocNumber || '-'}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {inv.status === 'PAID'
                            ? 'تسویه کامل'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'پرداخت جزئی'
                            : inv.status === 'CANCELLED'
                            ? 'لغو شده'
                            : 'تایید شده'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceForView(inv);
                              setPrintMode('A4');
                              setShowPrintModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md"
                            title="مشاهده و چاپ فاکتور رسمی A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {inv.status !== 'CANCELLED' && inv.remainingBalanceIrr > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowPaymentModal(inv);
                                setReceiptAmount(inv.remainingBalanceIrr);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                              title="ثبت دریافت وجه"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {inv.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowReturnModal(inv);
                                setReturnLines(
                                  inv.lines.map((l) => ({
                                    itemId: l.itemId,
                                    quantity: 1,
                                    unitRefundIrr: l.netPriceIrr / l.quantity,
                                    serialNumbers: l.serialNumbers ? [l.serialNumbers[0]] : [],
                                    reasonFa: 'مرجوعی کالا توسط خریدار',
                                  }))
                                );
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md"
                              title="ثبت مرجوعی کالا"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {inv.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleCancelInvoice(inv.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"
                              title="لغو رسمی فاکتور"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="حذف کامل فاکتور فروش"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* SUBTAB 3: PROFORMAS LIST (پیش‌فاکتورها) */}
      {activeSubTab === 'PROFORMAS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-blue-600" />
              پیش‌فاکتورهای رسمی فروش ({salesProformas.length} پیش‌فاکتور)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">شماره پیش‌فاکتور</th>
                  <th className="px-3.5 py-3">مشتری</th>
                  <th className="px-3.5 py-3">تاریخ صدور</th>
                  <th className="px-3.5 py-3">مهلت اعتبار</th>
                  <th className="px-3.5 py-3">مبلغ کل (تومان)</th>
                  <th className="px-3.5 py-3">وضعیت</th>
                  <th className="px-3.5 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesProformas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      هیچ پیش‌فاکتور فروشی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  salesProformas.map((pf) => (
                    <tr key={pf.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-bold text-blue-700">{pf.proformaNumber}</td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">{pf.customerTitleFa}</td>
                      <td className="px-3.5 py-3 text-slate-500">{pf.dateJalali}</td>
                      <td className="px-3.5 py-3 text-slate-500">{pf.validUntilJalali}</td>
                      <td className="px-3.5 py-3 font-extrabold text-slate-900">
                        {(pf.totalPayableIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            pf.status === 'CONVERTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pf.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {pf.status === 'CONVERTED'
                            ? 'تبدیل‌شده به فاکتور'
                            : pf.status === 'APPROVED'
                            ? 'تایید شده'
                            : 'پیش‌نویس'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {pf.status !== 'CONVERTED' && (
                            <button
                              type="button"
                              onClick={() => handleConvertProforma(pf.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition-all shadow-xs"
                            >
                              تبدیل به فاکتور فروش
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProforma(pf.id, pf.proformaNumber)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="حذف پیش‌فاکتور فروش"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* SUBTAB 4: SALES RETURNS LIST (مرجوعی از فروش) */}
      {activeSubTab === 'RETURNS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              سوابق برگشت از فروش ({salesReturns.length} سند)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">شماره برگشتی</th>
                  <th className="px-3.5 py-3">عطف به فاکتور</th>
                  <th className="px-3.5 py-3">مشتری</th>
                  <th className="px-3.5 py-3">انبار مرجوعی</th>
                  <th className="px-3.5 py-3">تاریخ</th>
                  <th className="px-3.5 py-3">مبلغ استرداد (تومان)</th>
                  <th className="px-3.5 py-3">رسید انبار</th>
                  <th className="px-3.5 py-3">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      هیچ برگشت از فروشی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  salesReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-bold text-blue-700">{ret.returnNumber}</td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">{ret.invoiceNumber}</td>
                      <td className="px-3.5 py-3 text-slate-700">{ret.customerTitleFa}</td>
                      <td className="px-3.5 py-3 text-slate-600">{ret.targetWarehouseTitleFa}</td>
                      <td className="px-3.5 py-3 text-slate-500">{ret.dateJalali}</td>
                      <td className="px-3.5 py-3 font-extrabold text-amber-700">
                        {(ret.totalRefundAmountIrr / 10).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-500">
                        {ret.inventoryDocNumber}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          ورود مجدد به انبار
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINT MODAL (Official A4 / Thermal POS Receipt) */}
      {showPrintModal && selectedInvoiceForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header / Mode Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  پیش‌نمایش چاپ فاکتور فروش [{selectedInvoiceForView.invoiceNumber}]
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPrintMode('FAST_SIMPLE')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      printMode === 'FAST_SIMPLE' ? 'bg-emerald-700 text-white shadow-xs font-extrabold' : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    چاپ سریع (فاکتور ساده)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('A4')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      printMode === 'A4' ? 'bg-blue-700 text-white shadow-xs font-extrabold' : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    فاکتور رسمی A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('POS_RECEIPT')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      printMode === 'POS_RECEIPT'
                        ? 'bg-purple-700 text-white shadow-xs font-extrabold'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    فیش حرارتی (80mm)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="printable-area border border-slate-200 rounded-lg p-6 bg-white shadow-inner">
              {printMode === 'FAST_SIMPLE' ? (
                /* FAST SIMPLE UN-OFFICIAL INVOICE LAYOUT (فاکتور ساده غیررسمی با فونت زار و تیتر) */
                <div className="space-y-5 text-slate-900 text-xs font-serif" style={{ fontFamily: "'B Zar', 'Zar', 'Vazirmatn', serif" }}>
                  {/* Header */}
                  <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-emerald-950" style={{ fontFamily: "'B Titr', 'Titr', sans-serif" }}>
                        فاکتور فروش کالا و خدمات (ساده و سریع)
                      </h2>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        فروشگاه سیستم‌های امنیتی و نظارتی مهرگان
                      </p>
                    </div>
                    <div className="text-left font-mono text-xs bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <p className="font-bold text-emerald-900">شماره: {selectedInvoiceForView.invoiceNumber}</p>
                      <p className="text-slate-700 mt-0.5">تاریخ: {selectedInvoiceForView.dateJalali}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">خریدار / طرف حساب: </span>
                      <span className="font-extrabold text-slate-900">{selectedInvoiceForView.customerTitleFa}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">تحویل از انبار: </span>
                      <span>{selectedInvoiceForView.sourceWarehouseTitleFa}</span>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-right text-xs border border-slate-300 border-collapse">
                    <thead className="bg-emerald-50 text-emerald-950 font-bold border-b border-slate-300" style={{ fontFamily: "'B Titr', 'Titr', sans-serif" }}>
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center">ردیف</th>
                        <th className="p-2 border-r border-slate-300">کد</th>
                        <th className="p-2 border-r border-slate-300">شرح کالا و تجهیزات</th>
                        <th className="p-2 border-r border-slate-300 text-center">تعداد</th>
                        <th className="p-2 border-r border-slate-300">قیمت واحد (تومان)</th>
                        <th className="p-2">جمع ردیف (تومان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoiceForView.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="p-2 border-r border-slate-300 text-center font-mono">{i + 1}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{l.itemCode}</td>
                          <td className="p-2 border-r border-slate-300">
                            <span className="font-bold">{l.itemTitleFa}</span>
                            {l.serialNumbers && l.serialNumbers.length > 0 && (
                              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                                سریال‌ها: {l.serialNumbers.join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">{l.quantity}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{(l.unitPriceIrr / 10).toLocaleString('fa-IR')}</td>
                          <td className="p-2 font-bold font-mono">{(l.netPriceIrr / 10).toLocaleString('fa-IR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary */}
                  <div className="flex justify-end">
                    <div className="w-72 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-700 font-bold">
                        <span>مبلغ کل فاکتور:</span>
                        <span>{(selectedInvoiceForView.totalInvoiceAmountIrr / 10).toLocaleString('fa-IR')} تومان</span>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>دریافتی / نقدی:</span>
                        <span>{(selectedInvoiceForView.paidAmountIrr / 10).toLocaleString('fa-IR')} تومان</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-extrabold pt-1 border-t border-emerald-200">
                        <span>مانده حساب:</span>
                        <span>{(selectedInvoiceForView.remainingBalanceIrr / 10).toLocaleString('fa-IR')} تومان</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures Box Required by User */}
                  <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 text-center font-sans">
                    <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                      <p className="font-bold text-slate-800 text-xs" style={{ fontFamily: "'B Titr', 'Titr', sans-serif" }}>
                        محل امضا و اثر انگشت خریدار
                      </p>
                      <div className="h-14 mt-2 flex items-center justify-center text-[10px] text-slate-400">
                        (تأیید تحویل کالا و صحت صورتحساب)
                      </div>
                    </div>
                    <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                      <p className="font-bold text-slate-800 text-xs" style={{ fontFamily: "'B Titr', 'Titr', sans-serif" }}>
                        محل امضا و مهر فروشنده
                      </p>
                      <div className="h-14 mt-2 flex items-center justify-center text-[10px] text-slate-400">
                        فروشگاه سیستم‌های امنیتی مهرگان
                      </div>
                    </div>
                  </div>
                </div>
              ) : printMode === 'A4' ? (
                /* OFFICIAL A4 INVOICE LAYOUT */
                <div className="space-y-6 text-slate-900 text-xs">
                  {/* Company Header */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        فروشگاه سیستم‌های امنیتی و دوربین مداربسته مهرگان
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-1">
                        کد اقتصادی: 411-8920-3314 | شناسه ملی: 14009871230 | تلفن: 021-66748920
                      </p>
                    </div>
                    <div className="text-left border-r border-slate-200 pr-4">
                      <p className="font-extrabold text-blue-800 text-sm">
                        شماره: {selectedInvoiceForView.invoiceNumber}
                      </p>
                      <p className="text-slate-600 mt-0.5">تاریخ: {selectedInvoiceForView.dateJalali}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">خریدار: </span>
                      <span className="font-extrabold text-slate-900">
                        {selectedInvoiceForView.customerTitleFa}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">انبار خروج: </span>
                      <span>{selectedInvoiceForView.sourceWarehouseTitleFa}</span>
                    </div>
                  </div>

                  {/* Line Items Grid */}
                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300">ردیف</th>
                        <th className="p-2 border-r border-slate-300">کد کالا</th>
                        <th className="p-2 border-r border-slate-300">شرح کالا / شماره سریال‌ها</th>
                        <th className="p-2 border-r border-slate-300 text-center">تعداد</th>
                        <th className="p-2 border-r border-slate-300">قیمت واحد (تومان)</th>
                        <th className="p-2">جمع کل (تومان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoiceForView.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="p-2 border-r border-slate-300 text-center">{i + 1}</td>
                          <td className="p-2 border-r border-slate-300 font-mono text-[11px]">{l.itemCode}</td>
                          <td className="p-2 border-r border-slate-300">
                            <p className="font-bold">{l.itemTitleFa}</p>
                            {l.serialNumbers && l.serialNumbers.length > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                سریال‌ها: {l.serialNumbers.join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-bold">{l.quantity}</td>
                          <td className="p-2 border-r border-slate-300">
                            {(l.unitPriceIrr / 10).toLocaleString()}
                          </td>
                          <td className="p-2 font-extrabold">{(l.netPriceIrr / 10).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total Summary */}
                  <div className="flex justify-end">
                    <div className="w-64 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>جمع کل فاکتور:</span>
                        <span className="font-bold">
                          {(selectedInvoiceForView.totalInvoiceAmountIrr / 10).toLocaleString()} تومان
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>مبلغ پرداختی:</span>
                        <span>{(selectedInvoiceForView.paidAmountIrr / 10).toLocaleString()} تومان</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-extrabold pt-1 border-t border-slate-200">
                        <span>مانده بدهی:</span>
                        <span>
                          {(selectedInvoiceForView.remainingBalanceIrr / 10).toLocaleString()} تومان
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* THERMAL POS RECEIPT LAYOUT (80mm) */
                <div className="max-w-xs mx-auto bg-amber-50/40 p-4 border border-dashed border-amber-300 font-mono text-xs text-slate-900 space-y-3 dir-rtl shadow-xs">
                  <div className="text-center space-y-1">
                    <h3 className="font-extrabold text-sm text-slate-900">فروشگاه سیستم‌های امنیتی مهرگان</h3>
                    <p className="text-[10px] text-slate-500">صندوق فروش سریع - POS</p>
                    <div className="text-[10px] text-slate-600 border-t border-b border-dashed border-slate-300 py-1 my-2">
                      شماره: {selectedInvoiceForView.invoiceNumber} | {selectedInvoiceForView.dateJalali}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {selectedInvoiceForView.lines.map((l, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-200 pb-1">
                        <div>
                          <p className="font-bold text-slate-900">{l.itemTitleFa}</p>
                          <p className="text-[10px] text-slate-500">
                            {l.quantity} × {(l.unitPriceIrr / 10).toLocaleString()}
                          </p>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          {(l.netPriceIrr / 10).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-300 pt-2 space-y-1 font-bold">
                    <div className="flex justify-between text-slate-900">
                      <span>جمع فاکتور:</span>
                      <span>{(selectedInvoiceForView.totalInvoiceAmountIrr / 10).toLocaleString()} تومان</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>پرداختی کارتخوان:</span>
                      <span>{(selectedInvoiceForView.paidAmountIrr / 10).toLocaleString()} تومان</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-500 pt-2 border-t border-dashed border-slate-300">
                    با تشکر از خرید شما - گارانتی معتبر مهرگان
                  </p>
                </div>
              )}
            </div>

            {/* Print Trigger & Export Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const exportLines = selectedInvoiceForView.lines.map((l, i) => ({
                    row: i + 1,
                    itemCode: l.itemCode,
                    itemTitleFa: l.itemTitleFa,
                    serials: l.serialNumbers?.join(', ') || '-',
                    quantity: l.quantity,
                    unitPriceToman: (l.unitPriceIrr / 10).toLocaleString(),
                    netPriceToman: (l.netPriceIrr / 10).toLocaleString(),
                  }));

                  exportToExcel(
                    `فاکتور_${selectedInvoiceForView.invoiceNumber}`,
                    `فاکتور ${selectedInvoiceForView.invoiceNumber}`,
                    [
                      { header: 'ردیف', key: 'row', width: 8 },
                      { header: 'کد کالا', key: 'itemCode', width: 14 },
                      { header: 'شرح کالا', key: 'itemTitleFa', width: 32 },
                      { header: 'سریال‌ها', key: 'serials', width: 24 },
                      { header: 'تعداد', key: 'quantity', width: 10 },
                      { header: 'قیمت واحد (تومان)', key: 'unitPriceToman', width: 18 },
                      { header: 'جمع ردیف (تومان)', key: 'netPriceToman', width: 20 },
                    ],
                    exportLines
                  );
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                دانلود اکسل اقلام
              </button>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedInvoiceForView) return;
                    try {
                      const isA4 = printMode === 'A4';
                      const isSimple = printMode === 'FAST_SIMPLE';
                      const isThermal = printMode === 'POS_RECEIPT';
                      const invHtml = `
                        <div class="header" style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid ${isSimple ? '#059669' : '#0284c7'}; padding-bottom:8px; margin-bottom:12px;">
                          <div>
                            <div style="font-size: ${isA4 || isSimple ? '16px' : '12px'}; font-weight:800; color:${isSimple ? '#065f46' : '#0369a1'};">
                              ${isSimple ? 'فاکتور فروش کالا و خدمات (ساده و سریع)' : 'فروشگاه سیستم‌های امنیتی و دوربین مداربسته مهرگان'}
                            </div>
                            <div style="font-size: 9px; color: #64748b">کد اقتصادی: 411-8920-3314 | شناسه ملی: 14009871230 | تلفن: 021-66748920</div>
                          </div>
                          <div style="text-align:left; font-size:11px;">
                            <div><strong>شماره فاکتور:</strong> ${selectedInvoiceForView.invoiceNumber}</div>
                            <div><strong>تاریخ:</strong> ${selectedInvoiceForView.dateJalali}</div>
                            <div><strong>نوع:</strong> ${isSimple ? 'چاپ سریع (فاکتور ساده)' : isA4 ? 'فاکتور رسمی A4' : 'فیش حرارتی صندوق'}</div>
                          </div>
                        </div>

                        <div style="background:#f8fafc; padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:12px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                          <div><strong>خریدار:</strong> ${selectedInvoiceForView.customerTitleFa}</div>
                          <div><strong>انبار خروج:</strong> ${selectedInvoiceForView.sourceWarehouseTitleFa}</div>
                        </div>

                        <table style="width:100%; border-collapse:collapse; margin-top:8px; margin-bottom:12px; font-size:${isA4 || isSimple ? '11px' : '9px'};">
                          <thead>
                            <tr style="background:${isSimple ? '#ecfdf5' : '#f1f5f9'}; font-weight:700;">
                              <th style="border:1px solid #cbd5e1; padding:6px; width:30px; text-align:center;">ردیف</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">کد کالا</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">شرح کالا و تجهیزات</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:center;">تعداد</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">قیمت واحد (تومان)</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">جمع کل (تومان)</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${selectedInvoiceForView.lines
                              .map(
                                (l, i) => `
                              <tr>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${i + 1}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px;">${l.itemCode || '-'}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px;">
                                  <strong>${l.itemTitleFa}</strong>
                                  ${l.serialNumbers && l.serialNumbers.length > 0 ? `<br/><small style="color:#64748b">سریال: ${l.serialNumbers.join(', ')}</small>` : ''}
                                </td>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${l.quantity}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:left;">${(l.unitPriceIrr / 10).toLocaleString()}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:left;"><strong>${(l.netPriceIrr / 10).toLocaleString()}</strong></td>
                              </tr>
                            `
                              )
                              .join('')}
                          </tbody>
                        </table>

                        <div style="text-align:left; font-size:${isA4 || isSimple ? '12px' : '10px'}; font-weight:700; margin-top:10px; line-height:1.8;">
                          <div>جمع کل فاکتور: ${(selectedInvoiceForView.totalInvoiceAmountIrr / 10).toLocaleString()} تومان</div>
                          <div style="color:#047857">مبلغ پرداختی: ${(selectedInvoiceForView.paidAmountIrr / 10).toLocaleString()} تومان</div>
                          <div style="color:#e11d48">مانده بدهی: ${(selectedInvoiceForView.remainingBalanceIrr / 10).toLocaleString()} تومان</div>
                        </div>

                        <div style="display:flex; justify-content:space-between; margin-top:35px; padding-top:10px; border-top:1px solid #cbd5e1; text-align:center;">
                          <div style="width:45%; border:1px dashed #94a3b8; padding:12px; border-radius:6px; font-size:11px;">
                            امضا و اثر انگشت خریدار<br/><br/><br/>
                          </div>
                          <div style="width:45%; border:1px dashed #94a3b8; padding:12px; border-radius:6px; font-size:11px;">
                            امضا و مهر فروشنده<br/><br/><br/>
                          </div>
                        </div>

                        <div style="margin-top:16px; text-align:center; font-size:9px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:8px;">
                          با تشکر از خرید شما - سیستم جامع حسابداری و فروش مهرگان
                        </div>
                      `;

                      await printHtmlContent({
                        title: `فاکتور ${selectedInvoiceForView.invoiceNumber}`,
                        bodyHtml: invHtml,
                        isThermal,
                      });
                    } catch {
                      window.print();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  چاپ مستقیم (پرینتر / PDF)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedInvoiceForView) return;
                    const isA4 = printMode === 'A4';
                    const isSimple = printMode === 'FAST_SIMPLE';
                    const isThermal = printMode === 'POS_RECEIPT';
                    const invHtml = `
                      <div class="header" style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid ${isSimple ? '#059669' : '#0284c7'}; padding-bottom:8px; margin-bottom:12px;">
                        <div>
                          <div style="font-size: ${isA4 || isSimple ? '16px' : '12px'}; font-weight:800; color:${isSimple ? '#065f46' : '#0369a1'};">
                            ${isSimple ? 'فاکتور فروش کالا و خدمات (ساده و سریع)' : 'فروشگاه سیستم‌های امنیتی و دوربین مداربسته مهرگان'}
                          </div>
                          <div style="font-size: 9px; color: #64748b">کد اقتصادی: 411-8920-3314 | شناسه ملی: 14009871230 | تلفن: 021-66748920</div>
                        </div>
                        <div style="text-align:left; font-size:11px;">
                          <div><strong>شماره فاکتور:</strong> ${selectedInvoiceForView.invoiceNumber}</div>
                          <div><strong>تاریخ:</strong> ${selectedInvoiceForView.dateJalali}</div>
                        </div>
                      </div>

                      <div style="background:#f8fafc; padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:12px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        <div><strong>خریدار:</strong> ${selectedInvoiceForView.customerTitleFa}</div>
                        <div><strong>انبار خروج:</strong> ${selectedInvoiceForView.sourceWarehouseTitleFa}</div>
                      </div>

                      <table style="width:100%; border-collapse:collapse; margin-top:8px; margin-bottom:12px; font-size:${isA4 || isSimple ? '11px' : '9px'};">
                        <thead>
                          <tr style="background:${isSimple ? '#ecfdf5' : '#f1f5f9'}; font-weight:700;">
                            <th style="border:1px solid #cbd5e1; padding:6px; width:30px; text-align:center;">ردیف</th>
                            <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">کد کالا</th>
                            <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">شرح کالا و تجهیزات</th>
                            <th style="border:1px solid #cbd5e1; padding:6px; text-align:center;">تعداد</th>
                            <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">قیمت واحد (تومان)</th>
                            <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">جمع کل (تومان)</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${selectedInvoiceForView.lines
                            .map(
                              (l, i) => `
                            <tr>
                              <td style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${i + 1}</td>
                              <td style="border:1px solid #cbd5e1; padding:6px;">${l.itemCode || '-'}</td>
                              <td style="border:1px solid #cbd5e1; padding:6px;">
                                <strong>${l.itemTitleFa}</strong>
                                ${l.serialNumbers && l.serialNumbers.length > 0 ? `<br/><small style="color:#64748b">سریال: ${l.serialNumbers.join(', ')}</small>` : ''}
                              </td>
                              <td style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${l.quantity}</td>
                              <td style="border:1px solid #cbd5e1; padding:6px; text-align:left;">${(l.unitPriceIrr / 10).toLocaleString()}</td>
                              <td style="border:1px solid #cbd5e1; padding:6px; text-align:left;"><strong>${(l.netPriceIrr / 10).toLocaleString()}</strong></td>
                            </tr>
                          `
                            )
                            .join('')}
                        </tbody>
                      </table>

                      <div style="text-align:left; font-size:${isA4 || isSimple ? '12px' : '10px'}; font-weight:700; margin-top:10px; line-height:1.8;">
                        <div>جمع کل فاکتور: ${(selectedInvoiceForView.totalInvoiceAmountIrr / 10).toLocaleString()} تومان</div>
                        <div style="color:#047857">مبلغ پرداختی: ${(selectedInvoiceForView.paidAmountIrr / 10).toLocaleString()} تومان</div>
                        <div style="color:#e11d48">مانده بدهی: ${(selectedInvoiceForView.remainingBalanceIrr / 10).toLocaleString()} تومان</div>
                      </div>

                      <div style="margin-top:16px; text-align:center; font-size:9px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:8px;">
                        سیستم جامع حسابداری و فروش مهرگان
                      </div>
                    `;

                    downloadInvoiceHtml(
                      `فاکتور_${selectedInvoiceForView.invoiceNumber}`,
                      `فاکتور ${selectedInvoiceForView.invoiceNumber}`,
                      invHtml,
                      isThermal
                    );
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="دانلود فایل HTML کامل برای چاپ آفلاین یا ارسال به خریدار"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  دانلود فایل HTML فاکتور
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedInvoiceForView) return;
                    try {
                      const isA4 = printMode === 'A4';
                      const isSimple = printMode === 'FAST_SIMPLE';
                      const isThermal = printMode === 'POS_RECEIPT';
                      const invHtml = `
                        <div class="header" style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid ${isSimple ? '#059669' : '#0284c7'}; padding-bottom:8px; margin-bottom:12px;">
                          <div>
                            <div style="font-size: ${isA4 || isSimple ? '16px' : '12px'}; font-weight:800; color:${isSimple ? '#065f46' : '#0369a1'};">
                              ${isSimple ? 'فاکتور فروش کالا و خدمات (ساده و سریع)' : 'فروشگاه سیستم‌های امنیتی و دوربین مداربسته مهرگان'}
                            </div>
                            <div style="font-size: 9px; color: #64748b">کد اقتصادی: 411-8920-3314 | شناسه ملی: 14009871230 | تلفن: 021-66748920</div>
                          </div>
                          <div style="text-align:left; font-size:11px;">
                            <div><strong>شماره فاکتور:</strong> ${selectedInvoiceForView.invoiceNumber}</div>
                            <div><strong>تاریخ:</strong> ${selectedInvoiceForView.dateJalali}</div>
                            <div><strong>نوع:</strong> ${isSimple ? 'چاپ سریع (فاکتور ساده)' : isA4 ? 'فاکتور رسمی A4' : 'فیش حرارتی صندوق'}</div>
                          </div>
                        </div>

                        <div style="background:#f8fafc; padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:12px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                          <div><strong>خریدار:</strong> ${selectedInvoiceForView.customerTitleFa}</div>
                          <div><strong>انبار خروج:</strong> ${selectedInvoiceForView.sourceWarehouseTitleFa}</div>
                        </div>

                        <table style="width:100%; border-collapse:collapse; margin-top:8px; margin-bottom:12px; font-size:${isA4 || isSimple ? '11px' : '9px'};">
                          <thead>
                            <tr style="background:${isSimple ? '#ecfdf5' : '#f1f5f9'}; font-weight:700;">
                              <th style="border:1px solid #cbd5e1; padding:6px; width:30px; text-align:center;">ردیف</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">کد کالا</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">شرح کالا و تجهیزات</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:center;">تعداد</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">قیمت واحد (تومان)</th>
                              <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">جمع کل (تومان)</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${selectedInvoiceForView.lines
                              .map(
                                (l, i) => `
                              <tr>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${i + 1}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px;">${l.itemCode || '-'}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px;">
                                  <strong>${l.itemTitleFa}</strong>
                                  ${l.serialNumbers && l.serialNumbers.length > 0 ? `<br/><small style="color:#64748b">سریال: ${l.serialNumbers.join(', ')}</small>` : ''}
                                </td>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${l.quantity}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:left;">${(l.unitPriceIrr / 10).toLocaleString()}</td>
                                <td style="border:1px solid #cbd5e1; padding:6px; text-align:left;"><strong>${(l.netPriceIrr / 10).toLocaleString()}</strong></td>
                              </tr>
                            `
                              )
                              .join('')}
                          </tbody>
                        </table>

                        <div style="text-align:left; font-size:${isA4 || isSimple ? '12px' : '10px'}; font-weight:700; margin-top:10px; line-height:1.8;">
                          <div>جمع کل فاکتور: ${(selectedInvoiceForView.totalInvoiceAmountIrr / 10).toLocaleString()} تومان</div>
                          <div style="color:#047857">مبلغ پرداختی: ${(selectedInvoiceForView.paidAmountIrr / 10).toLocaleString()} تومان</div>
                          <div style="color:#e11d48">مانده بدهی: ${(selectedInvoiceForView.remainingBalanceIrr / 10).toLocaleString()} تومان</div>
                        </div>

                        <div style="display:flex; justify-content:space-between; margin-top:35px; padding-top:10px; border-top:1px solid #cbd5e1; text-align:center;">
                          <div style="width:45%; border:1px dashed #94a3b8; padding:12px; border-radius:6px; font-size:11px;">
                            امضا و اثر انگشت خریدار<br/><br/><br/>
                          </div>
                          <div style="width:45%; border:1px dashed #94a3b8; padding:12px; border-radius:6px; font-size:11px;">
                            امضا و مهر فروشنده<br/><br/><br/>
                          </div>
                        </div>

                        <div style="margin-top:16px; text-align:center; font-size:9px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:8px;">
                          با تشکر از خرید شما - سیستم جامع حسابداری و فروش مهرگان
                        </div>
                      `;

                      await printHtmlContent({
                        title: `فاکتور ${selectedInvoiceForView.invoiceNumber}`,
                        bodyHtml: invHtml,
                        isThermal,
                      });
                    } catch {
                      window.print();
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="چاپ با میانبر مرورگر"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  چاپ صفحه مرورگر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SERIAL PICKER MODAL FOR CART LINE */}
      {serialPickerLineIndex !== null && cartLines[serialPickerLineIndex] && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-blue-600" />
              انتخاب {cartLines[serialPickerLineIndex].quantity} شماره سریال برای «
              {cartLines[serialPickerLineIndex].itemTitleFa}»
            </h3>

            <p className="text-[11px] text-slate-500">
              سریال‌های فعال موجود در انبار انتخاب‌شده:
            </p>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 text-xs">
              {foundationData.itemSerials
                ?.filter(
                  (s) =>
                    s.itemId === cartLines[serialPickerLineIndex].itemId &&
                    s.currentWarehouseId === posWarehouseId &&
                    s.status === 'IN_STOCK'
                )
                .map((s) => {
                  const isChecked = cartLines[serialPickerLineIndex].selectedSerials.includes(
                    s.serialNumber
                  );
                  return (
                    <label
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-slate-100"
                    >
                      <span className="font-mono font-bold text-slate-800">{s.serialNumber}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const prevSerials = cartLines[serialPickerLineIndex].selectedSerials;
                          let nextSerials = [...prevSerials];
                          if (e.target.checked) {
                            if (nextSerials.length >= cartLines[serialPickerLineIndex].quantity) {
                              alert(
                                `تعداد سریال‌های انتخاب‌شده نمی‌تواند از ${cartLines[serialPickerLineIndex].quantity} بیشتر باشد.`
                              );
                              return;
                            }
                            nextSerials.push(s.serialNumber);
                          } else {
                            nextSerials = nextSerials.filter((sn) => sn !== s.serialNumber);
                          }
                          setCartLines((cart) => {
                            const updated = [...cart];
                            updated[serialPickerLineIndex].selectedSerials = nextSerials;
                            return updated;
                          });
                        }}
                        className="rounded-xs text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setSerialPickerLineIndex(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg"
            >
              تایید سریال‌های انتخاب‌شده
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReceipt}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              ثبت دریافت وجه بابت فاکتور [{showPaymentModal.invoiceNumber}]
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                مبلغ دریافتی (تومان):
              </label>
              <PriceInput
                value={receiptAmount / 10}
                onChange={(val) => setReceiptAmount(val * 10)}
                placeholder="0"
                unit="تومان"
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-extrabold text-emerald-700"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                روش پرداخت:
              </label>
              <select
                value={receiptMethod}
                onChange={(e) => setReceiptMethod(e.target.value as SalesPaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="POS">کارتخوان (POS)</option>
                <option value="CASH">نقدی</option>
                <option value="BANK_TRANSFER">حواله پایا / ساتنا</option>
                <option value="CHEQUE">چک صيادی</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>حساب بانکی / کارتخوان / صندوق مقصد:</span>
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
                  list="destination-accounts-list"
                  value={receiptBank}
                  onChange={(e) => setReceiptBank(e.target.value)}
                  placeholder="انتخاب یا تایپ نام حساب یا صندوق..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  required
                />
                <datalist id="destination-accounts-list">
                  {(foundationData.bankAccounts || []).map((b) => (
                    <option key={b.id} value={`${b.bankNameFa} (${b.accountNumber})`} />
                  ))}
                  {(foundationData.cashBoxes || []).map((c) => (
                    <option key={c.id} value={`صندوق ${c.titleFa} (${c.boxCode})`} />
                  ))}
                </datalist>
                <QuickAddButton
                  onClick={() => setQuickMasterType(receiptMethod === 'CASH' ? 'CASH_BOX' : 'BANK_ACCOUNT')}
                  title="افزودن حساب یا صندوق جدید"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
              >
                ثبت دریافت وجه
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs rounded-lg"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SALES RETURN MODAL */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReturn}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              ثبت مرجوعی کالا بابت فاکتور [{showReturnModal.invoiceNumber}]
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>انبار بازگشت کالا:</span>
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
                  value={returnWarehouseId}
                  onChange={(e) => setReturnWarehouseId(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.titleFa}
                    </option>
                  ))}
                </select>
                <QuickAddButton
                  onClick={() => setQuickMasterType('WAREHOUSE')}
                  title="افزودن سریع انبار جدید"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-3">
              <p className="text-xs font-bold text-slate-700">اقلام مرجوعی:</p>
              {returnLines.map((l, idx) => {
                const itemObj = items.find((i) => i.id === l.itemId);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs"
                  >
                    <p className="font-bold text-slate-900">{itemObj?.titleFa}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600">تعداد مرجوعی:</label>
                        <input
                          type="number"
                          value={l.quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 1;
                            setReturnLines((prev) => {
                              const updated = [...prev];
                              updated[idx].quantity = val;
                              return updated;
                            });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600">مبلغ استرداد واحد (تومان):</label>
                        <input
                          type="number"
                          value={l.unitRefundIrr / 10}
                          onChange={(e) => {
                            const val = (Number(e.target.value) || 0) * 10;
                            setReturnLines((prev) => {
                              const updated = [...prev];
                              updated[idx].unitRefundIrr = val;
                              return updated;
                            });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg"
              >
                ثبت قطعی مرجوعی و ورود به انبار
              </button>
              <button
                type="button"
                onClick={() => setShowReturnModal(null)}
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
        defaultPartyRole={quickMasterDefaultRole}
        onSuccess={(result) => {
          if (result.type === 'PARTY') {
            setPosCustomerId(result.id);
          } else if (result.type === 'WAREHOUSE') {
            setPosWarehouseId(result.id);
          } else if (result.type === 'BANK_ACCOUNT') {
            setReceiptBank(result.title);
          } else if (result.type === 'CASH_BOX') {
            setReceiptBank(`صندوق ${result.title}`);
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
        isOpen={deleteConfirmState.isOpen}
        title={deleteConfirmState.title}
        message={deleteConfirmState.message}
        details={deleteConfirmState.details}
        errorMessage={deleteConfirmState.errorMessage}
        confirmText="حذف قطعی"
        cancelText="انصراف"
        isLoading={deleteConfirmState.isLoading}
        isDestructive={true}
        onConfirm={deleteConfirmState.onConfirm}
        onClose={() => setDeleteConfirmState((prev) => ({ ...prev, isOpen: false, errorMessage: null }))}
      />
    </div>
  );
};
