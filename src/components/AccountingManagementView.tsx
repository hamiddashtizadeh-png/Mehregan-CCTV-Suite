import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Layers,
  Scale,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Lock,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  Printer,
  Download,
  FileSpreadsheet,
  X,
  Trash2,
  TrendingUp,
  Building2,
  DollarSign,
  ShieldCheck,
  Zap,
  ListTree,
  ChevronDown,
  RefreshCw,
  Upload,
  FileUp,
  Boxes,
  PieChart,
  Pencil,
  BarChart3,
  Check,
} from 'lucide-react';
import {
  FoundationDataResponse,
  AccountRecord,
  AccountingDocumentRecord,
  AccountingDocumentLine,
  AccountingDocumentStatus,
  JournalLedgerEntry,
  GeneralLedgerAccountSummary,
  TrialBalanceRow,
  FiscalYearRecord,
  AccountingPeriodRecord,
  CostCenterRecord,
  ComprehensiveProfitabilityReport,
  ProfitabilityDimensionRow,
  FixedAssetRecord,
  DepreciationEntryRecord,
  OpeningBalanceImportItem,
  OpeningBalanceBatchPayload,
} from '../types/foundation';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import { printHtmlContent } from '../utils/printUtils';
import { QuickMasterModal, QuickAddButton, QuickMasterType } from './QuickMasterModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

import { ExpensesAndIncomesView } from './ExpensesAndIncomesView';

interface AccountingManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => void;
}

type AccountingTab =
  | 'DOCUMENTS'
  | 'EXPENSES_INCOMES'
  | 'JOURNAL'
  | 'GENERAL_LEDGER'
  | 'TRIAL_BALANCE'
  | 'CHART'
  | 'AUTO_GEN'
  | 'FISCAL_PERIODS'
  | 'COST_CENTERS'
  | 'PROFITABILITY'
  | 'OPENING_BALANCE'
  | 'FIXED_ASSETS'
  | 'MANAGEMENT_REPORTS';

export const AccountingManagementView: React.FC<AccountingManagementViewProps> = ({
  foundationData,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTab>('DOCUMENTS');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [quickMasterType, setQuickMasterType] = useState<QuickMasterType | null>(null);
  const [quickMasterRole, setQuickMasterRole] = useState<'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'OTHER'>('CUSTOMER');

  // Data from state or fallback
  const accountsChart = foundationData.accountsChart || [];
  const rawDocuments = foundationData.accountingDocuments || [];
  const salesInvoices = foundationData.salesInvoices || [];
  const purchaseInvoices = foundationData.purchaseInvoices || [];
  const treasuryTransactions = foundationData.treasuryTransactions || [];
  const operationalExpenses = foundationData.operationalExpenses || [];

  // Local state for documents & reports
  const [documents, setDocuments] = useState<AccountingDocumentRecord[]>(rawDocuments);
  const [docSearch, setDocSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Reports state
  const [journalEntries, setJournalEntries] = useState<JournalLedgerEntry[]>([]);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('10101');
  const [ledgerSummary, setLedgerSummary] = useState<GeneralLedgerAccountSummary[]>([]);
  const [trialBalanceData, setTrialBalanceData] = useState<{
    rows: TrialBalanceRow[];
    totalDebitTurnoverIrr: number;
    totalCreditTurnoverIrr: number;
    totalRemainingDebitIrr: number;
    totalRemainingCreditIrr: number;
    isBalanced: boolean;
  } | null>(null);

  // Selected Doc for View / Print
  const [selectedDocForView, setSelectedDocForView] = useState<AccountingDocumentRecord | null>(null);

  // New Document Modal State
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocDateJalali, setNewDocDateJalali] = useState('1405/01/25');
  const [newDocRefNumber, setNewDocRefNumber] = useState('');
  const [newDocDescriptionFa, setNewDocDescriptionFa] = useState('');
  const [newDocLines, setNewDocLines] = useState<
    Array<{
      accountCode: string;
      accountTitleFa: string;
      detailTitleFa: string;
      debitIrr: number;
      creditIrr: number;
      descriptionFa: string;
    }>
  >([
    {
      accountCode: '10101',
      accountTitleFa: 'صندوق‌های فروشگاه و دفتر مرکزی',
      detailTitleFa: 'صندوق اصلی',
      debitIrr: 50000000,
      creditIrr: 0,
      descriptionFa: 'دریافت وجه نقد',
    },
    {
      accountCode: '10301',
      accountTitleFa: 'بدهکاران تجاری - خریداران حقیقی و پروژه‌ای',
      detailTitleFa: 'مشتری تجاری',
      debitIrr: 0,
      creditIrr: 50000000,
      descriptionFa: 'تسویه بابت فاکتور فروش',
    },
  ]);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  // New Account Modal State
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccTitleFa, setNewAccTitleFa] = useState('');
  const [newAccParentCode, setNewAccParentCode] = useState('101');
  const [newAccNature, setNewAccNature] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [newAccGroupCode, setNewAccGroupCode] = useState<'1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'>('1');
  const [newAccGroupTitleFa, setNewAccGroupTitleFa] = useState('دارایی‌های جاری');

  // Stage 10: Fiscal Years, Periods, Cost Centers, Profitability
  const fiscalYears = foundationData.fiscalYears || [];
  const accountingPeriods = foundationData.accountingPeriods || [];
  const costCenters = foundationData.costCenters || [];

  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<number>(2);
  const [isClosePeriodModalOpen, setIsClosePeriodModalOpen] = useState(false);
  const [periodToClose, setPeriodToClose] = useState<AccountingPeriodRecord | null>(null);
  const [closeNotesFa, setCloseNotesFa] = useState('');
  const [closeDateJalali, setCloseDateJalali] = useState('1405/01/31');
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [periodToReopen, setPeriodToReopen] = useState<AccountingPeriodRecord | null>(null);
  const [reopenReasonFa, setReopenReasonFa] = useState('');

  // Delete Document Modal State
  const [docToDelete, setDocToDelete] = useState<AccountingDocumentRecord | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [deleteDocError, setDeleteDocError] = useState<string | null>(null);

  // Cost Center modal state
  const [isNewCostCenterModalOpen, setIsNewCostCenterModalOpen] = useState(false);
  const [newCCCode, setNewCCCode] = useState('');
  const [newCCTitleFa, setNewCCTitleFa] = useState('');
  const [newCCManager, setNewCCManager] = useState('');
  const [newCCBudget, setNewCCBudget] = useState(1000000000);
  const [newCCDesc, setNewCCDesc] = useState('');

  // Profitability Analytics State
  const [profitabilityReport, setProfitabilityReport] = useState<ComprehensiveProfitabilityReport | null>(null);
  const [profitabilityLoading, setProfitabilityLoading] = useState(false);
  const [profitabilityDimension, setProfitabilityDimension] = useState<
    'BY_ITEM' | 'BY_CATEGORY' | 'BY_CUSTOMER' | 'BY_INSTALLER' | 'BY_PROJECT'
  >('BY_ITEM');
  const [profitabilityYearFilter, setProfitabilityYearFilter] = useState('1405');
  const [dimensionSearch, setDimensionSearch] = useState('');

  // Stage 12 & Opening Balance State
  const [openingItems, setOpeningItems] = useState<OpeningBalanceImportItem[]>([
    {
      type: 'PARTY',
      code: 'PRT-101',
      titleFa: 'شرکت مهندسی نظارت گستر (مشتری حقوقی)',
      accountCode: '10301',
      debitIrr: 125000000,
      creditIrr: 0,
      notesFa: 'مانده بدهکار فاکتورهای سال قبل',
    },
    {
      type: 'PARTY',
      code: 'PRT-102',
      titleFa: 'بازرگانی پارس هایک (تأمین‌کننده)',
      accountCode: '20101',
      debitIrr: 0,
      creditIrr: 85000000,
      notesFa: 'مانده بستانکار خریدهای قبلی',
    },
    {
      type: 'INVENTORY',
      code: 'ITM-101',
      titleFa: 'دوربین مداربسته دام IP داهوا 4MP',
      accountCode: '10401',
      debitIrr: 180000000,
      creditIrr: 0,
      qty: 10,
      unitCostIrr: 18000000,
      warehouseId: 1,
      notesFa: 'موجودی اولیه ۱۰ عدد در انبار مرکزی',
    },
    {
      type: 'BANK_CASH',
      code: 'BNK-01',
      titleFa: 'حساب جاری بانک ملی ایران (شعبه جمهوری)',
      accountCode: '10201',
      debitIrr: 350000000,
      creditIrr: 0,
      notesFa: 'موجودی بانک در شروع سال مالی',
    },
    {
      type: 'GENERAL_ACCOUNT',
      code: 'ACC-301',
      titleFa: 'سرمایه اولیه سهامداران و مالکان',
      accountCode: '30101',
      debitIrr: 0,
      creditIrr: 570000000,
      notesFa: 'حساب سرمایه اولیه ثبت‌شده',
    },
  ]);
  const [openingDateJalali, setOpeningDateJalali] = useState('1405/01/01');
  const [openingDescFa, setOpeningDescFa] = useState('سند افتتاحیه سال مالی (تأییدشده از فایل اکسل و سوابق دستی)');
  const [excelPasteText, setExcelPasteText] = useState('');
  const [isSubmittingOpening, setIsSubmittingOpening] = useState(false);

  // Simple Wizard Opening Balance Mode (ویژه غیرحسابداران)
  const [openingBalanceMode, setOpeningBalanceMode] = useState<'SIMPLE_WIZARD' | 'EXCEL_ADVANCED'>('SIMPLE_WIZARD');
  const [simpleBanks, setSimpleBanks] = useState<Array<{ id: number; titleFa: string; balanceIrr: number }>>(() =>
    (foundationData.bankAccounts || []).map((b) => ({
      id: b.id,
      titleFa: `${b.bankNameFa} (${b.accountNumber})`,
      balanceIrr: b.balanceIrr || 0,
    }))
  );
  const [simpleCashes, setSimpleCashes] = useState<Array<{ id: number; titleFa: string; balanceIrr: number }>>(() =>
    (foundationData.cashBoxes || []).map((c) => ({
      id: c.id,
      titleFa: c.titleFa,
      balanceIrr: c.balanceIrr || 0,
    }))
  );
  const [simpleParties, setSimpleParties] = useState<Array<{ partyId: number; partyTitleFa: string; type: 'DEBTOR' | 'CREDITOR'; amountIrr: number }>>([
    { partyId: 1, partyTitleFa: 'شرکت مهندسی آرمان جاوید', type: 'DEBTOR', amountIrr: 120000000 },
    { partyId: 2, partyTitleFa: 'بازرگانی سیستم‌های حفاظتی پارس', type: 'CREDITOR', amountIrr: 350000000 },
  ]);
  const [simpleInventory, setSimpleInventory] = useState<Array<{ itemId: number; itemTitleFa: string; warehouseId: number; qty: number; unitCostIrr: number }>>([
    { itemId: 1, itemTitleFa: 'دوربین مداربسته تحت شبکه 4K سونی', warehouseId: 1, qty: 15, unitCostIrr: 18500000 },
  ]);

  const [fixedAssets, setFixedAssets] = useState<FixedAssetRecord[]>(foundationData.fixedAssets || []);
  const [depreciationEntries, setDepreciationEntries] = useState<DepreciationEntryRecord[]>(foundationData.depreciationEntries || []);
  const [assetSearch, setAssetSearch] = useState('');
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [newAssetForm, setNewAssetForm] = useState({
    assetCode: '',
    titleFa: '',
    purchaseDateJalali: '1405/01/01',
    purchaseCostIrr: 150000000,
    salvageValueIrr: 10000000,
    usefulLifeYears: 5,
    depreciationMethod: 'STRAIGHT_LINE' as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
    custodianTitleFa: 'دفتر مرکزی',
    locationAddressFa: 'طبقه دوم - دفتر اداری',
  });

  const [reportTab, setReportTab] = useState<
    'SALES' | 'PURCHASES' | 'INVENTORY' | 'SERIALS' | 'PARTIES' | 'TREASURY' | 'EXPENSES' | 'GL_TRIAL' | 'PROJECTS' | 'ASSETS'
  >('SALES');
  const [reportStartDate, setReportStartDate] = useState('1404/01/01');
  const [reportEndDate, setReportEndDate] = useState('1405/12/29');
  const [reportQuery, setReportQuery] = useState('');

  // Fetch updated data from API
  const refreshAccountingData = async () => {
    try {
      const resDocs = await fetch('/api/accounting/documents');
      const docsJson = await resDocs.json();
      if (docsJson.ok && Array.isArray(docsJson.documents)) {
        setDocuments(docsJson.documents);
      }

      const resJournal = await fetch('/api/accounting/reports/journal');
      const journalJson = await resJournal.json();
      if (journalJson.ok && Array.isArray(journalJson.journal)) {
        setJournalEntries(journalJson.journal);
      }

      const resLedger = await fetch('/api/accounting/reports/ledger');
      const ledgerJson = await resLedger.json();
      if (ledgerJson.ok && Array.isArray(ledgerJson.ledger)) {
        setLedgerSummary(ledgerJson.ledger);
      }

      const resTrial = await fetch('/api/accounting/reports/trial-balance');
      const trialJson = await resTrial.json();
      if (trialJson.ok && trialJson.trialBalance) {
        setTrialBalanceData(trialJson.trialBalance);
      }
    } catch {
      // transient
    }
  };

  useEffect(() => {
    refreshAccountingData();
  }, []);

  useEffect(() => {
    if (foundationData.accountingDocuments) {
      setDocuments(foundationData.accountingDocuments);
    }
  }, [foundationData.accountingDocuments]);

  const fetchProfitability = async (yearCode = profitabilityYearFilter) => {
    setProfitabilityLoading(true);
    try {
      const res = await fetch(`/api/accounting/reports/profitability?fiscalYearCode=${yearCode}`);
      const json = await res.json();
      if (json.ok && json.report) {
        setProfitabilityReport(json.report);
      }
    } catch {
      // ignore
    } finally {
      setProfitabilityLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitability();
  }, [profitabilityYearFilter]);

  // Handle Close Period Submit
  const handleClosePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodToClose) return;

    try {
      const res = await fetch(`/api/accounting/periods/${periodToClose.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notesFa: closeNotesFa.trim() || undefined,
          closeDateJalali,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsClosePeriodModalOpen(false);
        setPeriodToClose(null);
        setCloseNotesFa('');
        onRefresh();
        refreshAccountingData();
        fetchProfitability();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در بستن دوره حسابداری.' });
    }
  };

  // Handle Reopen Period Submit
  const handleReopenPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodToReopen) return;
    if ((reopenReasonFa || '').trim().length < 5) {
      setFeedback({ type: 'error', message: 'ارائه دلیل مستند (حداقل ۵ کاراکتر) الزامی است.' });
      return;
    }

    try {
      const res = await fetch(`/api/accounting/periods/${periodToReopen.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasonFa: reopenReasonFa.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsReopenModalOpen(false);
        setPeriodToReopen(null);
        setReopenReasonFa('');
        onRefresh();
        refreshAccountingData();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در بازگشایی دوره حسابداری.' });
    }
  };

  // Handle Create Cost Center Submit
  const handleCreateCostCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCCCode.trim() || !newCCTitleFa.trim()) {
      setFeedback({ type: 'error', message: 'کد و عنوان مرکز هزینه الزامی است.' });
      return;
    }

    try {
      const res = await fetch('/api/accounting/cost-centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCCCode.trim(),
          titleFa: newCCTitleFa.trim(),
          managerNameFa: newCCManager.trim() || undefined,
          budgetIrr: Number(newCCBudget) || 0,
          descriptionFa: newCCDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsNewCostCenterModalOpen(false);
        setNewCCCode('');
        setNewCCTitleFa('');
        setNewCCManager('');
        setNewCCDesc('');
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ایجاد مرکز هزینه.' });
    }
  };

  // Calculations for New Doc Modal
  const newDocTotalDebit = useMemo(
    () => newDocLines.reduce((acc, l) => acc + (Number(l.debitIrr) || 0), 0),
    [newDocLines]
  );
  const newDocTotalCredit = useMemo(
    () => newDocLines.reduce((acc, l) => acc + (Number(l.creditIrr) || 0), 0),
    [newDocLines]
  );
  const newDocDifference = Math.abs(newDocTotalDebit - newDocTotalCredit);
  const isNewDocBalanced = newDocDifference === 0 && newDocTotalDebit > 0;

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.docNumber.toLowerCase().includes(docSearch.toLowerCase()) ||
        doc.descriptionFa.toLowerCase().includes(docSearch.toLowerCase()) ||
        (doc.referenceNumber && doc.referenceNumber.toLowerCase().includes(docSearch.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || doc.docType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [documents, docSearch, statusFilter, typeFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalDocsCount = documents.length;
    const approvedCount = documents.filter((d) => d.status === 'APPROVED').length;
    const permanentCount = documents.filter((d) => d.status === 'PERMANENT').length;
    const totalDebitTurnover = documents.reduce((acc, d) => acc + d.totalDebitIrr, 0);
    const totalCreditTurnover = documents.reduce((acc, d) => acc + d.totalCreditIrr, 0);

    return {
      totalDocsCount,
      approvedCount,
      permanentCount,
      totalDebitTurnover,
      totalCreditTurnover,
      isBalanced: totalDebitTurnover === totalCreditTurnover,
    };
  }, [documents]);

  // Auto Generator Candidates
  const autoCandidates = useMemo(() => {
    const bookedSourceDocIds = new Set(
      documents.map((d) => `${d.sourceDocType}-${d.sourceDocId}`)
    );

    const pendingSales = salesInvoices.filter(
      (inv) => !bookedSourceDocIds.has(`SALES_INVOICE-${inv.id}`)
    );
    const pendingPurchases = purchaseInvoices.filter(
      (inv) => !bookedSourceDocIds.has(`PURCHASE_INVOICE-${inv.id}`)
    );
    const pendingTreasury = treasuryTransactions.filter(
      (tx) =>
        !bookedSourceDocIds.has(`TREASURY_RECEIPT-${tx.id}`) &&
        !bookedSourceDocIds.has(`TREASURY_PAYMENT-${tx.id}`)
    );
    const pendingExpenses = operationalExpenses.filter(
      (exp) => !bookedSourceDocIds.has(`OPERATIONAL_EXPENSE-${exp.id}`)
    );

    return {
      pendingSales,
      pendingPurchases,
      pendingTreasury,
      pendingExpenses,
      totalPendingCount:
        pendingSales.length + pendingPurchases.length + pendingTreasury.length + pendingExpenses.length,
    };
  }, [documents, salesInvoices, purchaseInvoices, treasuryTransactions, operationalExpenses]);

  // Handle Create Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocDescriptionFa.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً شرح کلی سند حسابداری را وارد کنید.' });
      return;
    }
    if (!isNewDocBalanced) {
      setFeedback({
        type: 'error',
        message: 'سند حسابداری تراز نیست! جمع بدهکار و بستانکار باید کاملاً برابر و بزرگتر از صفر باشند.',
      });
      return;
    }

    setIsSubmittingDoc(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/accounting/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateJalali: newDocDateJalali,
          referenceNumber: newDocRefNumber.trim() || undefined,
          descriptionFa: newDocDescriptionFa.trim(),
          lines: newDocLines.map((l) => ({
            accountCode: l.accountCode,
            accountTitleFa: l.accountTitleFa,
            detailTitleFa: l.detailTitleFa || undefined,
            debitIrr: Number(l.debitIrr) || 0,
            creditIrr: Number(l.creditIrr) || 0,
            descriptionFa: l.descriptionFa.trim() || newDocDescriptionFa.trim(),
          })),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || 'سند حسابداری با موفقیت تراز و ثبت گردید.' });
        setIsNewDocModalOpen(false);
        setNewDocDescriptionFa('');
        setNewDocRefNumber('');
        if (data.document) {
          setDocuments((prev) => [data.document, ...prev]);
        }
        onRefresh();
        refreshAccountingData();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت سند حسابداری.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ارتباط با سرور.' });
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  // Handle Approve Document
  const handleApproveDoc = async (id: number) => {
    try {
      const res = await fetch(`/api/accounting/documents/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        onRefresh();
        refreshAccountingData();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در تایید سند.' });
    }
  };

  // Handle Permanent Lock Document
  const handlePermanentDoc = async (id: number) => {
    if (!window.confirm('آیا از قطعی کردن این سند اطمینان دارید؟ اسناد قطعی شده طبق قوانین مالیاتی قفل شده و هرگز قابل ویرایش یا حذف نیستند.')) {
      return;
    }

    try {
      const res = await fetch(`/api/accounting/documents/${id}/permanent`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        onRefresh();
        refreshAccountingData();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در قطعی کردن سند.' });
    }
  };

  // Handle Delete Document
  const handleDeleteDoc = (doc: AccountingDocumentRecord) => {
    if (doc.status === 'PERMANENT') {
      setFeedback({ type: 'error', message: 'سند قطعی شده طبق قوانین حسابداری قابل حذف مستقیم نیست.' });
      return;
    }
    setDeleteDocError(null);
    setDocToDelete(doc);
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    setDeleteDocError(null);
    try {
      const res = await fetch(`/api/accounting/documents/${docToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || `سند ${docToDelete.docNumber} با موفقیت حذف گردید.` });
        setDocToDelete(null);
        setDeleteDocError(null);
        onRefresh();
        refreshAccountingData();
      } else {
        const msg = data.messageFa || 'امکان حذف سند حسابداری وجود ندارد.';
        setDeleteDocError(msg);
        setFeedback({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'خطا در برقراری ارتباط با سرور هنگام حذف سند.';
      setDeleteDocError(msg);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Handle Auto-generate
  const handleAutoGenerate = async (sourceDocType: string, sourceDocId: number) => {
    try {
      const res = await fetch('/api/accounting/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceDocType, sourceDocId }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        onRefresh();
        refreshAccountingData();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در صدور اتوماتیک سند.' });
    }
  };

  // Handle Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode.trim() || !newAccTitleFa.trim()) {
      setFeedback({ type: 'error', message: 'کد و عنوان حساب الزامی هستند.' });
      return;
    }

    try {
      const res = await fetch('/api/accounting/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newAccCode.trim(),
          titleFa: newAccTitleFa.trim(),
          level: 'SUBSIDIARY',
          parentCode: newAccParentCode,
          nature: newAccNature,
          groupCode: newAccGroupCode,
          groupTitleFa: newAccGroupTitleFa,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsNewAccountModalOpen(false);
        setNewAccCode('');
        setNewAccTitleFa('');
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در تعریف حساب.' });
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* HEADER & TOP BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              سیستم حسابداری دوطرفه، دفاتر مالی و ترازنامه (مرحله ۹)
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-800 rounded-full border border-purple-300">
                Double-Entry Accounting
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              مدیریت سرفصل‌های کدینگ، ثبت اسناد حسابداری، کنترل تراز بدهکار و بستانکار، دفاتر روزنامه و کل، تراز آزمایشی ۲ و ۴ ستونی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewDocModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            ثبت سند حسابداری جدید
          </button>

          <button
            type="button"
            onClick={() => refreshAccountingData()}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="به‌روزرسانی اطلاعات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
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

      {/* METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>تعداد کل اسناد</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{metrics.totalDocsCount}</p>
          <p className="text-[10px] text-slate-400">
            {metrics.approvedCount} تایید شده | {metrics.permanentCount} قطعی
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>گردش کل بدهکار</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-emerald-700">
            {(metrics.totalDebitTurnover / 10).toLocaleString()}{' '}
            <span className="text-[10px] font-normal">تومان</span>
          </p>
          <p className="text-[10px] text-emerald-600">جمع کل آرتیکل‌های بدهکار</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>گردش کل بستانکار</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-black text-blue-700">
            {(metrics.totalCreditTurnover / 10).toLocaleString()}{' '}
            <span className="text-[10px] font-normal">تومان</span>
          </p>
          <p className="text-[10px] text-blue-600">جمع کل آرتیکل‌های بستانکار</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>وضعیت تراز دفاتر</span>
            <Scale className={`w-4 h-4 ${metrics.isBalanced ? 'text-emerald-600' : 'text-rose-600'}`} />
          </div>
          <p
            className={`text-sm font-black flex items-center gap-1.5 ${
              metrics.isBalanced ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {metrics.isBalanced ? (
              <>
                <CheckCircle className="w-4 h-4" /> تراز کامل ۱۰۰٪
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" /> نامتراز
              </>
            )}
          </p>
          <p className="text-[10px] text-slate-400">
            اختلاف تراز: {(Math.abs(metrics.totalDebitTurnover - metrics.totalCreditTurnover) / 10).toLocaleString()} تومان
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>اسناد معوق در صف صدور</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600">{autoCandidates.totalPendingCount}</p>
          <p className="text-[10px] text-slate-400">
            رویدادهای تجاری نیازمند سند اتوماتیک
          </p>
        </div>
      </div>

      {/* WORKSPACE NAVIGATION TABS - CATEGORIZED GROUPS */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-bold">
          {/* Group 1: اسناد و کدینگ */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] font-black text-slate-500 px-1 block">۱. اسناد و کدینگ مالی</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('DOCUMENTS')}
                className={`flex-1 min-w-[100px] px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'DOCUMENTS' ? 'bg-purple-600 text-white shadow-xs font-black' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                اسناد ({documents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CHART')}
                className={`flex-1 min-w-[100px] px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'CHART' ? 'bg-purple-600 text-white shadow-xs font-black' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                کدینگ ({accountsChart.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AUTO_GEN')}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'AUTO_GEN' ? 'bg-amber-600 text-white shadow-xs font-black' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                صدور خودکار ({autoCandidates.totalPendingCount})
              </button>
            </div>
          </div>

          {/* Group 2: دفاتر و تراز مالی */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] font-black text-slate-500 px-1 block">۲. دفاتر و ترازهای مالی</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('JOURNAL')}
                className={`flex-1 min-w-[85px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'JOURNAL' ? 'bg-purple-600 text-white shadow-xs font-black' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                روزنامه
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('GENERAL_LEDGER')}
                className={`flex-1 min-w-[85px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'GENERAL_LEDGER' ? 'bg-purple-600 text-white shadow-xs font-black' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                دفتر کل
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TRIAL_BALANCE')}
                className={`flex-1 min-w-[85px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'TRIAL_BALANCE' ? 'bg-purple-600 text-white shadow-xs font-black' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                تراز
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('OPENING_BALANCE')}
                className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'OPENING_BALANCE' ? 'bg-blue-600 text-white shadow-xs font-black' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                سند افتتاحیه / اکسل
              </button>
            </div>
          </div>

          {/* Group 3: هزینه‌ها و دارایی‌ها */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] font-black text-slate-500 px-1 block">۳. هزینه‌ها و دارایی‌ها</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('EXPENSES_INCOMES')}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'EXPENSES_INCOMES' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                مدیریت هزینه‌ها و درآمدها
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COST_CENTERS')}
                className={`flex-1 min-w-[90px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'COST_CENTERS' ? 'bg-purple-600 text-white shadow-xs font-black' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                مراکز هزینه
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FIXED_ASSETS')}
                className={`flex-1 min-w-[90px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'FIXED_ASSETS' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                دارایی ثابت
              </button>
            </div>
          </div>

          {/* Group 4: تحلیل و گزارشات */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] font-black text-slate-500 px-1 block">۴. تحلیل و گزارشات مدیریتی</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('PROFITABILITY');
                  fetchProfitability();
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'PROFITABILITY' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                تحلیل سودآوری چندبعدی
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FISCAL_PERIODS')}
                className={`flex-1 min-w-[90px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'FISCAL_PERIODS' ? 'bg-purple-600 text-white shadow-xs font-black' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                سال مالی
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MANAGEMENT_REPORTS')}
                className={`flex-1 min-w-[90px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'MANAGEMENT_REPORTS' ? 'bg-purple-700 text-white shadow-xs font-black' : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                گزارش‌های جامع
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACCOUNTING DOCUMENTS LIST (اسناد حسابداری) */}
      {/* ========================================================================= */}
      {activeTab === 'DOCUMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در شماره سند، شرح یا عطف..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="DRAFT">پیش‌نویس (DRAFT)</option>
                <option value="APPROVED">تایید شده (APPROVED)</option>
                <option value="PERMANENT">قطعی / قفل‌شده (PERMANENT)</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="ALL">همه انواع سند</option>
                <option value="MANUAL">سند دستی (MANUAL)</option>
                <option value="AUTO">سند سیستمی / خودکار (AUTO)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const exportRows = filteredDocuments.map((d) => ({
                    docNumber: d.docNumber,
                    referenceNumber: d.referenceNumber || '-',
                    dateJalali: d.dateJalali,
                    docType: d.docType === 'MANUAL' ? 'دستی' : 'اتوماتیک',
                    descriptionFa: d.descriptionFa,
                    totalDebitToman: (d.totalDebitIrr / 10).toLocaleString(),
                    totalCreditToman: (d.totalCreditIrr / 10).toLocaleString(),
                    status: d.status === 'PERMANENT' ? 'قطعی' : d.status === 'APPROVED' ? 'تایید شده' : 'پیش‌نویس',
                    creator: d.createdByName,
                  }));

                  exportToExcel(
                    `اسناد_حسابداری_${Date.now()}`,
                    'اسناد حسابداری',
                    [
                      { header: 'شماره سند', key: 'docNumber', width: 16 },
                      { header: 'شماره عطف', key: 'referenceNumber', width: 14 },
                      { header: 'تاریخ سند', key: 'dateJalali', width: 14 },
                      { header: 'نوع', key: 'docType', width: 12 },
                      { header: 'شرح کلی سند', key: 'descriptionFa', width: 36 },
                      { header: 'بدهکار (تومان)', key: 'totalDebitToman', width: 18 },
                      { header: 'بستانکار (تومان)', key: 'totalCreditToman', width: 18 },
                      { header: 'وضعیت', key: 'status', width: 14 },
                      { header: 'ثبت‌کننده', key: 'creator', width: 16 },
                    ],
                    exportRows
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="خروجی اکسل از اسناد حسابداری"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                خروجی اکسل
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportRows = filteredDocuments.map((d) => ({
                    docNumber: d.docNumber,
                    dateJalali: d.dateJalali,
                    descriptionFa: d.descriptionFa,
                    amountToman: `${(d.totalDebitIrr / 10).toLocaleString()} تومان`,
                    status: d.status === 'PERMANENT' ? 'قطعی' : d.status === 'APPROVED' ? 'تایید شده' : 'پیش‌نویس',
                  }));

                  exportToPdf(
                    'فهرست رسمی اسناد حسابداری سال مالی ۱۴۰۵',
                    [
                      { header: 'شماره سند', key: 'docNumber' },
                      { header: 'تاریخ', key: 'dateJalali' },
                      { header: 'شرح سند', key: 'descriptionFa' },
                      { header: 'مبلغ تراز شده', key: 'amountToman' },
                      { header: 'وضعیت سند', key: 'status' },
                    ],
                    exportRows,
                    {
                      docNumber: `REP-DOCS-${Date.now().toString().slice(-6)}`,
                      summaryFa: `تعداد اسناد: ${filteredDocuments.length} فقره | مجموع گردش تراز: ${(metrics.totalDebitTurnover / 10).toLocaleString()} تومان`,
                    }
                  );
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="خروجی PDF اسناد حسابداری"
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
                  <th className="px-3.5 py-3">شماره سند</th>
                  <th className="px-3.5 py-3">تاریخ</th>
                  <th className="px-3.5 py-3">نوع سند</th>
                  <th className="px-3.5 py-3">شرح کلی سند</th>
                  <th className="px-3.5 py-3">تعداد ردیف</th>
                  <th className="px-3.5 py-3">جمع بدهکار (تومان)</th>
                  <th className="px-3.5 py-3">جمع بستانکار (تومان)</th>
                  <th className="px-3.5 py-3 text-center">تراز</th>
                  <th className="px-3.5 py-3">وضعیت</th>
                  <th className="px-3.5 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      هیچ سند حسابداری با معیارهای انتخابی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isBalanced = doc.totalDebitIrr === doc.totalCreditIrr;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-purple-700">
                          {doc.docNumber}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-600">{doc.dateJalali}</td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              doc.docType === 'MANUAL'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {doc.docType === 'MANUAL' ? 'دستی' : 'سیستمی'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 max-w-xs truncate" title={doc.descriptionFa}>
                          {doc.descriptionFa}
                        </td>
                        <td className="px-3.5 py-3 text-center font-bold text-slate-500">
                          {doc.lines.length}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-slate-900">
                          {(doc.totalDebitIrr / 10).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-slate-900">
                          {(doc.totalCreditIrr / 10).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {isBalanced ? (
                            <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5" /> تراز
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center justify-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5" /> نامتراز
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          {doc.status === 'PERMANENT' ? (
                            <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-extrabold rounded-md flex items-center gap-1 w-fit shadow-xs">
                              <Lock className="w-3 h-3" /> قطعی
                            </span>
                          ) : doc.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1 w-fit border border-emerald-300">
                              <CheckCircle className="w-3 h-3" /> تایید شده
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1 w-fit border border-amber-300">
                              <Clock className="w-3 h-3" /> پیش‌نویس
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDocForView(doc)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                              title="مشاهده آرتیکل‌های سند"
                            >
                              مشاهده
                            </button>

                            {doc.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleApproveDoc(doc.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                                title="تایید سند"
                              >
                                تایید
                              </button>
                            )}

                            {doc.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handlePermanentDoc(doc.id)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                                title="قطعی کردن و بستن سند"
                              >
                                قطعی‌سازی
                              </button>
                            )}

                            {doc.status !== 'PERMANENT' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="حذف سند حسابداری"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'EXPENSES_INCOMES' && (
        <ExpensesAndIncomesView
          expenses={foundationData.operationalExpenses || []}
          incomes={foundationData.operationalIncomes || []}
          bankAccounts={foundationData.bankAccounts || []}
          cashBoxes={foundationData.cashBoxes || []}
          onRefresh={onRefresh}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: JOURNAL LEDGER (دفتر روزنامه) */}
      {/* ========================================================================= */}
      {activeTab === 'JOURNAL' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-600" />
                دفتر روزنامه رسمی (Journal Ledger)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ثبت زمانی و کرونولوژیک کلیه رویدادهای مالی تایید شده به ترتیب تاریخ و شماره سند
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const exportRows = journalEntries.map((j) => ({
                    docNumber: j.docNumber,
                    dateJalali: j.dateJalali,
                    accountCode: j.accountCode,
                    accountTitleFa: j.accountTitleFa,
                    detail: j.detailTitleFa || '-',
                    descriptionFa: j.descriptionFa,
                    debitToman: j.debitIrr > 0 ? (j.debitIrr / 10).toLocaleString() : '',
                    creditToman: j.creditIrr > 0 ? (j.creditIrr / 10).toLocaleString() : '',
                  }));

                  exportToExcel(
                    `دفتر_روزنامه_${Date.now()}`,
                    'دفتر روزنامه',
                    [
                      { header: 'شماره سند', key: 'docNumber', width: 16 },
                      { header: 'تاریخ', key: 'dateJalali', width: 14 },
                      { header: 'کد حساب', key: 'accountCode', width: 14 },
                      { header: 'عنوان حساب', key: 'accountTitleFa', width: 28 },
                      { header: 'تفصیلی', key: 'detail', width: 20 },
                      { header: 'شرح آرتیکل', key: 'descriptionFa', width: 34 },
                      { header: 'بدهکار (تومان)', key: 'debitToman', width: 18 },
                      { header: 'بستانکار (تومان)', key: 'creditToman', width: 18 },
                    ],
                    exportRows
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                خروجی اکسل دفتر روزنامه
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportRows = journalEntries.map((j) => ({
                    docNumber: j.docNumber,
                    dateJalali: j.dateJalali,
                    accountTitleFa: j.accountTitleFa,
                    descriptionFa: j.descriptionFa,
                    debitToman: j.debitIrr > 0 ? `${(j.debitIrr / 10).toLocaleString()} ت` : '-',
                    creditToman: j.creditIrr > 0 ? `${(j.creditIrr / 10).toLocaleString()} ت` : '-',
                  }));

                  exportToPdf(
                    'دفتر روزنامه رسمی سال مالی ۱۴۰۵',
                    [
                      { header: 'سند', key: 'docNumber' },
                      { header: 'تاریخ', key: 'dateJalali' },
                      { header: 'سرفصل حسابداری', key: 'accountTitleFa' },
                      { header: 'شرح تراکنش', key: 'descriptionFa' },
                      { header: 'بدهکار', key: 'debitToman' },
                      { header: 'بستانکار', key: 'creditToman' },
                    ],
                    exportRows,
                    {
                      docNumber: 'JRN-1405-OFFICIAL',
                      summaryFa: `تعداد کل سطرهای دفتر روزنامه: ${journalEntries.length} ردیف`,
                    }
                  );
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
                  <th className="px-3 py-2.5 text-center">ردیف</th>
                  <th className="px-3 py-2.5">شماره سند</th>
                  <th className="px-3 py-2.5">تاریخ</th>
                  <th className="px-3 py-2.5">کد حساب</th>
                  <th className="px-3 py-2.5">سرفصل حساب</th>
                  <th className="px-3 py-2.5">طرف حساب / تفصیلی</th>
                  <th className="px-3 py-2.5">شرح آرتیکل</th>
                  <th className="px-3 py-2.5 text-left text-emerald-800">بدهکار (تومان)</th>
                  <th className="px-3 py-2.5 text-left text-blue-800">بستانکار (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {journalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                      دفتر روزنامه خالی است.
                    </td>
                  </tr>
                ) : (
                  journalEntries.map((j, idx) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-bold text-purple-700">{j.docNumber}</td>
                      <td className="px-3 py-2.5 text-slate-600">{j.dateJalali}</td>
                      <td className="px-3 py-2.5 text-slate-500">{j.accountCode}</td>
                      <td className="px-3 py-2.5 font-sans font-bold text-slate-800">
                        {j.accountTitleFa}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-slate-600">
                        {j.detailTitleFa || '-'}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-slate-700 max-w-xs truncate">
                        {j.descriptionFa}
                      </td>
                      <td className="px-3 py-2.5 text-left font-bold text-emerald-700">
                        {j.debitIrr > 0 ? (j.debitIrr / 10).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-left font-bold text-blue-700">
                        {j.creditIrr > 0 ? (j.creditIrr / 10).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GENERAL LEDGER (دفتر کل و معین) */}
      {/* ========================================================================= */}
      {activeTab === 'GENERAL_LEDGER' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">انتخاب حساب معین جهت مشاهده دفتر:</label>
              <select
                value={selectedLedgerAccount}
                onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none"
              >
                {accountsChart
                  .filter((a) => a.level === 'SUBSIDIARY')
                  .map((a) => (
                    <option key={a.code} value={a.code}>
                      [{a.code}] {a.titleFa} ({a.nature === 'DEBIT' ? 'ماهیت بدهکار' : 'ماهیت بستانکار'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = ledgerSummary.find((s) => s.accountCode === selectedLedgerAccount);
                  if (!target) return;

                  const exportRows = target.entries.map((e) => ({
                    docNumber: e.docNumber,
                    dateJalali: e.dateJalali,
                    descriptionFa: e.descriptionFa,
                    debitToman: e.debitIrr > 0 ? (e.debitIrr / 10).toLocaleString() : '',
                    creditToman: e.creditIrr > 0 ? (e.creditIrr / 10).toLocaleString() : '',
                    runningBalanceToman: (e.runningBalanceIrr / 10).toLocaleString(),
                    balanceSide: e.balanceSide,
                  }));

                  exportToExcel(
                    `دفتر_معین_${target.accountCode}`,
                    `دفتر معین ${target.accountCode}`,
                    [
                      { header: 'شماره سند', key: 'docNumber', width: 16 },
                      { header: 'تاریخ', key: 'dateJalali', width: 14 },
                      { header: 'شرح سند', key: 'descriptionFa', width: 36 },
                      { header: 'بدهکار (تومان)', key: 'debitToman', width: 18 },
                      { header: 'بستانکار (تومان)', key: 'creditToman', width: 18 },
                      { header: 'مانده تجمعی (تومان)', key: 'runningBalanceToman', width: 20 },
                      { header: 'تشخیص', key: 'balanceSide', width: 14 },
                    ],
                    exportRows
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                خروجی اکسل این سرفصل
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          {(() => {
            const currentSummary = ledgerSummary.find((s) => s.accountCode === selectedLedgerAccount);
            if (!currentSummary) {
              return (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  برای این حساب تراکنشی در دوره جاری ثبت نشده است.
                </div>
              );
            }

            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center text-xs font-bold">
                  <div>
                    <span className="text-purple-800 text-sm">
                      [{currentSummary.accountCode}] {currentSummary.accountTitleFa}
                    </span>
                    <span className="text-slate-500 mr-2">
                      (ماهیت حساب: {currentSummary.nature === 'DEBIT' ? 'بدهکار' : 'بستانکار'})
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span>
                      گردش بدهکار: {(currentSummary.totalDebitIrr / 10).toLocaleString()} تومان
                    </span>
                    <span>
                      گردش بستانکار: {(currentSummary.totalCreditIrr / 10).toLocaleString()} تومان
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-lg border border-purple-200">
                      مانده نهایی: {(currentSummary.netBalanceIrr / 10).toLocaleString()} تومان (
                      {currentSummary.balanceSide === 'DEBIT'
                        ? 'بدهکار'
                        : currentSummary.balanceSide === 'CREDIT'
                        ? 'بستانکار'
                        : 'تسویه'}
                      )
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center">ردیف</th>
                        <th className="px-3 py-2.5">شماره سند</th>
                        <th className="px-3 py-2.5">تاریخ</th>
                        <th className="px-3 py-2.5">شرح آرتیکل</th>
                        <th className="px-3 py-2.5 text-left text-emerald-800">بدهکار (تومان)</th>
                        <th className="px-3 py-2.5 text-left text-blue-800">بستانکار (تومان)</th>
                        <th className="px-3 py-2.5 text-left text-purple-900">مانده تجمعی (تومان)</th>
                        <th className="px-3 py-2.5 text-center">تشخیص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {currentSummary.entries.map((e, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-purple-700">{e.docNumber}</td>
                          <td className="px-3 py-2.5 text-slate-600">{e.dateJalali}</td>
                          <td className="px-3 py-2.5 font-sans text-slate-700">{e.descriptionFa}</td>
                          <td className="px-3 py-2.5 text-left font-bold text-emerald-700">
                            {e.debitIrr > 0 ? (e.debitIrr / 10).toLocaleString() : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-left font-bold text-blue-700">
                            {e.creditIrr > 0 ? (e.creditIrr / 10).toLocaleString() : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-left font-black text-purple-900">
                            {(e.runningBalanceIrr / 10).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-center font-sans font-bold text-slate-600">
                            {e.balanceSide}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRIAL BALANCE (تراز آزمایشی ۲ و ۴ ستونی) */}
      {/* ========================================================================= */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-600" />
                تراز آزمایشی گردش حساب‌ها (Trial Balance - 4 Columns)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                بررسی تراز گردش بدهکار/بستانکار و مانده‌های پایان دوره حساب‌های معین
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!trialBalanceData) return;
                  const exportRows = trialBalanceData.rows.map((r) => ({
                    code: r.accountCode,
                    titleFa: r.accountTitleFa,
                    group: r.groupTitleFa,
                    debitTurnoverToman: (r.totalDebitIrr / 10).toLocaleString(),
                    creditTurnoverToman: (r.totalCreditIrr / 10).toLocaleString(),
                    remDebitToman: (r.remainingDebitIrr / 10).toLocaleString(),
                    remCreditToman: (r.remainingCreditIrr / 10).toLocaleString(),
                  }));

                  exportToExcel(
                    `تراز_آزمایشی_${Date.now()}`,
                    'تراز آزمایشی ۴ ستونی',
                    [
                      { header: 'کد حساب', key: 'code', width: 14 },
                      { header: 'سرفصل معین', key: 'titleFa', width: 32 },
                      { header: 'طبقه حساب', key: 'group', width: 20 },
                      { header: 'گردش بدهکار (تومان)', key: 'debitTurnoverToman', width: 20 },
                      { header: 'گردش بستانکار (تومان)', key: 'creditTurnoverToman', width: 20 },
                      { header: 'مانده بدهکار (تومان)', key: 'remDebitToman', width: 20 },
                      { header: 'مانده بستانکار (تومان)', key: 'remCreditToman', width: 20 },
                    ],
                    exportRows
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                خروجی اکسل تراز آزمایشی
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!trialBalanceData) return;
                  const exportRows = trialBalanceData.rows.map((r) => ({
                    code: r.accountCode,
                    titleFa: r.accountTitleFa,
                    debitTurnoverToman: `${(r.totalDebitIrr / 10).toLocaleString()} ت`,
                    creditTurnoverToman: `${(r.totalCreditIrr / 10).toLocaleString()} ت`,
                    remDebitToman: r.remainingDebitIrr > 0 ? `${(r.remainingDebitIrr / 10).toLocaleString()} ت` : '-',
                    remCreditToman: r.remainingCreditIrr > 0 ? `${(r.remainingCreditIrr / 10).toLocaleString()} ت` : '-',
                  }));

                  exportToPdf(
                    'تراز آزمایشی ۴ ستونی رسمی سال مالی ۱۴۰۵',
                    [
                      { header: 'کد حساب', key: 'code' },
                      { header: 'شرح حساب معین', key: 'titleFa' },
                      { header: 'گردش بدهکار', key: 'debitTurnoverToman' },
                      { header: 'گردش بستانکار', key: 'creditTurnoverToman' },
                      { header: 'مانده بدهکار', key: 'remDebitToman' },
                      { header: 'مانده بستانکار', key: 'remCreditToman' },
                    ],
                    exportRows,
                    {
                      docNumber: 'TRB-1405-OFFICIAL',
                      summaryFa: `مجموع گردش دفاتر: ${(trialBalanceData.totalDebitTurnoverIrr / 10).toLocaleString()} تومان | وضعیت: ${trialBalanceData.isBalanced ? 'کاملاً تراز' : 'نامتراز'}`,
                    }
                  );
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                خروجی PDF تراز
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="px-3 py-2 text-center border-l border-slate-200">
                    کد
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-l border-slate-200">
                    عنوان سرفصل حسابداری
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-l border-slate-200">
                    طبقه / گروه
                  </th>
                  <th colSpan={2} className="px-3 py-2 text-center border-l border-slate-200 bg-purple-50 text-purple-900">
                    گردش طی دوره (تومان)
                  </th>
                  <th colSpan={2} className="px-3 py-2 text-center bg-slate-50 text-slate-900">
                    مانده پایان دوره (تومان)
                  </th>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-100 text-[11px]">
                  <th className="px-3 py-1.5 text-left border-l border-slate-200 text-emerald-800">
                    بدهکار
                  </th>
                  <th className="px-3 py-1.5 text-left border-l border-slate-200 text-blue-800">
                    بستانکار
                  </th>
                  <th className="px-3 py-1.5 text-left border-l border-slate-200 text-emerald-800">
                    بدهکار
                  </th>
                  <th className="px-3 py-1.5 text-left text-blue-800">
                    بستانکار
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {!trialBalanceData ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                      در حال دریافت تراز آزمایشی...
                    </td>
                  </tr>
                ) : (
                  trialBalanceData.rows.map((row) => (
                    <tr key={row.accountCode} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center text-purple-700 font-bold border-l border-slate-100">
                        {row.accountCode}
                      </td>
                      <td className="px-3 py-2.5 font-sans font-bold text-slate-800 border-l border-slate-100">
                        {row.accountTitleFa}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-slate-500 border-l border-slate-100 text-[11px]">
                        {row.groupTitleFa}
                      </td>
                      <td className="px-3 py-2.5 text-left text-emerald-700 border-l border-slate-100 font-bold">
                        {row.totalDebitIrr > 0 ? (row.totalDebitIrr / 10).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-left text-blue-700 border-l border-slate-100 font-bold">
                        {row.totalCreditIrr > 0 ? (row.totalCreditIrr / 10).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-left text-emerald-800 border-l border-slate-100 font-black">
                        {row.remainingDebitIrr > 0 ? (row.remainingDebitIrr / 10).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-left text-blue-800 font-black">
                        {row.remainingCreditIrr > 0 ? (row.remainingCreditIrr / 10).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {trialBalanceData && (
                <tfoot className="bg-slate-200/80 font-mono font-black text-xs border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center font-sans text-slate-800">
                      جمع کل تراز آزمایشی:
                    </td>
                    <td className="px-3 py-3 text-left text-emerald-800">
                      {(trialBalanceData.totalDebitTurnoverIrr / 10).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-left text-blue-800">
                      {(trialBalanceData.totalCreditTurnoverIrr / 10).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-left text-emerald-900">
                      {(trialBalanceData.totalRemainingDebitIrr / 10).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-left text-blue-900">
                      {(trialBalanceData.totalRemainingCreditIrr / 10).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CHART OF ACCOUNTS (کدینگ و درختواره حساب‌ها) */}
      {/* ========================================================================= */}
      {activeTab === 'CHART' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ListTree className="w-4 h-4 text-purple-600" />
                درختواره کدینگ سرفصل‌های حسابداری مهرگان
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                سرفصل‌های ۳ سطحی استاندارد: گروه (۱ رقمی) ➔ کل (۳ رقمی) ➔ معین (۵ رقمی) با تعیین ماهیت
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsNewAccountModalOpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              تعریف سرفصل معین جدید
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['1', '2', '3', '5', '6', '7', '8'].map((groupCode) => {
              const groupAcc = accountsChart.find((a) => a.code === groupCode);
              const groupTitle = groupAcc?.titleFa || `گروه ${groupCode}`;
              const childAccounts = accountsChart.filter(
                (a) => a.groupCode === groupCode && a.level !== 'GROUP'
              );

              return (
                <div
                  key={groupCode}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-xs text-purple-900 flex items-center gap-1">
                      <span className="font-mono text-purple-600">[{groupCode}]</span> {groupTitle}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                      {childAccounts.length} حساب
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {childAccounts.map((acc) => (
                      <div
                        key={acc.code}
                        className={`p-2 rounded-lg text-xs flex justify-between items-center ${
                          acc.level === 'GENERAL'
                            ? 'bg-purple-50/80 border border-purple-200 font-bold text-purple-950'
                            : 'bg-white border border-slate-200 font-medium text-slate-800 pr-4'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-500">[{acc.code}]</span>
                          <span>{acc.titleFa}</span>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            acc.nature === 'DEBIT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {acc.nature === 'DEBIT' ? 'بدهکار' : 'بستانکار'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AUTO GENERATOR WIZARD (صدور خودکار اسناد حسابداری) */}
      {/* ========================================================================= */}
      {activeTab === 'AUTO_GEN' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              مبدل خودکار رویدادهای بازرگانی به اسناد حسابداری دوطرفه (Auto Voucher Generator)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تبدیل هوشمند فاکتورهای فروش، خرید، دریافت و پرداخت خزانه و هزینه‌های عملیاتی به سند رسمی حسابداری بر اساس سرفصل‌های کدینگ با تضمین عدم ثبت دوباره (Idempotency Guard).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Pending Sales Invoices */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  فاکتورهای فروش در انتظار سند ({autoCandidates.pendingSales.length})
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {autoCandidates.pendingSales.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 text-center">
                    تمامی فاکتورهای فروش سند حسابداری دارند.
                  </p>
                ) : (
                  autoCandidates.pendingSales.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{inv.invoiceNumber} - {inv.customerTitleFa}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {inv.dateJalali} | مبلغ: {(inv.totalInvoiceAmountIrr / 10).toLocaleString()} تومان
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAutoGenerate('SALES_INVOICE', inv.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        صدور سند
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Pending Purchase Invoices */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  فاکتورهای خرید در انتظار سند ({autoCandidates.pendingPurchases.length})
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {autoCandidates.pendingPurchases.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 text-center">
                    تمامی فاکتورهای خرید سند حسابداری دارند.
                  </p>
                ) : (
                  autoCandidates.pendingPurchases.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{inv.invoiceNumber} - {inv.supplierTitleFa}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {inv.dateJalali} | مبلغ: {(inv.totalInventoryValuationIrr / 10).toLocaleString()} تومان
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAutoGenerate('PURCHASE_INVOICE', inv.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        صدور سند
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Pending Treasury Transactions */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  تراکنش‌های خزانه در انتظار سند ({autoCandidates.pendingTreasury.length})
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {autoCandidates.pendingTreasury.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 text-center">
                    تمامی تراکنش‌های خزانه سند حسابداری دارند.
                  </p>
                ) : (
                  autoCandidates.pendingTreasury.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {tx.txNumber} ({tx.txType === 'RECEIPT' ? 'دریافت' : 'پرداخت'}) - {tx.partyNameFa || 'طرف‌حساب'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {tx.dateJalali} | مبلغ: {(tx.amountIrr / 10).toLocaleString()} تومان
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAutoGenerate(tx.txType === 'RECEIPT' ? 'TREASURY_RECEIPT' : 'TREASURY_PAYMENT', tx.id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        صدور سند
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Pending Operational Expenses */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-rose-600" />
                  هزینه‌های عملیاتی در انتظار سند ({autoCandidates.pendingExpenses.length})
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {autoCandidates.pendingExpenses.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 text-center">
                    تمامی هزینه‌های جاری سند حسابداری دارند.
                  </p>
                ) : (
                  autoCandidates.pendingExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{exp.expenseCode} - {exp.titleFa}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {exp.dateJalali} | مبلغ: {(exp.amountIrr / 10).toLocaleString()} تومان
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAutoGenerate('OPERATIONAL_EXPENSE', exp.id)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        صدور سند
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: FISCAL YEARS & ACCOUNTING PERIODS CLOSING (سال و دوره‌های مالی) */}
      {/* ========================================================================= */}
      {activeTab === 'FISCAL_PERIODS' && (
        <div className="space-y-6">
          {/* Rules & Policy Banner */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-5 text-xs text-purple-950 space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>قواعد حاکمیت مالی، کنترل تاریخ اسناد و بستن دوره (مرحله ۱۰)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pr-2">
              <li>
                <strong>کنترل تاریخ اسناد:</strong> ثبت یا ویرایش هرگونه سند حسابداری منوط به تطابق تاریخ با سال مالی معتبر و عدم بسته‌بودن دوره است.
              </li>
              <li>
                <strong>بستن امن دوره (Zero Data Mutation):</strong> بستن دوره به هیچ عنوان سوابق قبلی را حذف یا بی‌صدا تغییر نمی‌دهد؛ بلکه با صدور سند رسمی اختتامیه حساب‌های موقت، سود و زیان را به تراز حقوق صاحبان سرمایه انتقال می‌دهد.
              </li>
              <li>
                <strong>بازگشایی مجوزمحور:</strong> هرگونه اصلاح اسناد پس از بستن، مستلزم بازگشایی رسمی دوره با ارائه شرح دلیل مستند و ثبت غیرقابل حذف در لاگ ممیزی است.
              </li>
            </ul>
          </div>

          {/* Fiscal Years List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                سال‌های مالی تعریف‌شده در سیستم
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fiscalYears.map((fy) => (
                <div
                  key={fy.id}
                  onClick={() => setSelectedFiscalYearId(fy.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedFiscalYearId === fy.id
                      ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-2 ring-purple-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        {fy.titleFa}
                        {fy.isDefault && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-600 text-white rounded">
                            سال پیش‌فرض
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        بازه مالی: {fy.startDateJalali} الی {fy.endDateJalali}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg ${
                        fy.status === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {fy.status === 'OPEN' ? 'باز (OPEN)' : 'بسته‌شده (CLOSED)'}
                    </span>
                  </div>

                  {fy.closedAt && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-0.5">
                      <p>سند اختتامیه نهایی: <span className="font-mono font-bold text-purple-700">{fy.closingDocNumber || 'ثبت شده'}</span></p>
                      <p>بسته‌شده توسط: {fy.closedByNameFa || 'مدیر ارشد'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Periods Table for Selected Fiscal Year */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  دوره‌های حسابداری ماهانه (۱۲ دوره مالی)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  جهت بستن دوره ماهانه یا بازگشایی مجوزمحور، از ستون عملیات اقدام نمایید.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-12 text-center">دوره</th>
                    <th className="p-3">عنوان دوره حسابداری</th>
                    <th className="p-3">بازه زمانی (از / تا)</th>
                    <th className="p-3 text-center">وضعیت دوره</th>
                    <th className="p-3">شماره سند بستن دوره</th>
                    <th className="p-3 text-center">عملیات کنترلی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountingPeriods
                    .filter((p) => p.fiscalYearId === selectedFiscalYearId)
                    .map((period) => (
                      <tr key={period.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">{period.periodNumber}</td>
                        <td className="p-3 font-extrabold text-slate-900">{period.titleFa}</td>
                        <td className="p-3 font-mono text-slate-600">
                          {period.startDateJalali} تا {period.endDateJalali}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              period.status === 'OPEN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {period.status === 'OPEN' ? 'باز (جاری)' : 'بسته شده'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-purple-700">
                          {period.closingDocNumber ? (
                            <span className="font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {period.closingDocNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {period.status === 'OPEN' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPeriodToClose(period);
                                setCloseDateJalali(period.endDateJalali);
                                setIsClosePeriodModalOpen(true);
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              بستن دوره مالی
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPeriodToReopen(period);
                                setIsReopenModalOpen(true);
                              }}
                              className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              بازگشایی با مجوز
                            </button>
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

      {/* ========================================================================= */}
      {/* TAB 8: COST CENTERS (مراکز هزینه و بودجه‌بندی) */}
      {/* ========================================================================= */}
      {activeTab === 'COST_CENTERS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                مراکز هزینه و تفکیک بودجه عملیاتی (Cost Centers)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تخصیص هزینه‌ها، تفکیک سود و زیان واحدها و پروژه‌های نصب دوربین مداربسته
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewCostCenterModalOpen(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              تعریف مرکز هزینه جدید
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {costCenters.map((cc) => (
              <div
                key={cc.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-purple-300 transition-all space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-purple-100 text-purple-800 rounded">
                      {cc.code}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-xs mt-1.5">{cc.titleFa}</h4>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${cc.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    title={cc.isActive ? 'فعال' : 'غیرفعال'}
                  />
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200/70">
                  <p>مدیر مسئول: <span className="font-bold text-slate-900">{cc.managerNameFa || '-'}</span></p>
                  <p>
                    سقف بودجه: <span className="font-mono font-bold text-purple-800">{(cc.budgetIrr || 0) > 0 ? `${((cc.budgetIrr || 0) / 10).toLocaleString()} تومان` : 'نامحدود'}</span>
                  </p>
                  {cc.descriptionFa && (
                    <p className="text-[10px] text-slate-500 pt-1 leading-normal">{cc.descriptionFa}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: COMPREHENSIVE MULTI-DIMENSIONAL PROFITABILITY REPORT */}
      {/* فرمول: فروش ناخالص - تخفیفات - برگشت از فروش - بهای تمام‌شده - هزینه‌های تخصیص‌یافته = سود خالص */}
      {/* ========================================================================= */}
      {activeTab === 'PROFITABILITY' && (
        <div className="space-y-6">
          {/* Top Filter and Actions Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-inner">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  گزارش تحلیلی جامع سودآوری چندبعدی
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                    Real Sales, COGS & Margin Analytics
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  محاسبه دقیق با احتساب فروش واقعی، تخفیفات، مرجوعی، کاردکس بهای تمام‌شده و هزینه‌های عملیاتی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!profitabilityReport) return;
                  const currentList =
                    profitabilityDimension === 'BY_ITEM'
                      ? profitabilityReport.byItem
                      : profitabilityDimension === 'BY_CATEGORY'
                      ? profitabilityReport.byCategory
                      : profitabilityDimension === 'BY_CUSTOMER'
                      ? profitabilityReport.byCustomer
                      : profitabilityDimension === 'BY_INSTALLER'
                      ? profitabilityReport.byInstaller
                      : profitabilityReport.byProject;

                  exportToExcel(
                    `profitability-${profitabilityDimension}-${profitabilityYearFilter}`,
                    'گزارش سودآوری',
                    [
                      { header: 'کد', key: 'dimensionCode' },
                      { header: 'عنوان بعد', key: 'dimensionTitleFa' },
                      { header: 'فروش خالص (ریال)', key: 'netSalesIrr' },
                      { header: 'بهای تمام‌شده (ریال)', key: 'cogsIrr' },
                      { header: 'سود ناخالص (ریال)', key: 'grossProfitIrr' },
                      { header: 'درصد حاشیه ناخالص', key: 'grossMarginPct' },
                      { header: 'هزینه تخصیص‌یافته (ریال)', key: 'allocatedExpensesIrr' },
                      { header: 'سود خالص واقعی (ریال)', key: 'netProfitIrr' },
                      { header: 'درصد حاشیه خالص', key: 'netMarginPct' },
                    ],
                    currentList.map((r) => ({
                      dimensionCode: r.dimensionCode,
                      dimensionTitleFa: r.dimensionTitleFa,
                      netSalesIrr: r.netSalesIrr,
                      cogsIrr: r.cogsIrr,
                      grossProfitIrr: r.grossProfitIrr,
                      grossMarginPct: `${r.grossMarginPct}%`,
                      allocatedExpensesIrr: r.allocatedExpensesIrr,
                      netProfitIrr: r.netProfitIrr,
                      netMarginPct: `${r.netMarginPct}%`,
                    }))
                  );
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                خروجی اکسل
              </button>

              <button
                type="button"
                onClick={() => fetchProfitability()}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="تازه سازی گزارش"
              >
                <RefreshCw className={`w-4 h-4 ${profitabilityLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 8-Tile Profitability Summary Cards */}
          {profitabilityReport && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-500 font-bold">فروش ناخالص فاکتورها</span>
                <p className="text-base font-black text-slate-900">
                  {(profitabilityReport.summary.totalGrossSalesIrr / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-slate-400">{profitabilityReport.summary.invoicesCount} فاکتور فروش صادره</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-amber-700 font-bold">تخفیفات و مرجوعی فروش</span>
                <p className="text-base font-black text-amber-700">
                  {((profitabilityReport.summary.totalDiscountsIrr + profitabilityReport.summary.totalReturnsIrr) / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-slate-400">تخفیف فاکتور + مرجوعی کالا</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-blue-700 font-bold">فروش خالص واقعی (Net Sales)</span>
                <p className="text-base font-black text-blue-900">
                  {(profitabilityReport.summary.totalNetSalesIrr / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-blue-600">فروش ناخالص کسر تخفیف و برگشت</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-rose-700 font-bold">بهای تمام‌شده کالای فروش‌رفته (COGS)</span>
                <p className="text-base font-black text-rose-800">
                  {(profitabilityReport.summary.totalCogsIrr / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-slate-400">بر اساس خرید و خروج انبار</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-1 bg-emerald-50/20">
                <span className="text-[11px] text-emerald-800 font-bold">سود ناخالص (Gross Profit)</span>
                <p className="text-base font-black text-emerald-700">
                  {(profitabilityReport.summary.totalGrossProfitIrr / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-emerald-700 font-bold">
                  حاشیه ناخالص: {profitabilityReport.summary.overallGrossMarginPct}%
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-600 font-bold">هزینه‌های عملیاتی اداری</span>
                <p className="text-base font-black text-slate-800">
                  {(profitabilityReport.summary.totalOperatingExpensesIrr / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-slate-400">اجاره، قبوض، حقوق و عمومی</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-600 font-bold">دستمزد تخصیص‌یافته نصابان</span>
                <p className="text-base font-black text-slate-800">
                  {(profitabilityReport.summary.totalInstallerWagesIrr / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-slate-400">اجرت پروژه‌های اجرایی دوربین</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs space-y-1 bg-purple-50/30">
                <span className="text-[11px] text-purple-900 font-black">سود خالص واقعی (Net Profit)</span>
                <p className="text-lg font-black text-purple-900">
                  {(profitabilityReport.summary.totalNetProfitIrr / 10).toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </p>
                <p className="text-[10px] text-purple-700 font-bold">
                  حاشیه خالص: {profitabilityReport.summary.overallNetMarginPct}%
                </p>
              </div>
            </div>
          )}

          {/* Dimension Selector Tabs & Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {/* 5-Dimension Selector Ribbon */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setProfitabilityDimension('BY_ITEM')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    profitabilityDimension === 'BY_ITEM'
                      ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  تحلیل بر اساس کالا ({profitabilityReport?.byItem.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setProfitabilityDimension('BY_CATEGORY')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    profitabilityDimension === 'BY_CATEGORY'
                      ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  تحلیل بر اساس گروه کالا ({profitabilityReport?.byCategory.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setProfitabilityDimension('BY_CUSTOMER')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    profitabilityDimension === 'BY_CUSTOMER'
                      ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  تحلیل بر اساس مشتری ({profitabilityReport?.byCustomer.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setProfitabilityDimension('BY_INSTALLER')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    profitabilityDimension === 'BY_INSTALLER'
                      ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  تحلیل بر اساس نصاب ({profitabilityReport?.byInstaller.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setProfitabilityDimension('BY_PROJECT')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    profitabilityDimension === 'BY_PROJECT'
                      ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  تحلیل بر اساس پروژه ({profitabilityReport?.byProject.length || 0})
                </button>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در این بعد..."
                  value={dimensionSearch}
                  onChange={(e) => setDimensionSearch(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Dimension Data Table */}
            <div className="overflow-x-auto">
              {(() => {
                const list =
                  profitabilityDimension === 'BY_ITEM'
                    ? profitabilityReport?.byItem || []
                    : profitabilityDimension === 'BY_CATEGORY'
                    ? profitabilityReport?.byCategory || []
                    : profitabilityDimension === 'BY_CUSTOMER'
                    ? profitabilityReport?.byCustomer || []
                    : profitabilityDimension === 'BY_INSTALLER'
                    ? profitabilityReport?.byInstaller || []
                    : profitabilityReport?.byProject || [];

                const filtered = list.filter((r) => {
                  const q = dimensionSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    r.dimensionCode.toLowerCase().includes(q) ||
                    r.dimensionTitleFa.toLowerCase().includes(q) ||
                    (r.subTitleFa && r.subTitleFa.toLowerCase().includes(q))
                  );
                });

                return (
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-extrabold border-b border-slate-200">
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">کد و عنوان</th>
                        <th className="p-3">تعداد / سفارش</th>
                        <th className="p-3 text-left">فروش ناخالص</th>
                        <th className="p-3 text-left">تخفیف/برگشت</th>
                        <th className="p-3 text-left font-black">فروش خالص</th>
                        <th className="p-3 text-left">بهای تمام‌شده</th>
                        <th className="p-3 text-left text-emerald-800">سود ناخالص</th>
                        <th className="p-3 text-center">حاشیه ناخالص</th>
                        <th className="p-3 text-left">هزینه تخصیصی</th>
                        <th className="p-3 text-left text-purple-900 font-black">سود خالص</th>
                        <th className="p-3 text-center">حاشیه خالص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-400">
                            اطلاعاتی در این بعد برای نمایش یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((row, idx) => (
                          <tr key={row.keyId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-900">{row.dimensionTitleFa}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {row.dimensionCode} {row.subTitleFa ? `| ${row.subTitleFa}` : ''}
                              </p>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-700">{row.quantitySold}</td>
                            <td className="p-3 text-left font-mono text-slate-600">
                              {(row.grossSalesIrr / 10).toLocaleString()}
                            </td>
                            <td className="p-3 text-left font-mono text-amber-700">
                              {((row.discountsIrr + row.returnsIrr) / 10).toLocaleString()}
                            </td>
                            <td className="p-3 text-left font-mono font-black text-slate-900">
                              {(row.netSalesIrr / 10).toLocaleString()}
                            </td>
                            <td className="p-3 text-left font-mono text-rose-700">
                              {(row.cogsIrr / 10).toLocaleString()}
                            </td>
                            <td className="p-3 text-left font-mono font-black text-emerald-700">
                              {(row.grossProfitIrr / 10).toLocaleString()}
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-700">
                              {row.grossMarginPct}%
                            </td>
                            <td className="p-3 text-left font-mono text-slate-500">
                              {(row.allocatedExpensesIrr / 10).toLocaleString()}
                            </td>
                            <td className="p-3 text-left font-mono font-black text-purple-900">
                              {(row.netProfitIrr / 10).toLocaleString()}
                            </td>
                            <td className="p-3 text-center font-extrabold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  row.netMarginPct >= 15
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.netMarginPct > 0
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {row.netMarginPct}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: OPENING BALANCE VOUCHER & EXCEL IMPORT (سند افتتاحیه) */}
      {/* ========================================================================= */}
      {activeTab === 'OPENING_BALANCE' && (
        <div className="space-y-6">
          {/* Mode Switcher Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                سند افتتاحیه و ورود اطلاعات اول دوره
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                  Opening Balance #101
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعیین و ورود مانده اولیه بانک‌ها، صندوق‌ها، کالاها و بدهی/بستانکاری اشخاص جهت شروع نرم‌افزار
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setOpeningBalanceMode('SIMPLE_WIZARD')}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  openingBalanceMode === 'SIMPLE_WIZARD'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌟 فرم ساده موجودی اولیه (ویژه غیرحسابداران)
              </button>
              <button
                type="button"
                onClick={() => setOpeningBalanceMode('EXCEL_ADVANCED')}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  openingBalanceMode === 'EXCEL_ADVANCED'
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 پیشرفته (کپی/پیست اکسل و کدینگ)
              </button>
            </div>
          </div>

          {openingBalanceMode === 'SIMPLE_WIZARD' ? (
            /* SIMPLE WIZARD FORM FOR NON-ACCOUNTANTS */
            <div className="space-y-6">
              {/* Card 1: Banks & Cash Boxes Initial Balances */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h4 className="font-black text-xs text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>۱. موجودی اول دوره بانک‌ها و صندوق‌ها</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Accounts */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <span className="font-bold text-xs text-slate-800">حساب‌های بانکی:</span>
                      <QuickAddButton
                        onClick={() => setQuickMasterType('BANK_ACCOUNT')}
                        title="افزودن حساب بانکی جدید"
                      />
                    </div>
                    {simpleBanks.map((b, idx) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-700">{b.titleFa}</span>
                        <input
                          type="text"
                          placeholder="مبلغ (ریال)"
                          value={b.balanceIrr || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value.replace(/,/g, '')) || 0;
                            const copy = [...simpleBanks];
                            copy[idx].balanceIrr = val;
                            setSimpleBanks(copy);
                          }}
                          className="w-36 p-1.5 bg-white border border-slate-300 rounded-lg text-left font-mono font-bold text-slate-900 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Cash Boxes */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <span className="font-bold text-xs text-slate-800">صندوق‌های نقد:</span>
                      <QuickAddButton
                        onClick={() => setQuickMasterType('CASH_BOX')}
                        title="افزودن صندوق نقد جدید"
                      />
                    </div>
                    {simpleCashes.map((c, idx) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-700">{c.titleFa}</span>
                        <input
                          type="text"
                          placeholder="مبلغ (ریال)"
                          value={c.balanceIrr || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value.replace(/,/g, '')) || 0;
                            const copy = [...simpleCashes];
                            copy[idx].balanceIrr = val;
                            setSimpleCashes(copy);
                          }}
                          className="w-36 p-1.5 bg-white border border-slate-300 rounded-lg text-left font-mono font-bold text-slate-900 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Party Initial Balances (Debtors & Creditors) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xs text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span>۲. بدهی و بستانکاری اول دوره اشخاص (مشتریان / تأمین‌کنندگان / نصابان)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const firstParty = foundationData.parties?.[0];
                      if (firstParty) {
                        setSimpleParties([
                          ...simpleParties,
                          { partyId: firstParty.id, partyTitleFa: firstParty.fullName, type: 'DEBTOR', amountIrr: 0 },
                        ]);
                      }
                    }}
                    className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن شخص
                  </button>
                </div>

                <div className="space-y-2">
                  {simpleParties.map((sp, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={sp.partyId}
                          onChange={(e) => {
                            const pId = Number(e.target.value);
                            const party = foundationData.parties?.find((p) => p.id === pId);
                            const copy = [...simpleParties];
                            copy[idx].partyId = pId;
                            if (party) copy[idx].partyTitleFa = party.fullName;
                            setSimpleParties(copy);
                          }}
                          className="p-2 bg-white border border-slate-300 rounded-lg font-bold outline-none"
                        >
                          {(foundationData.parties || []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} ({p.primaryType === 'CUSTOMER' ? 'مشتری' : 'تأمین‌کننده'})
                            </option>
                          ))}
                        </select>
                        <QuickAddButton
                          onClick={() => setQuickMasterType('PARTY')}
                          title="افزودن سریع شخص / طرف حساب جدید"
                        />
                      </div>

                      <select
                        value={sp.type}
                        onChange={(e) => {
                          const copy = [...simpleParties];
                          copy[idx].type = e.target.value as 'DEBTOR' | 'CREDITOR';
                          setSimpleParties(copy);
                        }}
                        className="p-2 bg-white border border-slate-300 rounded-lg font-bold outline-none"
                      >
                        <option value="DEBTOR">🔴 بدهکار است (به ما بدهکار است)</option>
                        <option value="CREDITOR">🟢 بستانکار است (ما به او بدهکاریم)</option>
                      </select>

                      <input
                        type="text"
                        placeholder="مبلغ مانده (ریال)"
                        value={sp.amountIrr || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/,/g, '')) || 0;
                          const copy = [...simpleParties];
                          copy[idx].amountIrr = val;
                          setSimpleParties(copy);
                        }}
                        className="w-40 p-2 bg-white border border-slate-300 rounded-lg text-left font-mono font-bold text-slate-900 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setSimpleParties(simpleParties.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Inventory Initial Stock */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xs text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>۳. موجودی اول دوره کالاها در انبارها</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const firstItem = foundationData.items?.[0];
                      if (firstItem) {
                        setSimpleInventory([
                          ...simpleInventory,
                          {
                            itemId: firstItem.id,
                            itemTitleFa: firstItem.titleFa,
                            warehouseId: 1,
                            qty: 1,
                            unitCostIrr: 10000000,
                          },
                        ]);
                      }
                    }}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن کالا به انبار
                  </button>
                </div>

                <div className="space-y-2">
                  {simpleInventory.map((si, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <select
                        value={si.itemId}
                        onChange={(e) => {
                          const iId = Number(e.target.value);
                          const item = foundationData.items?.find((i) => i.id === iId);
                          const copy = [...simpleInventory];
                          copy[idx].itemId = iId;
                          if (item) copy[idx].itemTitleFa = item.titleFa;
                          setSimpleInventory(copy);
                        }}
                        className="p-2 bg-white border border-slate-300 rounded-lg font-bold outline-none max-w-xs"
                      >
                        {(foundationData.items || []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.titleFa} ({item.itemCode})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={si.warehouseId}
                          onChange={(e) => {
                            const copy = [...simpleInventory];
                            copy[idx].warehouseId = Number(e.target.value);
                            setSimpleInventory(copy);
                          }}
                          className="p-2 bg-white border border-slate-300 rounded-lg font-bold outline-none"
                        >
                          {(foundationData.warehouses || []).map((w) => (
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

                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">تعداد:</span>
                        <input
                          type="number"
                          value={si.qty}
                          onChange={(e) => {
                            const copy = [...simpleInventory];
                            copy[idx].qty = Number(e.target.value) || 0;
                            setSimpleInventory(copy);
                          }}
                          className="w-20 p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">فی بهای تمام‌شده (ریال):</span>
                        <input
                          type="text"
                          value={si.unitCostIrr || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value.replace(/,/g, '')) || 0;
                            const copy = [...simpleInventory];
                            copy[idx].unitCostIrr = val;
                            setSimpleInventory(copy);
                          }}
                          className="w-36 p-2 bg-white border border-slate-300 rounded-lg text-left font-mono font-bold text-slate-900 outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setSimpleInventory(simpleInventory.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Submit Simple Opening Voucher */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span>محاسبه اتوماتیک و ثبت قطعی سند افتتاحیه #101</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    سیستم به صورت هوشمند بدهکاران و بستانکاران فوق را تراز کرده و مابه‌التفاوت را به حساب «سرمایه اولیه مالکان (کد ۳۰۱۰۱)» موازنه می‌کند.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingOpening}
                  onClick={async () => {
                    setIsSubmittingOpening(true);
                    setFeedback(null);
                    try {
                      const res = await fetch('/api/accounting/opening-balance/simple-wizard', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          dateJalali: openingDateJalali,
                          bankBalances: simpleBanks,
                          cashBalances: simpleCashes,
                          partyBalances: simpleParties,
                          inventoryBalances: simpleInventory,
                          notesFa: 'سند افتتاحیه اول دوره (ثبت‌شده از طریق فرم ساده و هوشمند)',
                        }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        setFeedback({ type: 'success', message: data.messageFa || 'سند افتتاحیه با موفقیت ثبت شد.' });
                        await onRefresh();
                      } else {
                        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت فرم ساده افتتاحیه.' });
                      }
                    } catch {
                      setFeedback({ type: 'error', message: 'خطا در ارتباط با سرور.' });
                    } finally {
                      setIsSubmittingOpening(false);
                    }
                  }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {isSubmittingOpening ? 'در حال ثبت و موازنه...' : '⚡ ثبت و صدور هوشمند سند افتتاحیه'}
                </button>
              </div>
            </div>
          ) : (
            /* EXCEL ADVANCED MODE */
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 shadow-inner">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      واردسازی داده‌ها از اکسل (پیشرفته)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      کپی/پیست مستقیم جدول اکسل به همراه کدهای دقیق حسابداری
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const cols = [
                      { header: 'نوع آیتم', key: 'type' },
                      { header: 'کد', key: 'code' },
                      { header: 'عنوان / نام', key: 'titleFa' },
                      { header: 'کد حساب', key: 'accountCode' },
                      { header: 'بدهکار (ریال)', key: 'debitIrr' },
                      { header: 'بستانکار (ریال)', key: 'creditIrr' },
                      { header: 'تعداد', key: 'qty' },
                      { header: 'توضیحات', key: 'notesFa' },
                    ];
                    exportToExcel('قالب_نمونه_سند_افتتاحیه_مهرگان', 'افتتاحیه', cols, openingItems as unknown as Record<string, unknown>[]);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  دانلود قالب نمونه اکسل
                </button>
              </div>

          {/* Excel Paste Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              ورود سریع داده‌ها با کپی/پیست مستقیم از اکسل (TSV/CSV):
            </h4>
            <div className="flex gap-2">
              <textarea
                rows={3}
                value={excelPasteText}
                onChange={(e) => setExcelPasteText(e.target.value)}
                placeholder="ستون‌ها به ترتیب: نوع(PARTY|INVENTORY|BANK_CASH|GENERAL_ACCOUNT) [TAB] کد [TAB] عنوان [TAB] کد حساب [TAB] بدهکار [TAB] بستانکار [TAB] توضیحات..."
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-mono focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!excelPasteText.trim()) return;
                  const lines = excelPasteText.trim().split('\n');
                  const parsed: OpeningBalanceImportItem[] = [];
                  lines.forEach((line) => {
                    const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
                    if (parts.length >= 4) {
                      parsed.push({
                        type: (parts[0]?.trim().toUpperCase() as 'PARTY' | 'INVENTORY' | 'BANK_CASH' | 'GENERAL_ACCOUNT') || 'GENERAL_ACCOUNT',
                        code: parts[1]?.trim() || '',
                        titleFa: parts[2]?.trim() || 'آیتم افتتاحیه',
                        accountCode: parts[3]?.trim() || '10101',
                        debitIrr: Number(parts[4]?.replace(/,/g, '')) || 0,
                        creditIrr: Number(parts[5]?.replace(/,/g, '')) || 0,
                        notesFa: parts[6]?.trim() || 'واردشده از اکسل',
                      });
                    }
                  });
                  if (parsed.length > 0) {
                    setOpeningItems((prev) => [...prev, ...parsed]);
                    setExcelPasteText('');
                    setFeedback({ type: 'success', message: `${parsed.length} ردیف با موفقیت از متن اکسل استخراج گردید.` });
                  } else {
                    setFeedback({ type: 'error', message: 'فرمت متن ورودی معتبر نیست. از کلید TAB بین ستون‌ها استفاده کنید.' });
                  }
                }}
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                پردازش متن اکسل
              </button>
            </div>
          </div>

          {/* Interactive Draft Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                جدول ردیفت‌های پیش‌نویس سند افتتاحیه ({openingItems.length} ردیف)
              </h4>
              <button
                type="button"
                onClick={() => {
                  setOpeningItems((prev) => [
                    ...prev,
                    {
                      type: 'GENERAL_ACCOUNT',
                      code: `ROW-${prev.length + 1}`,
                      titleFa: 'حساب عمومی جدید',
                      accountCode: '10101',
                      debitIrr: 0,
                      creditIrr: 0,
                      notesFa: 'ردیف دستی',
                    },
                  ]);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                افزودن ردیف دستی
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">نوع بخش</th>
                    <th className="p-2.5">کد حساب</th>
                    <th className="p-2.5">عنوان حساب / نام شخص / انبار / بانک</th>
                    <th className="p-2.5 text-left">مبلغ بدهکار (ریال)</th>
                    <th className="p-2.5 text-left">مبلغ بستانکار (ریال)</th>
                    <th className="p-2.5">شرح ردیف</th>
                    <th className="p-2.5 text-center w-12">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openingItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        پیش‌نویس سند افتتاحیه خالی است.
                      </td>
                    </tr>
                  ) : (
                    openingItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5">
                          <select
                            value={item.type}
                            onChange={(e) => {
                              const val = e.target.value as OpeningBalanceImportItem['type'];
                              const next = [...openingItems];
                              next[idx].type = val;
                              setOpeningItems(next);
                            }}
                            className="rounded border border-slate-300 bg-white p-1 text-[11px] font-bold"
                          >
                            <option value="PARTY">اشخاص (مطالبات/بدهی)</option>
                            <option value="INVENTORY">موجودی انبار</option>
                            <option value="BANK_CASH">بانک / صندوق</option>
                            <option value="GENERAL_ACCOUNT">سایر حساب‌های کل/معین</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            dir="ltr"
                            value={item.accountCode}
                            onChange={(e) => {
                              const next = [...openingItems];
                              next[idx].accountCode = e.target.value;
                              setOpeningItems(next);
                            }}
                            className="w-24 rounded border border-slate-300 p-1 font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.titleFa}
                            onChange={(e) => {
                              const next = [...openingItems];
                              next[idx].titleFa = e.target.value;
                              setOpeningItems(next);
                            }}
                            className="w-full min-w-[200px] rounded border border-slate-300 p-1 text-[11px] font-bold"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            dir="ltr"
                            value={item.debitIrr}
                            onChange={(e) => {
                              const next = [...openingItems];
                              next[idx].debitIrr = Number(e.target.value) || 0;
                              setOpeningItems(next);
                            }}
                            className="w-32 rounded border border-slate-300 p-1 font-mono text-[11px] text-left"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            dir="ltr"
                            value={item.creditIrr}
                            onChange={(e) => {
                              const next = [...openingItems];
                              next[idx].creditIrr = Number(e.target.value) || 0;
                              setOpeningItems(next);
                            }}
                            className="w-32 rounded border border-slate-300 p-1 font-mono text-[11px] text-left"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.notesFa || ''}
                            onChange={(e) => {
                              const next = [...openingItems];
                              next[idx].notesFa = e.target.value;
                              setOpeningItems(next);
                            }}
                            className="w-full rounded border border-slate-300 p-1 text-[11px]"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setOpeningItems(openingItems.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Validation & Balance Review Footer */}
            {(() => {
              const totalDeb = openingItems.reduce((s, i) => s + (Number(i.debitIrr) || 0), 0);
              const totalCred = openingItems.reduce((s, i) => s + (Number(i.creditIrr) || 0), 0);
              const diff = Math.abs(totalDeb - totalCred);
              const isBalanced = diff === 0 && totalDeb > 0;

              return (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-500 block">جمع بدهکار (ریال):</span>
                      <span className="font-mono font-black text-emerald-700 text-sm" dir="ltr">
                        {totalDeb.toLocaleString('fa-IR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">جمع بستانکار (ریال):</span>
                      <span className="font-mono font-black text-purple-700 text-sm" dir="ltr">
                        {totalCred.toLocaleString('fa-IR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">اختلاف تراز:</span>
                      <span className={`font-mono font-black text-sm ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                        {diff.toLocaleString('fa-IR')} ریال
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">وضعیت تراز:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isBalanced ? '✅ تراز کاملاً متوازن است' : '❌ نا متوازن (تفاوت بدهکار و بستانکار)'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isBalanced || isSubmittingOpening}
                    onClick={async () => {
                      setIsSubmittingOpening(true);
                      try {
                        const res = await fetch('/api/accounting/opening-balance', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            dateJalali: openingDateJalali,
                            descriptionFa: openingDescFa,
                            items: openingItems,
                          }),
                        });
                        const data = await res.json();
                        if (data.ok) {
                          setFeedback({ type: 'success', message: data.messageFa });
                          onRefresh();
                          refreshAccountingData();
                        } else {
                          setFeedback({ type: 'error', message: data.messageFa });
                        }
                      } catch {
                        setFeedback({ type: 'error', message: 'خطا در ثبت نهایی سند افتتاحیه.' });
                      } finally {
                        setIsSubmittingOpening(false);
                      }
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>تأیید مدیر و ثبت نهایی سند افتتاحیه ۱۰۱ در دیتابیس</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  )}

      {/* ========================================================================= */}
      {/* TAB 11: FIXED ASSETS & DEPRECIATION MANAGEMENT (دارایی‌های ثابت و استهلاک) */}
      {/* ========================================================================= */}
      {activeTab === 'FIXED_ASSETS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200 shadow-inner">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  ثبت و مدیریت دارایی‌های ثابت و محاسبات استهلاک
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                    Fixed Assets & Depreciation Accounting
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  کدگذاری اموال، روش‌های استهلاک مستقیم و نزولی، و صدور سند اتوماتیک استهلاک متوازن دوره
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewAssetModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت دارایی ثابت جدید</span>
            </button>
          </div>

          {/* Assets Metrics */}
          {(() => {
            const totalCost = fixedAssets.reduce((s, a) => s + (a.purchaseCostIrr || 0), 0);
            const totalDep = fixedAssets.reduce((s, a) => s + (a.accumulatedDepreciationIrr || 0), 0);
            const totalBook = totalCost - totalDep;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-slate-500 block font-semibold">بهای تمام‌شده کل دارایی‌ها:</span>
                  <span className="text-base font-mono font-extrabold text-slate-900" dir="ltr">
                    {totalCost.toLocaleString('fa-IR')} <small className="text-[10px]">ریال</small>
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-slate-500 block font-semibold">مجموع استهلاک انباشته:</span>
                  <span className="text-base font-mono font-extrabold text-rose-700" dir="ltr">
                    {totalDep.toLocaleString('fa-IR')} <small className="text-[10px]">ریال</small>
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-slate-500 block font-semibold">خالص ارزش دفتری (Book Value):</span>
                  <span className="text-base font-mono font-extrabold text-indigo-700" dir="ltr">
                    {totalBook.toLocaleString('fa-IR')} <small className="text-[10px]">ریال</small>
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Assets List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h4 className="font-extrabold text-xs text-slate-900">
                فهرست اموال و دارایی‌های ثابت ثبت‌شده ({fixedAssets.length} مورد)
              </h4>
              <input
                type="text"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="جستجو در کد، عنوان یا محل نگهداری..."
                className="rounded-lg border border-slate-300 p-1.5 text-xs w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">کد اموال</th>
                    <th className="p-3">عنوان دارایی</th>
                    <th className="p-3 text-center">تاریخ خرید</th>
                    <th className="p-3 text-left">بهای تمام‌شده (ریال)</th>
                    <th className="p-3 text-left">ارزش اسقاط (ریال)</th>
                    <th className="p-3 text-center">عمر مفید</th>
                    <th className="p-3 text-left text-rose-700">استهلاک انباشته</th>
                    <th className="p-3 text-left text-indigo-800 font-black">ارزش دفتری</th>
                    <th className="p-3 text-center">وضعیت</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fixedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        هیچ دارایی ثابتی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    fixedAssets
                      .filter(
                        (a) =>
                          !assetSearch.trim() ||
                          a.titleFa.toLowerCase().includes(assetSearch.toLowerCase()) ||
                          a.assetCode.toLowerCase().includes(assetSearch.toLowerCase())
                      )
                      .map((asset, idx) => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-800" dir="ltr">
                            [{asset.assetCode}]
                          </td>
                          <td className="p-3">
                            <p className="font-extrabold text-slate-900">{asset.titleFa}</p>
                            <p className="text-[10px] text-slate-500">
                              تحویل‌گیرنده: {asset.custodianTitleFa || 'نامشخص'} · محل: {asset.locationAddressFa}
                            </p>
                          </td>
                          <td className="p-3 text-center font-mono">{asset.purchaseDateJalali}</td>
                          <td className="p-3 text-left font-mono font-bold">
                            {asset.purchaseCostIrr.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-left font-mono text-slate-500">
                            {asset.salvageValueIrr.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-center font-bold">{asset.usefulLifeYears} سال</td>
                          <td className="p-3 text-left font-mono text-rose-700">
                            {asset.accumulatedDepreciationIrr.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-indigo-800">
                            {asset.bookValueIrr.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                asset.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : asset.status === 'FULLY_DEPRECIATED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {asset.status === 'ACTIVE' ? 'فعال' : asset.status === 'FULLY_DEPRECIATED' ? 'مستهلک‌شده' : 'واگذارشده'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={asset.status === 'FULLY_DEPRECIATED'}
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/fixed-assets/${asset.id}/depreciate`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ periodJalali: '1405-Y' }),
                                  });
                                  const data = await res.json();
                                  if (data.ok) {
                                    setFeedback({ type: 'success', message: data.messageFa });
                                    onRefresh();
                                    refreshAccountingData();
                                  } else {
                                    setFeedback({ type: 'error', message: data.messageFa });
                                  }
                                } catch {
                                  setFeedback({ type: 'error', message: 'خطا در ثبت استهلاک دارایی.' });
                                }
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              ثبت استهلاک دوره
                            </button>
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

      {/* ========================================================================= */}
      {/* TAB 12: COMPREHENSIVE MANAGEMENT REPORTS (گزارش‌های جامع مدیریتی) */}
      {/* ========================================================================= */}
      {activeTab === 'MANAGEMENT_REPORTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 shadow-inner">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  گزارش‌های جامع مدیریتی دیتابیس مهرگان
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded">
                    Comprehensive Real-Data Management Reports
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  گزارش‌گیری از داده‌های واقعی فروش، خرید، کاردکس، بدهکاران/بستانکاران، خزانه، چک‌ها، اقساط، پروژه‌ها و تراز مالی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  let title = 'گزارش تحلیلی جامع مهرگان';
                  let columns: { header: string; key: string }[] = [];
                  let data: Record<string, unknown>[] = [];
                  let summaryFa = '';

                  if (reportTab === 'SALES') {
                    title = 'گزارش تحلیلی فروش و پیش‌فاکتورها';
                    columns = [
                      { header: 'شماره فاکتور', key: 'invoiceNumber' },
                      { header: 'مشتری', key: 'customer' },
                      { header: 'تاریخ', key: 'date' },
                      { header: 'مبلغ کل (تومان)', key: 'total' },
                      { header: 'دریافتی (تومان)', key: 'paid' },
                      { header: 'مانده (تومان)', key: 'remaining' },
                      { header: 'وضعیت', key: 'status' },
                    ];
                    data = salesInvoices.map((inv) => ({
                      invoiceNumber: inv.invoiceNumber,
                      customer: inv.customerTitleFa,
                      date: inv.dateJalali,
                      total: (inv.totalInvoiceAmountIrr / 10).toLocaleString(),
                      paid: (inv.paidAmountIrr / 10).toLocaleString(),
                      remaining: (inv.remainingBalanceIrr / 10).toLocaleString(),
                      status:
                        inv.status === 'PAID'
                          ? 'تسویه کامل'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'تسویه ناقص'
                          : 'در انتظار دریافت',
                    }));
                    summaryFa = `تعداد کل فاکتورها: ${salesInvoices.length} فقره | مجموع فروش: ${(salesInvoices.reduce((s, i) => s + i.totalInvoiceAmountIrr, 0) / 10).toLocaleString()} تومان`;
                  } else if (reportTab === 'PURCHASES') {
                    title = 'گزارش خرید و تدارکات کالا';
                    columns = [
                      { header: 'شماره فاکتور', key: 'invoiceNumber' },
                      { header: 'تأمین‌کننده', key: 'supplier' },
                      { header: 'تاریخ', key: 'date' },
                      { header: 'ارز', key: 'currency' },
                      { header: 'مبلغ کل (تومان)', key: 'total' },
                      { header: 'وضعیت', key: 'status' },
                    ];
                    data = purchaseInvoices.map((inv) => ({
                      invoiceNumber: inv.invoiceNumber,
                      supplier: inv.supplierTitleFa,
                      date: inv.dateJalali,
                      currency: inv.currency,
                      total: ((inv.totalInvoicePayableToSupplierIrr || inv.totalInventoryValuationIrr || 0) / 10).toLocaleString(),
                      status: inv.status === 'CONFIRMED' || inv.status === 'PAID' ? 'تأیید و تحویل انبار' : 'پیش‌نویس خرید',
                    }));
                    summaryFa = `تعداد کل فاکتورهای خرید: ${purchaseInvoices.length} فقره`;
                  } else if (reportTab === 'INVENTORY') {
                    title = 'گزارش موجودی و ارزشیابی انبارها';
                    columns = [
                      { header: 'کد کالا', key: 'code' },
                      { header: 'شرح کالا', key: 'title' },
                      { header: 'مدل', key: 'model' },
                      { header: 'موجودی کل', key: 'stock' },
                      { header: 'واحد', key: 'unit' },
                      { header: 'فی خرید (تومان)', key: 'price' },
                    ];
                    data = (foundationData.items || []).map((itm) => ({
                      code: itm.itemCode,
                      title: itm.titleFa,
                      model: itm.model,
                      stock: (itm as any).currentStock ?? (itm as any).stock ?? 0,
                      unit: itm.unitNameFa || 'عدد',
                      price: (itm.purchasePriceIrr / 10).toLocaleString(),
                    }));
                    summaryFa = `تعداد اقلام کالا: ${foundationData.items?.length || 0} قلم`;
                  } else if (reportTab === 'PARTIES') {
                    title = 'گزارش مانده‌حساب اشخاص و طرفین تجاری';
                    columns = [
                      { header: 'کد شخص', key: 'code' },
                      { header: 'نام و نام‌خانوادگی / شرکت', key: 'name' },
                      { header: 'نقش', key: 'role' },
                      { header: 'تلفن همراه', key: 'mobile' },
                      { header: 'مانده حساب (تومان)', key: 'balance' },
                      { header: 'وضعیت مالی', key: 'status' },
                    ];
                    data = (foundationData.parties || []).map((p) => {
                      const curBal = Number((p as any).currentBalanceIrr) || 0;
                      const balToman = Math.abs(curBal / 10).toLocaleString();
                      return {
                        code: p.partyCode,
                        name: p.fullName,
                        role:
                          p.primaryType === 'CUSTOMER'
                            ? 'مشتری'
                            : p.primaryType === 'SUPPLIER'
                            ? 'تأمین‌کننده'
                            : p.primaryType === 'INSTALLER'
                            ? 'نصاب'
                            : 'سایر',
                        mobile: p.mobile || '-',
                        balance: balToman,
                        status:
                          curBal > 0
                            ? 'بدهکار به ما'
                            : curBal < 0
                            ? 'بستانکار از ما'
                            : 'بی‌حساب',
                      };
                    });
                    summaryFa = `تعداد کل طرفین تجاری: ${foundationData.parties?.length || 0} شخص`;
                  } else if (reportTab === 'TREASURY') {
                    title = 'گزارش نقدینگی و منابع مالی خزانه';
                    columns = [
                      { header: 'نوع منبع', key: 'type' },
                      { header: 'عنوان بانک / صندوق', key: 'title' },
                      { header: 'شماره حساب / کد', key: 'account' },
                      { header: 'موجودی فعلی (تومان)', key: 'balance' },
                    ];
                    const banks = (foundationData.bankAccounts || []).map((b) => ({
                      type: 'بانک',
                      title: b.bankNameFa,
                      account: b.accountNumber,
                      balance: (b.balanceIrr / 10).toLocaleString(),
                    }));
                    const cashes = (foundationData.cashBoxes || []).map((c) => ({
                      type: 'صندوق',
                      title: c.titleFa,
                      account: c.boxCode,
                      balance: (c.balanceIrr / 10).toLocaleString(),
                    }));
                    data = [...banks, ...cashes];
                    summaryFa = `مجموع حساب‌ها و صندوق‌ها: ${data.length}`;
                  } else if (reportTab === 'EXPENSES') {
                    title = 'گزارش هزینه‌های عملیاتی و جاری';
                    columns = [
                      { header: 'کد هزینه', key: 'code' },
                      { header: 'دسته‌بندی', key: 'category' },
                      { header: 'عنوان شرح هزینه', key: 'title' },
                      { header: 'مبلغ (تومان)', key: 'amount' },
                      { header: 'تاریخ', key: 'date' },
                    ];
                    data = operationalExpenses.map((exp) => ({
                      code: exp.expenseCode,
                      category: exp.categoryFa,
                      title: exp.titleFa,
                      amount: (exp.amountIrr / 10).toLocaleString(),
                      date: exp.dateJalali,
                    }));
                    summaryFa = `مجموع هزینه‌ها: ${(operationalExpenses.reduce((s, e) => s + e.amountIrr, 0) / 10).toLocaleString()} تومان`;
                  } else {
                    title = 'تراز آزمایشی و دفتر کل حسابداری';
                    columns = [
                      { header: 'کد سرفصل', key: 'code' },
                      { header: 'عنوان سرفصل حسابداری', key: 'title' },
                      { header: 'گردش بدهکار (تومان)', key: 'debit' },
                      { header: 'گردش بستانکار (تومان)', key: 'credit' },
                      { header: 'مانده بدهکار (تومان)', key: 'remDebit' },
                      { header: 'مانده بستانکار (تومان)', key: 'remCredit' },
                    ];
                    data = trialBalanceData.rows.map((r) => ({
                      code: r.accountCode,
                      title: r.accountTitleFa,
                      debit: (r.totalDebitIrr / 10).toLocaleString(),
                      credit: (r.totalCreditIrr / 10).toLocaleString(),
                      remDebit: r.remainingDebitIrr > 0 ? (r.remainingDebitIrr / 10).toLocaleString() : '-',
                      remCredit: r.remainingCreditIrr > 0 ? (r.remainingCreditIrr / 10).toLocaleString() : '-',
                    }));
                    summaryFa = `تعداد سرفصل‌های دفتر کل: ${trialBalanceData.rows.length}`;
                  }

                  exportToPdf(title, columns, data, {
                    docNumber: `REP-${Date.now().toString().slice(-6)}`,
                    summaryFa,
                  });
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                چاپ گزارش
              </button>
            </div>
          </div>

          {/* Report Sub-Domain Ribbon */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setReportTab('SALES')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'SALES' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              فروش و مرجوعی
            </button>
            <button
              type="button"
              onClick={() => setReportTab('PURCHASES')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'PURCHASES' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              خرید و تدارکات
            </button>
            <button
              type="button"
              onClick={() => setReportTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'INVENTORY' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              موجودی و کاردکس
            </button>
            <button
              type="button"
              onClick={() => setReportTab('SERIALS')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'SERIALS' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              ردیابی سریال‌ها
            </button>
            <button
              type="button"
              onClick={() => setReportTab('PARTIES')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'PARTIES' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              بدهکاران و بستانکاران
            </button>
            <button
              type="button"
              onClick={() => setReportTab('TREASURY')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'TREASURY' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              خزانه و چک‌ها
            </button>
            <button
              type="button"
              onClick={() => setReportTab('EXPENSES')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'EXPENSES' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              هزینه‌ها و درآمدها
            </button>
            <button
              type="button"
              onClick={() => setReportTab('GL_TRIAL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'GL_TRIAL' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              دفتر کل و تراز
            </button>
            <button
              type="button"
              onClick={() => setReportTab('PROJECTS')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'PROJECTS' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              پروژه‌ها و سودآوری
            </button>
            <button
              type="button"
              onClick={() => setReportTab('ASSETS')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reportTab === 'ASSETS' ? 'bg-purple-600 text-white font-extrabold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              دفتر دارایی‌ها
            </button>
          </div>

          {/* Date & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">از تاریخ (شمسی):</label>
                <input
                  type="text"
                  dir="ltr"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 p-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">تا تاریخ (شمسی):</label>
                <input
                  type="text"
                  dir="ltr"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 p-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">جستجو در گزارش:</label>
                <input
                  type="text"
                  value={reportQuery}
                  onChange={(e) => setReportQuery(e.target.value)}
                  placeholder="عنوان، کد، فاکتور..."
                  className="rounded-lg border border-slate-300 p-1.5 text-xs w-48"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const cols = [
                  { header: 'عنوان', key: 'title' },
                  { header: 'مقدار / کد', key: 'code' },
                  { header: 'مبلغ کل (ریال)', key: 'amount' },
                ];
                exportToExcel(`گزارش_${reportTab}`, reportTab, cols, []);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              خروجی Excel / CSV
            </button>
          </div>

          {/* Dynamic Report Content Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h4 className="font-black text-sm text-slate-900 border-b border-slate-200 pb-3">
              {reportTab === 'SALES' && 'گزارش تحلیلی فروش، مرجوعی‌ها و درآمد خالص'}
              {reportTab === 'PURCHASES' && 'گزارش خریدهای داخلی، ارزی و بهای تمام‌شده Landed Cost'}
              {reportTab === 'INVENTORY' && 'گزارش موجودی، ارزشیابی انبار و کاردکس کالا'}
              {reportTab === 'SERIALS' && 'گزارش وضعیت و ردیابی سریال‌های کالا'}
              {reportTab === 'PARTIES' && 'گزارش مانده بدهکاران، بستانکاران و تحلیل سن مطالبات'}
              {reportTab === 'TREASURY' && 'گزارش نقدینگی خزانه، چک‌های صیادی و دفتر اقساط'}
              {reportTab === 'EXPENSES' && 'گزارش تفکیکی هزینه‌های عملیاتی و اداری'}
              {reportTab === 'GL_TRIAL' && 'دفتر کل و تراز آزمایشی ۴ و ۸ ستونی'}
              {reportTab === 'PROJECTS' && 'گزارش بهای تمام‌شده و سودآوری واقعی پروژه‌ها'}
              {reportTab === 'ASSETS' && 'دفتر دارایی‌های ثابت و جدول استهلاک انباشته'}
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">عنوان رویداد / کد</th>
                    <th className="p-3 text-center">تاریخ</th>
                    <th className="p-3 text-left">مبلغ بدهکار (ریال)</th>
                    <th className="p-3 text-left">مبلغ بستانکار (ریال)</th>
                    <th className="p-3 text-left font-black text-indigo-900">مانده / سود خالص</th>
                    <th className="p-3 text-center">توضیحات و وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        اطلاعاتی برای بازه زمانی انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    salesInvoices
                      .filter((inv) => !reportQuery.trim() || inv.invoiceNumber.includes(reportQuery) || inv.customerTitleFa.includes(reportQuery))
                      .map((inv, idx) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">
                            فاکتور فروش شماره {inv.invoiceNumber} - {inv.customerTitleFa}
                          </td>
                          <td className="p-3 text-center font-mono">{inv.dateJalali}</td>
                          <td className="p-3 text-left font-mono font-bold text-emerald-700">
                            {(inv.totalInvoiceAmountIrr || 0).toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-left font-mono text-slate-500">0</td>
                          <td className="p-3 text-left font-mono font-black text-indigo-900">
                            {(inv.totalInvoiceAmountIrr || 0).toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-center text-slate-500">
                            تعداد اقلام: {inv.lines.length} · ثبت قطعی دیتابیس
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

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW / PRINT ACCOUNTING DOCUMENT */}
      {/* ========================================================================= */}
      {selectedDocForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  برگه سند حسابداری شماره {selectedDocForView.docNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  تاریخ سند: {selectedDocForView.dateJalali} | وضعیت:{' '}
                  {selectedDocForView.status === 'PERMANENT'
                    ? 'قطعی (PERMANENT)'
                    : selectedDocForView.status === 'APPROVED'
                    ? 'تایید شده (APPROVED)'
                    : 'پیش‌نویس (DRAFT)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocForView(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Voucher Section */}
            <div className="printable-area border border-slate-200 rounded-xl p-5 bg-white space-y-4">
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    سیستم حسابداری و بازرگانی مهرگان
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    سند حسابداری دوطرفه سال مالی ۱۴۰۵
                  </p>
                </div>
                <div className="text-left font-mono">
                  <p className="font-extrabold text-purple-800 text-sm">{selectedDocForView.docNumber}</p>
                  <p className="text-slate-600 text-xs">تاریخ: {selectedDocForView.dateJalali}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p>
                  <strong>شرح کلی سند:</strong> {selectedDocForView.descriptionFa}
                </p>
                {selectedDocForView.referenceNumber && (
                  <p className="text-slate-500">
                    <strong>شماره پیگیری / عطف:</strong> {selectedDocForView.referenceNumber}
                  </p>
                )}
              </div>

              {/* Lines Table */}
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center w-10">ردیف</th>
                    <th className="p-2 border-r border-slate-300 w-24">کد حساب</th>
                    <th className="p-2 border-r border-slate-300">عنوان سرفصل حسابداری</th>
                    <th className="p-2 border-r border-slate-300">تفصیلی / طرف حساب</th>
                    <th className="p-2 border-r border-slate-300">شرح آرتیکل</th>
                    <th className="p-2 border-r border-slate-300 text-left text-emerald-800 w-28">
                      بدهکار (ریال)
                    </th>
                    <th className="p-2 text-left text-blue-800 w-28">بستانکار (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {selectedDocForView.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2 border-r border-slate-300 text-center font-sans">{i + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-purple-700">
                        {l.accountCode}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-sans font-bold text-slate-800">
                        {l.accountTitleFa}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-sans text-slate-600">
                        {l.detailTitleFa || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-sans text-slate-700">
                        {l.descriptionFa}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-left font-bold text-emerald-700">
                        {l.debitIrr > 0 ? l.debitIrr.toLocaleString() : '-'}
                      </td>
                      <td className="p-2 text-left font-bold text-blue-700">
                        {l.creditIrr > 0 ? l.creditIrr.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold font-mono border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="p-2 text-center font-sans">
                      جمع سند تراز شده:
                    </td>
                    <td className="p-2 text-left border-r border-slate-300 text-emerald-800">
                      {selectedDocForView.totalDebitIrr.toLocaleString()}
                    </td>
                    <td className="p-2 text-left text-blue-800">
                      {selectedDocForView.totalCreditIrr.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-slate-600 border-t border-slate-200 font-sans">
                <div>
                  <p className="font-bold">تنظیم‌کننده:</p>
                  <p className="text-[11px] text-slate-500 mt-1">{selectedDocForView.createdByName}</p>
                </div>
                <div>
                  <p className="font-bold">تایید حسابداری:</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {selectedDocForView.approvedByName || 'امضا شده'}
                  </p>
                </div>
                <div>
                  <p className="font-bold">مدیر مالی و ممیزی:</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {selectedDocForView.permanentByName || 'مهر و تایید نهایی'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const exportLines = selectedDocForView.lines.map((l, i) => ({
                    row: i + 1,
                    accountCode: l.accountCode,
                    accountTitleFa: l.accountTitleFa,
                    detail: l.detailTitleFa || '-',
                    description: l.descriptionFa,
                    debit: l.debitIrr > 0 ? (l.debitIrr / 10).toLocaleString() : '',
                    credit: l.creditIrr > 0 ? (l.creditIrr / 10).toLocaleString() : '',
                  }));

                  exportToExcel(
                    `سند_حسابداری_${selectedDocForView.docNumber}`,
                    selectedDocForView.docNumber,
                    [
                      { header: 'ردیف', key: 'row', width: 8 },
                      { header: 'کد حساب', key: 'accountCode', width: 14 },
                      { header: 'سرفصل حساب', key: 'accountTitleFa', width: 28 },
                      { header: 'تفصیلی', key: 'detail', width: 20 },
                      { header: 'شرح', key: 'description', width: 34 },
                      { header: 'بدهکار (تومان)', key: 'debit', width: 18 },
                      { header: 'بستانکار (تومان)', key: 'credit', width: 18 },
                    ],
                    exportLines
                  );
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                دانلود اکسل سند
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedDocForView) return;
                    const rowsHtml = selectedDocForView.lines
                      .map(
                        (l, idx) => `
                      <tr>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${idx + 1}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; font-weight: bold; color: #6b21a8;">${l.accountCode}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${l.accountTitleFa}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; color: #475569;">${l.detailTitleFa || '-'}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px;">${l.descriptionFa}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-weight: bold; color: #047857; font-family: monospace;">${l.debitIrr > 0 ? (l.debitIrr / 10).toLocaleString() : '-'}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-weight: bold; color: #1d4ed8; font-family: monospace;">${l.creditIrr > 0 ? (l.creditIrr / 10).toLocaleString() : '-'}</td>
                      </tr>
                    `
                      )
                      .join('');

                    const bodyHtml = `
                      <div style="font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; text-align: right; color: #0f172a; font-size: 11px; padding: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 16px;">
                          <div>
                            <div style="font-size: 16px; font-weight: 800; color: #6b21a8;">سامانه حسابداری و مدیریت مالی مهرگان</div>
                            <div style="font-size: 12px; color: #475569; margin-top: 4px; font-weight: 700;">برگه سند حسابداری دوطرفه رسمی</div>
                          </div>
                          <div style="text-align: left; font-size: 10px; color: #334155; line-height: 1.6;">
                            <div><strong>شماره سند:</strong> ${selectedDocForView.docNumber}</div>
                            <div><strong>تاریخ ثبت:</strong> ${selectedDocForView.dateJalali}</div>
                            <div><strong>وضعیت سند:</strong> ${selectedDocForView.status === 'PERMANENT' ? 'ثبت قطعی' : selectedDocForView.status === 'APPROVED' ? 'تأییدشده' : 'پیش‌نویس'}</div>
                          </div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 11px;">
                          <strong>شرح کلی سند:</strong> ${selectedDocForView.descriptionFa}
                          ${selectedDocForView.referenceNumber ? ` | <strong>عطف/پیگیری:</strong> ${selectedDocForView.referenceNumber}` : ''}
                        </div>

                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
                          <thead>
                            <tr style="background: #f1f5f9; color: #1e293b; font-weight: 700;">
                              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 35px;">ردیف</th>
                              <th style="border: 1px solid #cbd5e1; padding: 6px; width: 80px;">کد حساب</th>
                              <th style="border: 1px solid #cbd5e1; padding: 6px;">عنوان سرفصل حسابداری</th>
                              <th style="border: 1px solid #cbd5e1; padding: 6px;">تفصیلی / طرف حساب</th>
                              <th style="border: 1px solid #cbd5e1; padding: 6px;">شرح آرتیکل</th>
                              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 110px;">بدهکار (تومان)</th>
                              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 110px;">بستانکار (تومان)</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${rowsHtml}
                          </tbody>
                          <tfoot>
                            <tr style="background: #ede9fe; font-weight: 800; border-top: 2px solid #7c3aed;">
                              <td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">جمع کل مبالغ سند (تراز)</td>
                              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-family: monospace; color: #047857;">${(selectedDocForView.totalDebitIrr / 10).toLocaleString()}</td>
                              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-family: monospace; color: #1d4ed8;">${(selectedDocForView.totalCreditIrr / 10).toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>

                        <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 11px; font-weight: bold;">
                          <div style="width: 30%; border-top: 1px dashed #94a3b8; padding-top: 8px;">
                            تنظیم‌کننده:<br/>
                            <span style="font-weight: normal; color: #64748b;">${selectedDocForView.createdByName}</span>
                          </div>
                          <div style="width: 30%; border-top: 1px dashed #94a3b8; padding-top: 8px;">
                            تایید حسابداری:<br/>
                            <span style="font-weight: normal; color: #64748b;">${selectedDocForView.approvedByName || 'امضا شده'}</span>
                          </div>
                          <div style="width: 30%; border-top: 1px dashed #94a3b8; padding-top: 8px;">
                            مدیر مالی و ممیزی:<br/>
                            <span style="font-weight: normal; color: #64748b;">${selectedDocForView.permanentByName || 'مهر و تایید نهایی'}</span>
                          </div>
                        </div>
                      </div>
                    `;

                    await printHtmlContent({
                      title: `برگه سند حسابداری ${selectedDocForView.docNumber}`,
                      bodyHtml,
                      isThermal: false,
                    });
                  }}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  چاپ مستقیم برگه سند
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NEW ACCOUNTING DOCUMENT (ثبت سند حسابداری جدید) */}
      {/* ========================================================================= */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                ثبت سند حسابداری دوطرفه جدید
              </h3>
              <button
                type="button"
                onClick={() => setIsNewDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ سند (شمسی):
                  </label>
                  <input
                    type="text"
                    value={newDocDateJalali}
                    onChange={(e) => setNewDocDateJalali(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره عطف / پیگیری:
                  </label>
                  <input
                    type="text"
                    value={newDocRefNumber}
                    onChange={(e) => setNewDocRefNumber(e.target.value)}
                    placeholder="اختیاری (مانند REF-1029)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شرح کلی سند حسابداری:
                  </label>
                  <input
                    type="text"
                    value={newDocDescriptionFa}
                    onChange={(e) => setNewDocDescriptionFa(e.target.value)}
                    placeholder="مثال: تسویه مطالبات و ثبت تنخواه‌گردان..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* LINES EDITOR */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">
                    آرتیکل‌های بدهکار و بستانکار سند (حداقل ۲ سطر):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewDocLines((prev) => [
                        ...prev,
                        {
                          accountCode: '10101',
                          accountTitleFa: 'صندوق‌های فروشگاه و دفتر مرکزی',
                          detailTitleFa: '',
                          debitIrr: 0,
                          creditIrr: 0,
                          descriptionFa: newDocDescriptionFa,
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg border border-purple-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن سطر جدید
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-center w-10">ردیف</th>
                        <th className="p-2 w-52">سرفصل حساب (معین)</th>
                        <th className="p-2 w-36">تفصیلی / طرف حساب</th>
                        <th className="p-2">شرح آرتیکل</th>
                        <th className="p-2 w-32 text-left text-emerald-800">بدهکار (ریال)</th>
                        <th className="p-2 w-32 text-left text-blue-800">بستانکار (ریال)</th>
                        <th className="p-2 text-center w-10">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newDocLines.map((line, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2">
                            <select
                              value={line.accountCode}
                              onChange={(e) => {
                                const selected = accountsChart.find((a) => a.code === e.target.value);
                                setNewDocLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx
                                      ? {
                                          ...l,
                                          accountCode: e.target.value,
                                          accountTitleFa: selected?.titleFa || '',
                                        }
                                      : l
                                  )
                                );
                              }}
                              className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none"
                            >
                              {accountsChart
                                .filter((a) => a.level === 'SUBSIDIARY')
                                .map((a) => (
                                  <option key={a.code} value={a.code}>
                                    [{a.code}] {a.titleFa}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.detailTitleFa}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewDocLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, detailTitleFa: val } : l))
                                );
                              }}
                              placeholder="اختیاری..."
                              className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.descriptionFa}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewDocLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, descriptionFa: val } : l))
                                );
                              }}
                              placeholder="شرح این ردیف..."
                              className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={line.debitIrr || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewDocLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, debitIrr: val, creditIrr: val > 0 ? 0 : l.creditIrr } : l
                                  )
                                );
                              }}
                              placeholder="0"
                              className="w-full p-1.5 text-xs bg-emerald-50/50 border border-slate-200 rounded text-left font-mono font-bold text-emerald-800 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={line.creditIrr || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewDocLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, creditIrr: val, debitIrr: val > 0 ? 0 : l.debitIrr } : l
                                  )
                                );
                              }}
                              placeholder="0"
                              className="w-full p-1.5 text-xs bg-blue-50/50 border border-slate-200 rounded text-left font-mono font-bold text-blue-800 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {newDocLines.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setNewDocLines((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-xs">
                          جمع ستون‌ها و کنترل تراز:
                        </td>
                        <td className="p-2 text-left font-mono text-emerald-800 text-xs">
                          {newDocTotalDebit.toLocaleString()}
                        </td>
                        <td className="p-2 text-left font-mono text-blue-800 text-xs">
                          {newDocTotalCredit.toLocaleString()}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Balance Validation Card */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  isNewDocBalanced
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isNewDocBalanced ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span>سند کاملاً تراز است و مبالغ بدهکار و بستانکار منطبق می‌باشند.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <span>
                        سند نامتراز است! اختلاف بدهکار و بستانکار: {newDocDifference.toLocaleString()} ریال
                      </span>
                    </>
                  )}
                </div>
                <span className="font-mono">
                  تراز: {newDocTotalDebit.toLocaleString()} = {newDocTotalCredit.toLocaleString()}
                </span>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!isNewDocBalanced || isSubmittingDoc}
                  className={`px-6 py-2 rounded-lg text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-colors ${
                    isNewDocBalanced && !isSubmittingDoc
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSubmittingDoc ? 'در حال ثبت و ممیزی...' : 'ثبت قطعی سند حسابداری'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW ACCOUNT IN CHART */}
      {/* ========================================================================= */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ListTree className="w-4 h-4 text-purple-600" />
                تعریف سرفصل معین جدید
              </h3>
              <button
                type="button"
                onClick={() => setIsNewAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">کد حساب معین:</label>
                <input
                  type="text"
                  placeholder="مثال: 10104 یا 80107"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان حساب:</label>
                <input
                  type="text"
                  placeholder="مثال: هزینه بسته‌بندی و ارسال..."
                  value={newAccTitleFa}
                  onChange={(e) => setNewAccTitleFa(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ماهیت حساب:</label>
                  <select
                    value={newAccNature}
                    onChange={(e) => setNewAccNature(e.target.value as 'DEBIT' | 'CREDIT')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="DEBIT">بدهکار (DEBIT)</option>
                    <option value="CREDIT">بستانکار (CREDIT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طبقه دارایی/هزینه:</label>
                  <select
                    value={newAccGroupCode}
                    onChange={(e) => {
                      const code = e.target.value as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
                      setNewAccGroupCode(code);
                      const titles: Record<string, string> = {
                        '1': 'دارایی‌های جاری',
                        '2': 'دارایی‌های غیرجاری',
                        '3': 'بدهی‌های جاری',
                        '5': 'حقوق صاحبان سرمایه',
                        '6': 'درآمدها و فروش',
                        '7': 'بهای تمام‌شده',
                        '8': 'هزینه‌های عملیاتی و اداری',
                      };
                      setNewAccGroupTitleFa(titles[code] || 'سایر');
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="1">[1] دارایی‌های جاری</option>
                    <option value="3">[3] بدهی‌های جاری</option>
                    <option value="6">[6] درآمدها و فروش</option>
                    <option value="7">[7] بهای تمام‌شده</option>
                    <option value="8">[8] هزینه‌های عملیاتی</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  ثبت حساب در سرفصل‌ها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: NEW FIXED ASSET */}
      {/* ========================================================================= */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600" />
                ثبت دارایی ثابت جدید در سیستم
              </h3>
              <button
                type="button"
                onClick={() => setIsNewAssetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch('/api/fixed-assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newAssetForm),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    setFeedback({ type: 'success', message: data.messageFa });
                    setIsNewAssetModalOpen(false);
                    onRefresh();
                    refreshAccountingData();
                  } else {
                    setFeedback({ type: 'error', message: data.messageFa });
                  }
                } catch {
                  setFeedback({ type: 'error', message: 'خطا در ثبت دارایی ثابت.' });
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان کامل دارایی ثابت:</label>
                <input
                  type="text"
                  required
                  value={newAssetForm.titleFa}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, titleFa: e.target.value })}
                  placeholder="مثال: سرور محاسباتی اختصاصی، خودرو وانت یا تجهیزات آزمایشگاه..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">کد اموال (اختیاری):</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newAssetForm.assetCode}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, assetCode: e.target.value })}
                    placeholder="AST-1405-003"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ خرید (شمسی):</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newAssetForm.purchaseDateJalali}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, purchaseDateJalali: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">بهای تمام‌شده خرید (ریال):</label>
                  <input
                    type="number"
                    dir="ltr"
                    required
                    value={newAssetForm.purchaseCostIrr}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, purchaseCostIrr: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ارزش اسقاط (ریال):</label>
                  <input
                    type="number"
                    dir="ltr"
                    value={newAssetForm.salvageValueIrr}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, salvageValueIrr: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">عمر مفید (سال):</label>
                  <input
                    type="number"
                    dir="ltr"
                    min={1}
                    max={50}
                    value={newAssetForm.usefulLifeYears}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, usefulLifeYears: Number(e.target.value) || 5 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">روش استهلاک:</label>
                  <select
                    value={newAssetForm.depreciationMethod}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, depreciationMethod: e.target.value as 'STRAIGHT_LINE' | 'DECLINING_BALANCE' })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="STRAIGHT_LINE">خط مستقیم (Straight Line)</option>
                    <option value="DECLINING_BALANCE">نزولی (Declining Balance)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تحویل‌گیرنده / مسئول:</label>
                  <input
                    type="text"
                    value={newAssetForm.custodianTitleFa}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, custodianTitleFa: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">محل نگهداری فیزیکی:</label>
                  <input
                    type="text"
                    value={newAssetForm.locationAddressFa}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, locationAddressFa: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewAssetModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  ثبت دارایی ثابت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MASTER MODAL FOR INSTANT PARTY, WAREHOUSE, BANK & CASH BOX CREATION */}
      {quickMasterType && (
        <QuickMasterModal
          isOpen={true}
          onClose={() => setQuickMasterType(null)}
          type={quickMasterType}
          defaultPartyRole={quickMasterRole}
          onSuccess={async (result) => {
            if (result.type === 'PARTY') {
              setSimpleParties((prev) => [
                ...prev,
                {
                  partyId: result.id,
                  partyTitleFa: result.title,
                  type: 'DEBTOR',
                  amountIrr: 0,
                },
              ]);
            } else if (result.type === 'BANK_ACCOUNT') {
              setSimpleBanks((prev) => [
                ...prev,
                {
                  id: result.id,
                  titleFa: result.title,
                  balanceIrr: 0,
                },
              ]);
            } else if (result.type === 'CASH_BOX') {
              setSimpleCashes((prev) => [
                ...prev,
                {
                  id: result.id,
                  titleFa: result.title,
                  balanceIrr: 0,
                },
              ]);
            }
            if (onRefresh) await onRefresh();
            setQuickMasterType(null);
          }}
          onRefresh={onRefresh}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={docToDelete !== null}
        title="تایید حذف سند حسابداری"
        message={`آیا از حذف کامل سند حسابداری شماره «${docToDelete?.docNumber}» اطمینان دارید؟`}
        details={`شرح سند: ${docToDelete?.descriptionFa}\nتاریخ: ${docToDelete?.dateJalali || '-'}`}
        errorMessage={deleteDocError}
        confirmText="حذف سند"
        cancelText="انصراف"
        isLoading={isDeletingDoc}
        isDestructive={true}
        onConfirm={handleConfirmDeleteDoc}
        onClose={() => {
          setDocToDelete(null);
          setDeleteDocError(null);
        }}
      />
    </div>
  );
};
