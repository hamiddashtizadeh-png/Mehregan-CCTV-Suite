import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  User,
  Phone,
  Smartphone,
  MapPin,
  FileText,
  CreditCard,
  Briefcase,
  Wrench,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Plus,
  ShieldAlert,
  ArrowUpDown,
  FileCheck2,
  History,
  X,
  ExternalLink,
  Wallet,
  Printer,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import {
  PartyRecord,
  PartyPrimaryType,
  PersonType,
  PartyStatus,
  PartyTransactionRecord,
  DuplicateCandidate,
  FoundationDataResponse,
} from '../types/foundation';
import { printHtmlContent } from '../utils/printUtils';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PartiesManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => Promise<void>;
}

const TYPE_CONFIG: Record<
  PartyPrimaryType,
  { labelFa: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  CUSTOMER: {
    labelFa: 'مشتری',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: User,
  },
  SUPPLIER: {
    labelFa: 'تأمین‌کننده',
    colorClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Building2,
  },
  INSTALLER: {
    labelFa: 'نصاب / تکنسین',
    colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Wrench,
  },
  PARTNER_OTHER: {
    labelFa: 'همکار / سایر',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Briefcase,
  },
};

export const PartiesManagementView: React.FC<PartiesManagementViewProps> = ({
  foundationData,
  onRefresh,
}) => {
  const [parties, setParties] = useState<PartyRecord[]>(foundationData.parties || []);
  const [loading, setLoading] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<PartyRecord | null>(null);
  const [isDeletingParty, setIsDeletingParty] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedTypeTab, setSelectedTypeTab] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<PartyRecord | null>(null);
  const [viewingPartyDetail, setViewingPartyDetail] = useState<
    (PartyRecord & { transactions: PartyTransactionRecord[] }) | null
  >(null);
  const [isAttachRecordOpen, setIsAttachRecordOpen] = useState(false);
  const [settlingParty, setSettlingParty] = useState<PartyRecord | null>(null);
  const [settleForm, setSettleForm] = useState<{
    txType: 'RECEIPT' | 'PAYMENT';
    amountIrr: string;
    dateJalali: string;
    paymentMethod: 'POS' | 'CHEQUE' | 'BANK_TRANSFER' | 'CASH' | 'INSTALLMENT';
    bankAccountId: number;
    cashBoxId: number;
    chequeNumber: string;
    chequeDueDateJalali: string;
    bankNameFa: string;
    referenceNumber: string;
    installmentCount: number;
    descriptionFa: string;
  }>({
    txType: 'RECEIPT',
    amountIrr: '',
    dateJalali: '1405/01/25',
    paymentMethod: 'POS',
    bankAccountId: 1,
    cashBoxId: 1,
    chequeNumber: '',
    chequeDueDateJalali: '1405/02/25',
    bankNameFa: 'بانک ملت',
    referenceNumber: '',
    installmentCount: 4,
    descriptionFa: '',
  });

  // Detailed Party Ledger Statement State
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('1404/01/01');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('1405/12/29');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>('');

  const filteredLedgerTxs = useMemo(() => {
    if (!viewingPartyDetail?.transactions) return [];
    return viewingPartyDetail.transactions.filter((tx) => {
      const matchDate = (!ledgerStartDate || tx.dateJalali >= ledgerStartDate) && (!ledgerEndDate || tx.dateJalali <= ledgerEndDate);
      const q = (ledgerSearchQuery || '').trim().toLowerCase();
      const matchSearch = !q || (tx.titleFa || '').toLowerCase().includes(q) || (tx.referenceNumber || '').toLowerCase().includes(q);
      return matchDate && matchSearch;
    });
  }, [viewingPartyDetail, ledgerStartDate, ledgerEndDate, ledgerSearchQuery]);

  const handleExportLedgerExcel = (partyName: string, transactions: any[]) => {
    let csv = '\uFEFFکد/شماره مرجع,تاریخ جلالی,نوع سند,عنوان و شرح,بدهکار (ریال),بستانکار (ریال),وضعیت\n';
    transactions.forEach((tx) => {
      const isDebit = tx.recordType === 'SALE_INVOICE' || tx.recordType === 'PAYMENT' || tx.recordType === 'CCTV_PROJECT';
      const debit = isDebit ? tx.amountIrr : 0;
      const credit = !isDebit ? tx.amountIrr : 0;
      const title = (tx.titleFa || '').replace(/,/g, ' ');
      csv += `${tx.referenceNumber || tx.id},${tx.dateJalali},${tx.recordType},${title},${debit},${credit},${tx.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `صورت_حساب_تفصیلی_${partyName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintLedger = async (party: PartyRecord, transactions: any[]) => {
    const rowsHtml = transactions
      .map((tx, idx) => {
        const isDebit =
          tx.recordType === 'SALE_INVOICE' || tx.recordType === 'PAYMENT' || tx.recordType === 'CCTV_PROJECT';
        const debit = isDebit ? tx.amountIrr : 0;
        const credit = !isDebit ? tx.amountIrr : 0;
        return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:center;">${tx.dateJalali}</td>
          <td style="text-align:center; font-family: monospace;">${tx.referenceNumber || '—'}</td>
          <td>${tx.titleFa} ${tx.notesFa ? `<br/><small style="color:#666;">${tx.notesFa}</small>` : ''}</td>
          <td style="text-align:left; font-family: monospace;">${debit ? debit.toLocaleString('fa-IR') : '۰'}</td>
          <td style="text-align:left; font-family: monospace;">${credit ? credit.toLocaleString('fa-IR') : '۰'}</td>
        </tr>
      `;
      })
      .join('');

    const totalDebit = transactions.reduce(
      (s, tx) =>
        tx.recordType === 'SALE_INVOICE' || tx.recordType === 'PAYMENT' || tx.recordType === 'CCTV_PROJECT'
          ? s + Number(tx.amountIrr)
          : s,
      0
    );
    const totalCredit = transactions.reduce(
      (s, tx) =>
        tx.recordType !== 'SALE_INVOICE' && tx.recordType !== 'PAYMENT' && tx.recordType !== 'CCTV_PROJECT'
          ? s + Number(tx.amountIrr)
          : s,
      0
    );
    const balance = totalDebit - totalCredit;

    const bodyHtml = `
      <div style="font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; text-align: right; color: #111; font-size: 11px;">
        <div style="text-align: center; border-bottom: 2px solid #0369a1; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin:0 0 6px 0; font-size: 16px; font-weight: 800; color: #0369a1;">گروه فنی مهندسی مهرگان - صورت‌حساب تفصیلی طرف تجاری</h2>
          <p style="margin:0; color:#555; font-size: 11px;">بازه گزارش: ${ledgerStartDate} الی ${ledgerEndDate} · تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</p>
        </div>
        <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; font-size: 11px;">
          <div><strong>نام شخص / شرکت:</strong> ${party.fullName} (${party.partyCode})</div>
          <div><strong>شماره همراه:</strong> ${party.mobile || '—'}</div>
          <div><strong>کد ملی / اقتصادی:</strong> ${party.nationalId || party.economicCode || '—'}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <th style="border: 1px solid #cbd5e1; padding: 7px; text-align:center; width: 35px;">ردیف</th>
              <th style="border: 1px solid #cbd5e1; padding: 7px; text-align:center;">تاریخ</th>
              <th style="border: 1px solid #cbd5e1; padding: 7px; text-align:center;">شماره مرجع</th>
              <th style="border: 1px solid #cbd5e1; padding: 7px;">شرح تراکنش مالی</th>
              <th style="border: 1px solid #cbd5e1; padding: 7px; text-align:left;">بدهکار (ریال)</th>
              <th style="border: 1px solid #cbd5e1; padding: 7px; text-align:left;">بستانکار (ریال)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 12px;">هیچ تراکنشی در این بازه زمانی یافت نشد</td></tr>'}
          </tbody>
        </table>
        <div style="display: flex; justify-content: space-between; font-weight: bold; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
          <span>گردش بدهکار: ${totalDebit.toLocaleString('fa-IR')} ریال</span>
          <span>گردش بستانکار: ${totalCredit.toLocaleString('fa-IR')} ریال</span>
          <span style="color: ${balance >= 0 ? '#b91c1c' : '#047857'}">مانده نهایی: ${Math.abs(balance).toLocaleString('fa-IR')} ریال (${balance >= 0 ? 'بدهکار' : 'بستانکار'})</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-weight: bold; font-size: 11px;">
          <div style="width: 45%; border-top: 1px dashed #94a3b8; padding-top: 8px;">امضاء و تایید مسئول حسابداری</div>
          <div style="width: 45%; border-top: 1px dashed #94a3b8; padding-top: 8px;">امضاء و مهر طرف تجاری</div>
        </div>
      </div>
    `;

    await printHtmlContent({
      title: `صورت‌حساب تفصیلی - ${party.fullName}`,
      bodyHtml,
      isThermal: false,
    });
  };

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: 'SUCCESS' | 'ERROR';
    textFa: string;
  } | null>(null);

  // Form State for Create/Edit
  const [formData, setFormData] = useState<{
    personType: PersonType;
    primaryType: PartyPrimaryType;
    roles: PartyPrimaryType[];
    fullName: string;
    companyTitle: string;
    nationalId: string;
    economicCode: string;
    registrationNumber: string;
    mobile: string;
    phone: string;
    fax: string;
    email: string;
    province: string;
    city: string;
    postalCode: string;
    addressFa: string;
    status: PartyStatus;
    creditLimitIrr: string;
    installerSkills: string;
    notes: string;
  }>({
    personType: 'NATURAL',
    primaryType: 'CUSTOMER',
    roles: ['CUSTOMER'],
    fullName: '',
    companyTitle: '',
    nationalId: '',
    economicCode: '',
    registrationNumber: '',
    mobile: '',
    phone: '',
    fax: '',
    email: '',
    province: 'تهران',
    city: 'تهران',
    postalCode: '',
    addressFa: '',
    status: 'ACTIVE',
    creditLimitIrr: '0',
    installerSkills: '',
    notes: '',
  });

  // Duplicate Check State
  const [duplicateCheckState, setDuplicateCheckState] = useState<{
    loading: boolean;
    hasDuplicate: boolean;
    isBlocking: boolean;
    messageFa: string;
    duplicates: DuplicateCandidate[];
  }>({
    loading: false,
    hasDuplicate: false,
    isBlocking: false,
    messageFa: '',
    duplicates: [],
  });
  const [allowDuplicateConfirmed, setAllowDuplicateConfirmed] = useState(false);

  // New Transaction Attachment Form
  const [newTxForm, setNewTxForm] = useState<{
    recordType: 'SALE_INVOICE' | 'PURCHASE_INVOICE' | 'PAYMENT' | 'RECEIPT' | 'CCTV_PROJECT';
    referenceNumber: string;
    titleFa: string;
    amountIrr: string;
    dateJalali: string;
    status: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS' | 'SETTLED';
    notesFa: string;
  }>({
    recordType: 'SALE_INVOICE',
    referenceNumber: '',
    titleFa: '',
    amountIrr: '',
    dateJalali: '1405/01/25',
    status: 'COMPLETED',
    notesFa: '',
  });

  const fetchPartiesList = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedTypeTab !== 'ALL') q.set('type', selectedTypeTab);
      if (selectedStatus !== 'ALL') q.set('status', selectedStatus);
      if (searchQuery.trim()) q.set('search', searchQuery.trim());

      const res = await fetch(`/api/parties?${q.toString()}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.parties)) {
        setParties(data.parties);
      }
    } catch {
      // transient
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartiesList();
  }, [selectedTypeTab, selectedStatus, searchQuery]);

  // Real-time duplicate check as user enters national ID, mobile, or name
  useEffect(() => {
    if (!isCreateModalOpen && !editingParty) return;

    if (
      formData.fullName.trim().length >= 3 ||
      formData.mobile.trim().length >= 5 ||
      formData.nationalId.trim().length >= 4
    ) {
      const timer = setTimeout(async () => {
        setDuplicateCheckState((prev) => ({ ...prev, loading: true }));
        try {
          const res = await fetch('/api/parties/check-duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              partyId: editingParty?.id,
              fullName: formData.fullName,
              nationalId: formData.nationalId || null,
              mobile: formData.mobile,
              economicCode: formData.economicCode || null,
            }),
          });
          const json = await res.json();
          if (json.ok) {
            setDuplicateCheckState({
              loading: false,
              hasDuplicate: json.hasDuplicate,
              isBlocking: json.isBlocking,
              messageFa: json.messageFa,
              duplicates: json.duplicates || [],
            });
          }
        } catch {
          setDuplicateCheckState((prev) => ({ ...prev, loading: false }));
        }
      }, 400);

      return () => clearTimeout(timer);
    } else {
      setDuplicateCheckState({
        loading: false,
        hasDuplicate: false,
        isBlocking: false,
        messageFa: '',
        duplicates: [],
      });
    }
  }, [formData.fullName, formData.mobile, formData.nationalId, isCreateModalOpen, editingParty]);

  const stats = useMemo(() => {
    const total = parties.length;
    const customers = parties.filter(
      (p) => p.primaryType === 'CUSTOMER' || (p.roles && p.roles.includes('CUSTOMER'))
    ).length;
    const suppliers = parties.filter(
      (p) => p.primaryType === 'SUPPLIER' || (p.roles && p.roles.includes('SUPPLIER'))
    ).length;
    const installers = parties.filter(
      (p) => p.primaryType === 'INSTALLER' || (p.roles && p.roles.includes('INSTALLER'))
    ).length;
    const totalCreditIrr = parties.reduce(
      (acc, p) => acc + (p.transactionsSummary?.totalSalesIrr || 0),
      0
    );
    return { total, customers, suppliers, installers, totalCreditIrr };
  }, [parties]);

  const handleOpenCreateModal = () => {
    setEditingParty(null);
    setFormData({
      personType: 'NATURAL',
      primaryType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      fullName: '',
      companyTitle: '',
      nationalId: '',
      economicCode: '',
      registrationNumber: '',
      mobile: '',
      phone: '',
      fax: '',
      email: '',
      province: 'تهران',
      city: 'تهران',
      postalCode: '',
      addressFa: '',
      status: 'ACTIVE',
      creditLimitIrr: '0',
      installerSkills: '',
      notes: '',
    });
    setDuplicateCheckState({
      loading: false,
      hasDuplicate: false,
      isBlocking: false,
      messageFa: '',
      duplicates: [],
    });
    setAllowDuplicateConfirmed(false);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (party: PartyRecord) => {
    setEditingParty(party);
    setFormData({
      personType: party.personType,
      primaryType: party.primaryType,
      roles: party.roles || [party.primaryType],
      fullName: party.fullName,
      companyTitle: party.companyTitle || '',
      nationalId: party.nationalId || '',
      economicCode: party.economicCode || '',
      registrationNumber: party.registrationNumber || '',
      mobile: party.mobile,
      phone: party.phone || '',
      fax: party.fax || '',
      email: party.email || '',
      province: party.province || 'تهران',
      city: party.city || 'تهران',
      postalCode: party.postalCode || '',
      addressFa: party.addressFa || '',
      status: party.status,
      creditLimitIrr: String(party.creditLimitIrr || 0),
      installerSkills: party.installerSkills || '',
      notes: party.notes || '',
    });
    setDuplicateCheckState({
      loading: false,
      hasDuplicate: false,
      isBlocking: false,
      messageFa: '',
      duplicates: [],
    });
    setAllowDuplicateConfirmed(false);
    setIsCreateModalOpen(true);
  };

  const handleViewPartyDetail = async (partyId: number) => {
    try {
      const res = await fetch(`/api/parties/${partyId}`);
      const json = await res.json();
      if (json.ok && json.party) {
        setViewingPartyDetail(json.party);
      }
    } catch {
      // transient
    }
  };

  const handleToggleStatus = async (partyId: number) => {
    try {
      const res = await fetch(`/api/parties/${partyId}/status`, { method: 'PATCH' });
      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: 'SUCCESS', textFa: json.messageFa });
        await fetchPartiesList();
        if (viewingPartyDetail && viewingPartyDetail.id === partyId) {
          await handleViewPartyDetail(partyId);
        }
      } else {
        setFeedback({ type: 'ERROR', textFa: json.messageFa || 'خطا در تغییر وضعیت.' });
      }
    } catch {
      setFeedback({ type: 'ERROR', textFa: 'خطای شبکه در تغییر وضعیت شخص.' });
    }
  };

  const handleDeleteParty = (partyId: number) => {
    const target = parties.find((p) => p.id === partyId);
    if (target) {
      setDeleteError(null);
      setPartyToDelete(target);
    }
  };

  const handleConfirmDeleteParty = async () => {
    if (!partyToDelete) return;
    setIsDeletingParty(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/parties/${partyToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: 'SUCCESS', textFa: json.messageFa || `پرونده «${partyToDelete.fullName || partyToDelete.companyTitle}» با موفقیت حذف گردید.` });
        if (viewingPartyDetail && viewingPartyDetail.id === partyToDelete.id) {
          setViewingPartyDetail(null);
        }
        setPartyToDelete(null);
        setDeleteError(null);
        await fetchPartiesList();
        onRefresh();
      } else {
        const msg = json.messageFa || 'امکان حذف طرف تجاری وجود ندارد به دلیل وجود اسناد وابسته‌ی مالی، فاکتور یا چک.';
        setDeleteError(msg);
        setFeedback({
          type: 'ERROR',
          textFa: msg,
        });
      }
    } catch {
      const msg = 'خطای شبکه در ارتباط با سرور در هنگام حذف طرف تجاری.';
      setDeleteError(msg);
      setFeedback({ type: 'ERROR', textFa: msg });
    } finally {
      setIsDeletingParty(false);
    }
  };

  const handleSavePartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (duplicateCheckState.isBlocking) {
      setFeedback({
        type: 'ERROR',
        textFa: 'کد ملی یا شناسه ملی تکراری است و مانع از ثبت اطلاعات می‌شود.',
      });
      return;
    }

    if (duplicateCheckState.hasDuplicate && !allowDuplicateConfirmed && !editingParty) {
      setFeedback({
        type: 'ERROR',
        textFa: 'شخص مشابه در سیستم یافت شد. تایید صریح ثبت شخص تکراری الزامی است.',
      });
      return;
    }

    try {
      const url = editingParty ? `/api/parties/${editingParty.id}` : '/api/parties';
      const method = editingParty ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        creditLimitIrr: Number(formData.creditLimitIrr || 0),
        allowDuplicates: allowDuplicateConfirmed,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: 'SUCCESS', textFa: json.messageFa });
        setIsCreateModalOpen(false);
        await fetchPartiesList();
        await onRefresh();
      } else {
        setFeedback({ type: 'ERROR', textFa: json.messageFa || 'خطا در ثبت اطلاعات شخص.' });
      }
    } catch {
      setFeedback({ type: 'ERROR', textFa: 'خطای شبکه در ذخیره طرف تجاری.' });
    }
  };

  const handleAttachTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingPartyDetail) return;

    try {
      const res = await fetch(`/api/parties/${viewingPartyDetail.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTxForm,
          amountIrr: Number(newTxForm.amountIrr || 0),
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: 'SUCCESS', textFa: json.messageFa });
        setIsAttachRecordOpen(false);
        setNewTxForm({
          recordType: 'SALE_INVOICE',
          referenceNumber: '',
          titleFa: '',
          amountIrr: '',
          dateJalali: '1405/01/25',
          status: 'COMPLETED',
          notesFa: '',
        });
        await handleViewPartyDetail(viewingPartyDetail.id);
        await fetchPartiesList();
      } else {
        setFeedback({ type: 'ERROR', textFa: json.messageFa || 'خطا در ثبت سند.' });
      }
    } catch {
      setFeedback({ type: 'ERROR', textFa: 'خطای شبکه در اتصال سند.' });
    }
  };

  const handleOpenSettlementModal = (party: PartyRecord) => {
    const netBal = party.transactionsSummary?.netBalanceIrr || 0;
    // If debtor (netBal < 0), default to RECEIPT; if creditor (netBal > 0), default to PAYMENT
    const defaultTx: 'RECEIPT' | 'PAYMENT' = netBal < 0 ? 'RECEIPT' : 'PAYMENT';
    const absBal = Math.abs(netBal);
    setSettlingParty(party);
    setSettleForm({
      txType: defaultTx,
      amountIrr: absBal > 0 ? String(absBal) : '',
      dateJalali: '1405/01/25',
      paymentMethod: 'POS',
      bankAccountId: foundationData.bankAccounts?.[0]?.id || 1,
      cashBoxId: foundationData.cashBoxes?.[0]?.id || 1,
      chequeNumber: '',
      chequeDueDateJalali: '1405/02/25',
      bankNameFa: 'بانک ملت',
      referenceNumber: '',
      installmentCount: 4,
      descriptionFa: `تسویه حساب ${defaultTx === 'RECEIPT' ? 'دریافت از' : 'پرداخت به'} ${party.fullName || party.companyTitle}`,
    });
  };

  const handleSaveSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingParty) return;
    const amount = Number(settleForm.amountIrr || 0);
    if (amount <= 0) {
      setFeedback({ type: 'ERROR', textFa: 'مبلغ تسویه باید بزرگتر از صفر باشد.' });
      return;
    }

    try {
      const res = await fetch(`/api/parties/${settlingParty.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settleForm,
          amountIrr: amount,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: 'SUCCESS', textFa: json.messageFa || 'تسویه حساب طرف تجاری با موفقیت در خزانه و اسناد مالی ثبت شد.' });
        setSettlingParty(null);
        await fetchPartiesList();
        await onRefresh();
      } else {
        setFeedback({ type: 'ERROR', textFa: json.messageFa || 'خطا در ثبت تسویه حساب.' });
      }
    } catch {
      setFeedback({ type: 'ERROR', textFa: 'خطای شبکه در ارتباط با سرور جهت تسویه حساب.' });
    }
  };

  const toggleRoleSelection = (role: PartyPrimaryType) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(role);
      let updated: PartyPrimaryType[];
      if (exists) {
        if (prev.roles.length === 1) return prev; // At least one role must remain
        updated = prev.roles.filter((r) => r !== role);
      } else {
        updated = [...prev.roles, role];
      }
      return {
        ...prev,
        roles: updated,
        primaryType: updated[0] || 'CUSTOMER',
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert / Feedback Notification */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            feedback.type === 'SUCCESS'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-red-300 bg-red-50 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === 'SUCCESS' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
            )}
            <span>{feedback.textFa}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline hover:no-underline font-semibold"
          >
            بستن
          </button>
        </div>
      )}

      {/* Header and Summary Cards */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 shrink-0" />
            <span>ماژول اشخاص و طرف‌های تجاری (مرحله ۳)</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            مدیریت یکپارچه مشتریان، تأمین‌کنندگان، نصابان دوربین مداربسته، کنترل هوشمند تکرار و سوابق اسناد
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>تعریف شخص / طرف تجاری جدید</span>
        </button>
      </div>

      {/* KPI / Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>کل طرف‌های تجاری</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-500">پرونده ثبت‌شده در دیتابیس</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-blue-700 text-xs">
            <span>مشتریان فروشگاه و پروژه</span>
            <User className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-900">{stats.customers}</div>
          <div className="text-[11px] text-slate-500">طرف حساب فروش و خدمات</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-purple-700 text-xs">
            <span>تأمین‌کنندگان تجهیزات</span>
            <Building2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-900">{stats.suppliers}</div>
          <div className="text-[11px] text-slate-500">واردکنندگان و شرکت‌های پخش</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-xs">
            <span>نصابان و تکنسین‌ها</span>
            <Wrench className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900">{stats.installers}</div>
          <div className="text-[11px] text-slate-500">مجریان کابل‌کشی و راه‌اندازی</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: 'همه اشخاص' },
              { id: 'CUSTOMER', label: 'مشتریان' },
              { id: 'SUPPLIER', label: 'تأمین‌کنندگان' },
              { id: 'INSTALLER', label: 'نصابان و تکنسین‌ها' },
              { id: 'PARTNER_OTHER', label: 'همکاران و سایر' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTypeTab(t.id)}
                className={`rounded-lg px-3 py-1.5 font-semibold whitespace-nowrap transition-colors ${
                  selectedTypeTab === t.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">وضعیت:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="ACTIVE">فقط فعال</option>
              <option value="INACTIVE">فقط غیرفعال</option>
            </select>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، نام شرکت، شماره موبایل، کد ملی، شهر یا کد پرونده (PRT-...)"
            className="w-full rounded-lg border border-slate-300 bg-slate-50/50 pr-9 pl-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Main Parties Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">کد شخص</th>
                <th className="py-3 px-4">نام و عنوان طرف تجاری</th>
                <th className="py-3 px-4">نوع و نقش‌ها</th>
                <th className="py-3 px-4">اطلاعات تماس</th>
                <th className="py-3 px-4">شناسه / کد ملی</th>
                <th className="py-3 px-4">سوابق متصل</th>
                <th className="py-3 px-4">مانده تراز (ریال)</th>
                <th className="py-3 px-4 text-center">وضعیت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span>در حال دریافت اطلاعات اشخاص از دیتابیس...</span>
                    </div>
                  </td>
                </tr>
              ) : parties.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    هیچ طرف تجاری منطبق با فیلتر جاری یافت نشد.
                  </td>
                </tr>
              ) : (
                parties.map((party) => {
                  const typeConf = TYPE_CONFIG[party.primaryType] || TYPE_CONFIG.CUSTOMER;
                  const TypeIcon = typeConf.icon;
                  const netBal = party.transactionsSummary?.netBalanceIrr || 0;

                  return (
                    <tr key={party.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900" dir="ltr">
                        {party.partyCode}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{party.fullName}</div>
                        {party.companyTitle && (
                          <div className="text-[11px] text-slate-500">{party.companyTitle}</div>
                        )}
                        {party.installerSkills && (
                          <div className="text-[11px] text-amber-800 line-clamp-1 mt-0.5">
                            🛠️ {party.installerSkills}
                          </div>
                        )}
                      </td>

                      {/* Types & Roles */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${typeConf.colorClass}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                            <span>{typeConf.labelFa}</span>
                          </span>
                          {party.personType === 'LEGAL' && (
                            <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px]">
                              حقوقی
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="font-mono text-slate-900 flex items-center gap-1" dir="ltr">
                          <Smartphone className="h-3 w-3 text-slate-400" />
                          <span>{party.mobile}</span>
                        </div>
                        {party.phone && (
                          <div
                            className="font-mono text-[11px] text-slate-500 flex items-center gap-1"
                            dir="ltr"
                          >
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{party.phone}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>
                            {party.province} · {party.city}
                          </span>
                        </div>
                      </td>

                      {/* IDs */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700" dir="ltr">
                        {party.nationalId || '—'}
                      </td>

                      {/* Linked records summary */}
                      <td className="py-3 px-4 text-[11px]">
                        <div className="space-y-0.5">
                          <div>
                            فروش: {party.transactionsSummary?.totalSalesCount || 0} | خرید:{' '}
                            {party.transactionsSummary?.totalPurchasesCount || 0}
                          </div>
                          {party.transactionsSummary?.activeProjectsCount ? (
                            <div className="text-blue-700 font-semibold">
                              پروژه مداربسته فعال:{' '}
                              {party.transactionsSummary.activeProjectsCount}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-4 font-mono font-bold" dir="ltr">
                        <span
                          className={
                            netBal > 0
                              ? 'text-emerald-700'
                              : netBal < 0
                              ? 'text-red-700'
                              : 'text-slate-600'
                          }
                        >
                          {netBal.toLocaleString('fa-IR')}
                        </span>
                        <span className="text-[10px] text-slate-500 mr-1 font-sans">
                          {netBal > 0 ? '(بستانکار)' : netBal < 0 ? '(بدهکار)' : '(بی‌حساب)'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(party.id)}
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                            party.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                          title="کلیک برای تغییر وضعیت فعال/غیرفعال"
                        >
                          {party.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenSettlementModal(party)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                            title="تسویه حساب سریع (پوز، چک، حواله بانکی، اقساط، نقد)"
                          >
                            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                            <span>تسویه حساب</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewPartyDetail(party.id)}
                            className="p-1 rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                            title="مشاهده پرونده و سوابق متصل"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(party)}
                            className="p-1 rounded text-slate-600 hover:text-amber-600 hover:bg-slate-100"
                            title="ویرایش اطلاعات"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteParty(party.id)}
                            className="p-1 rounded text-slate-600 hover:text-red-600 hover:bg-slate-100"
                            title="حذف طرف تجاری"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* ===================================================================== */}
      {/* 1. CREATE / EDIT PARTY MODAL WITH DUPLICATE CONTROLS                  */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="h-5 w-5 text-blue-600 shrink-0" />
                <h2 className="text-base font-bold">
                  {editingParty
                    ? `ویرایش پرونده طرف تجاری [${editingParty.partyCode}]`
                    : 'تعریف طرف تجاری جدید (مشتری، تأمین‌کننده، نصاب، همکار)'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Real-time Duplicate Detection Alert Banner */}
            {duplicateCheckState.hasDuplicate && (
              <div
                className={`rounded-xl border p-4 text-xs space-y-2 ${
                  duplicateCheckState.isBlocking
                    ? 'border-red-300 bg-red-50 text-red-950'
                    : 'border-amber-300 bg-amber-50 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                  <span>
                    {duplicateCheckState.isBlocking
                      ? 'هشدار قطعی: شخص تکراری مسدودکننده شناسایی شد'
                      : 'هشدار بررسی تشابه: احتمال وجود پرونده تکراری در سیستم'}
                  </span>
                </div>
                <p>{duplicateCheckState.messageFa}</p>

                <div className="space-y-1 pt-1 font-mono text-[11px]" dir="ltr">
                  {duplicateCheckState.duplicates.map((dup) => (
                    <div
                      key={dup.partyId}
                      className="rounded bg-white/70 p-2 border border-slate-200 text-slate-800"
                    >
                      <span className="font-bold">
                        [{dup.partyCode}] {dup.fullName}
                      </span>{' '}
                      — Mobile: {dup.existingRecord.mobile} · Match:{' '}
                      {dup.matchReasons.map((r) => r.fieldTitleFa).join('، ')}
                    </div>
                  ))}
                </div>

                {!duplicateCheckState.isBlocking && (
                  <label className="flex items-center gap-2 pt-1 font-semibold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDuplicateConfirmed}
                      onChange={(e) => setAllowDuplicateConfirmed(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 h-4 w-4"
                    />
                    <span>
                      تایید می‌کنم که این شخص علی‌رغم تشابه شماره تماس یا نام، پرونده‌ای مستقل است.
                    </span>
                  </label>
                )}
              </div>
            )}

            <form onSubmit={handleSavePartySubmit} className="space-y-4 text-xs">
              {/* Row 1: Person Type & Multi-Roles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    نوع شخصیت حقوقی/حقیقی:
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="personType"
                        value="NATURAL"
                        checked={formData.personType === 'NATURAL'}
                        onChange={() => setFormData({ ...formData, personType: 'NATURAL' })}
                        className="text-blue-600"
                      />
                      <span>شخص حقیقی (فرد)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="personType"
                        value="LEGAL"
                        checked={formData.personType === 'LEGAL'}
                        onChange={() => setFormData({ ...formData, personType: 'LEGAL' })}
                        className="text-blue-600"
                      />
                      <span>شخص حقوقی (شرکت / سازمان)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    نقش‌های طرف تجاری (امکان انتخاب همزمان):
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['CUSTOMER', 'SUPPLIER', 'INSTALLER', 'PARTNER_OTHER'] as PartyPrimaryType[]).map(
                      (role) => {
                        const isSelected = formData.roles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleRoleSelection(role)}
                            className={`rounded-md px-2.5 py-1 font-semibold transition-colors border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {TYPE_CONFIG[role].labelFa}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Name & Company Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام و نام خانوادگی / عنوان کامل شرکت <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="مثال: شرکت ساختمانی نگین البرز یا مهندس علیرضا بهرامی"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    عنوان تجاری یا نام تابلو / شرکت (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formData.companyTitle}
                    onChange={(e) => setFormData({ ...formData, companyTitle: e.target.value })}
                    placeholder="مثال: بازرگانی دوربین پارس"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Row 3: National ID, Economic Code, Registration No */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    کد ملی (۱۰ رقم) / شناسه ملی (۱۱ رقم)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="10103456789"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد اقتصادی (۱۲ رقم)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.economicCode}
                    onChange={(e) => setFormData({ ...formData, economicCode: e.target.value })}
                    placeholder="411-5582-1002"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">شماره ثبت شرکت</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.registrationNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, registrationNumber: e.target.value })
                    }
                    placeholder="382109"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Row 4: Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    شماره تلفن همراه <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="09121112233"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تلفن ثابت</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="021-88992211"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">پست الکترونیک (ایمیل)</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@example.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Row 5: Address */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">استان</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">شهر</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد پستی (۱۰ رقم)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="1985713421"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">نشانی کامل</label>
                  <input
                    type="text"
                    value={formData.addressFa}
                    onChange={(e) => setFormData({ ...formData, addressFa: e.target.value })}
                    placeholder="خیابان، پلاک، واحد..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Row 6: Installer Skills & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    مهارت‌های فنی و تخصصی نصاب (دوربین IP، داهوا، هایک‌ویژن، NVR، دزدگیر)
                  </label>
                  <input
                    type="text"
                    value={formData.installerSkills}
                    onChange={(e) => setFormData({ ...formData, installerSkills: e.target.value })}
                    placeholder="مثال: کانفیگ سوییچ‌های سیسکو، فیوژن فیبر نوری، انتقال تصویر P2P"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">سقف اعتبار مالی (ریال)</label>
                  <input
                    type="number"
                    dir="ltr"
                    value={formData.creditLimitIrr}
                    onChange={(e) => setFormData({ ...formData, creditLimitIrr: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">یادداشت و ملاحظات پرونده</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="شرایط تسویه، توافقات تجاری، ملاحظات گارانتی..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={duplicateCheckState.isBlocking}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingParty ? 'ذخیره تغییرات' : 'ثبت شخص در سیستم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. PARTY PROFILE & CONNECTED TRANSACTIONS DRAWER/MODAL                */}
      {/* ===================================================================== */}
      {viewingPartyDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-200">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {viewingPartyDetail.fullName}
                    </h2>
                    <span className="font-mono text-xs font-bold text-slate-500" dir="ltr">
                      [{viewingPartyDetail.partyCode}]
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        viewingPartyDetail.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {viewingPartyDetail.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingPartyDetail.roles?.map((r) => TYPE_CONFIG[r]?.labelFa).join(' · ')} ·{' '}
                    {viewingPartyDetail.personType === 'LEGAL' ? 'شخص حقوقی' : 'شخص حقیقی'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAttachRecordOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>اتصال سند جدید</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPartyDetail(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Profile Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">شماره همراه:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {viewingPartyDetail.mobile}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">کد / شناسه ملی:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {viewingPartyDetail.nationalId || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">کد اقتصادی:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {viewingPartyDetail.economicCode || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">مانده خالص حساب:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {(viewingPartyDetail.transactionsSummary?.netBalanceIrr || 0).toLocaleString(
                    'fa-IR'
                  )}{' '}
                  ریال
                </span>
              </div>
              <div className="col-span-2 md:col-span-4 pt-1 border-t border-slate-200 text-slate-600">
                <span className="font-semibold text-slate-900">نشانی: </span>
                <span>
                  {viewingPartyDetail.province}، {viewingPartyDetail.city}،{' '}
                  {viewingPartyDetail.addressFa || 'بدون نشانی ثبت‌شده'}
                </span>
              </div>
            </div>

            {/* Connected Records & Detailed Ledger Table */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    صورت‌حساب تفصیلی (گردش بدهکار / بستانکار و مانده حساب)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintLedger(viewingPartyDetail, filteredLedgerTxs)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-700" />
                    <span>چاپ صورت‌حساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportLedgerExcel(viewingPartyDetail.fullName, filteredLedgerTxs)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>خروجی Excel / CSV</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar: Jalali Date Range & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold flex items-center justify-between">
                    <span>انتخاب شخص / طرف تجاری:</span>
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="افزودن سریع شخص جدید"
                    >
                      <Plus className="w-3 h-3" />
                      <span>شخص جدید</span>
                    </button>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={viewingPartyDetail.id}
                      onChange={(e) => handleViewPartyDetail(Number(e.target.value))}
                      className="flex-1 rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-semibold text-slate-900"
                    >
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.partyCode})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      title="افزودن سریع شخص جدید"
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">از تاریخ (شمسی):</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-mono"
                    placeholder="1404/01/01"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">تا تاریخ (شمسی):</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-mono"
                    placeholder="1405/12/29"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">جستجو در شرح اسناد:</label>
                  <input
                    type="text"
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    placeholder="شماره فاکتور، چک یا عنوان..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Turnover Metrics Cards */}
              {(() => {
                const txs = (viewingPartyDetail.transactions || []).filter((tx) => {
                  const matchDate = (!ledgerStartDate || tx.dateJalali >= ledgerStartDate) && (!ledgerEndDate || tx.dateJalali <= ledgerEndDate);
                  const q = (ledgerSearchQuery || '').trim().toLowerCase();
                  const matchSearch = !q || (tx.titleFa || '').toLowerCase().includes(q) || (tx.referenceNumber || '').toLowerCase().includes(q);
                  return matchDate && matchSearch;
                });

                const totalDebit = txs.reduce((s, tx) => (tx.recordType === 'SALE_INVOICE' || tx.recordType === 'PAYMENT' || tx.recordType === 'CCTV_PROJECT' ? s + Number(tx.amountIrr) : s), 0);
                const totalCredit = txs.reduce((s, tx) => (tx.recordType !== 'SALE_INVOICE' && tx.recordType !== 'PAYMENT' && tx.recordType !== 'CCTV_PROJECT' ? s + Number(tx.amountIrr) : s), 0);
                const netBalance = totalDebit - totalCredit;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <span className="text-blue-700 font-semibold block">مجموع گردش بدهکار:</span>
                        <span className="text-base font-mono font-extrabold text-blue-950" dir="ltr">
                          {totalDebit.toLocaleString('fa-IR')} <small className="text-[10px]">ریال</small>
                        </span>
                      </div>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                        <span className="text-purple-700 font-semibold block">مجموع گردش بستانکار:</span>
                        <span className="text-base font-mono font-extrabold text-purple-950" dir="ltr">
                          {totalCredit.toLocaleString('fa-IR')} <small className="text-[10px]">ریال</small>
                        </span>
                      </div>
                      <div className={`p-3 border rounded-xl ${netBalance >= 0 ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-emerald-50 border-emerald-200 text-emerald-950'}`}>
                        <span className="font-semibold block">مانده نهایی حساب:</span>
                        <span className="text-base font-mono font-extrabold" dir="ltr">
                          {Math.abs(netBalance).toLocaleString('fa-IR')}{' '}
                          <small className="text-[10px]">
                            ریال ({netBalance >= 0 ? 'بدهکار' : 'بستانکار'})
                          </small>
                        </span>
                      </div>
                    </div>

                    {/* Table with Debit / Credit Columns */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                          <tr>
                            <th className="py-2.5 px-3">نوع سند</th>
                            <th className="py-2.5 px-3">شماره مرجع</th>
                            <th className="py-2.5 px-3">عنوان و شرح تراکنش</th>
                            <th className="py-2.5 px-3 text-left">بدهکار (ریال)</th>
                            <th className="py-2.5 px-3 text-left">بستانکار (ریال)</th>
                            <th className="py-2.5 px-3 text-center">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {txs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-500">
                                هیچ سند یا تراکنشی بر اساس فیلترهای انتخابی یافت نشد.
                              </td>
                            </tr>
                          ) : (
                            txs.map((tx) => {
                              const isDebit = tx.recordType === 'SALE_INVOICE' || tx.recordType === 'PAYMENT' || tx.recordType === 'CCTV_PROJECT';
                              const debitVal = isDebit ? tx.amountIrr : 0;
                              const creditVal = !isDebit ? tx.amountIrr : 0;

                              return (
                                <tr key={tx.id} className="hover:bg-slate-50/70">
                                  <td className="py-2.5 px-3 font-semibold">
                                    {tx.recordType === 'SALE_INVOICE' && <span className="text-blue-700">📑 فاکتور فروش</span>}
                                    {tx.recordType === 'PURCHASE_INVOICE' && <span className="text-purple-700">📦 فاکتور خرید</span>}
                                    {tx.recordType === 'RECEIPT' && <span className="text-emerald-700">💳 دریافت / تسویه</span>}
                                    {tx.recordType === 'PAYMENT' && <span className="text-red-700">💸 پرداخت / حواله</span>}
                                    {tx.recordType === 'CCTV_PROJECT' && <span className="text-amber-800">📹 پروژه دوربین</span>}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900" dir="ltr">
                                    {tx.referenceNumber}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-medium text-slate-900">{tx.titleFa}</div>
                                    {tx.notesFa && <div className="text-[11px] text-slate-500">{tx.notesFa}</div>}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-blue-900 text-left" dir="ltr">
                                    {debitVal > 0 ? debitVal.toLocaleString('fa-IR') : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-purple-900 text-left" dir="ltr">
                                    {creditVal > 0 ? creditVal.toLocaleString('fa-IR') : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 text-center" dir="ltr">
                                    {tx.dateJalali}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingPartyDetail(null)}
                className="rounded-lg bg-slate-900 text-white px-5 py-2 text-xs font-semibold hover:bg-slate-800"
              >
                بستن پرونده
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ATTACH NEW TRANSACTION MODAL                                       */}
      {/* ===================================================================== */}
      {isAttachRecordOpen && viewingPartyDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>اتصال سند جدید به پرونده «{viewingPartyDetail.fullName}»</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAttachRecordOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAttachTransactionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">نوع سند</label>
                <select
                  value={newTxForm.recordType}
                  onChange={(e) =>
                    setNewTxForm({
                      ...newTxForm,
                      recordType: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="SALE_INVOICE">فاکتور فروش (Sale Invoice)</option>
                  <option value="PURCHASE_INVOICE">فاکتور خرید (Purchase Invoice)</option>
                  <option value="RECEIPT">دریافت وجه / چک (Receipt)</option>
                  <option value="PAYMENT">پرداخت / حواله (Payment)</option>
                  <option value="CCTV_PROJECT">پروژه نصب دوربین مداربسته (CCTV Project)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">شماره مرجع یا فاکتور</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newTxForm.referenceNumber}
                  onChange={(e) => setNewTxForm({ ...newTxForm, referenceNumber: e.target.value })}
                  placeholder="INV-1405-1025"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">عنوان و شرح سند</label>
                <input
                  type="text"
                  required
                  value={newTxForm.titleFa}
                  onChange={(e) => setNewTxForm({ ...newTxForm, titleFa: e.target.value })}
                  placeholder="مثال: فروش ۸ دستگاه دوربین IP داهوا و هارد بنفش"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مبلغ سند (ریال)</label>
                  <input
                    type="number"
                    required
                    dir="ltr"
                    value={newTxForm.amountIrr}
                    onChange={(e) => setNewTxForm({ ...newTxForm, amountIrr: e.target.value })}
                    placeholder="250000000"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاریخ جلالی</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newTxForm.dateJalali}
                    onChange={(e) => setNewTxForm({ ...newTxForm, dateJalali: e.target.value })}
                    placeholder="1405/01/25"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">یادداشت سند</label>
                <textarea
                  rows={2}
                  value={newTxForm.notesFa}
                  onChange={(e) => setNewTxForm({ ...newTxForm, notesFa: e.target.value })}
                  placeholder="جزئیات فنی یا شرایط پرداخت..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAttachRecordOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  ثبت و اتصال به پرونده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SETTLEMENT MODAL (تسویه حساب فوری طرف تجاری: پوز، چک، سند بانکی، اقساط، نقد) */}
      {settlingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-linear-to-r from-emerald-50 to-teal-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    تسویه حساب طرف تجاری
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {settlingParty.fullName || settlingParty.companyTitle} (کد: {settlingParty.partyCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlingParty(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Balance Notice */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">مانده حساب ثبت‌شده در سیستم:</span>
                <div className="font-mono font-extrabold text-sm flex items-center gap-1.5">
                  <span
                    className={
                      (settlingParty.transactionsSummary?.netBalanceIrr || 0) > 0
                        ? 'text-emerald-700'
                        : (settlingParty.transactionsSummary?.netBalanceIrr || 0) < 0
                        ? 'text-red-700'
                        : 'text-slate-600'
                    }
                  >
                    {Math.abs(settlingParty.transactionsSummary?.netBalanceIrr || 0).toLocaleString('fa-IR')} ریال
                  </span>
                  <span className="text-[11px] font-sans font-bold px-2 py-0.5 rounded-full bg-white border border-slate-300">
                    {(settlingParty.transactionsSummary?.netBalanceIrr || 0) > 0
                      ? 'بستانکار (طلبکار از ما)'
                      : (settlingParty.transactionsSummary?.netBalanceIrr || 0) < 0
                      ? 'بدهکار (بدهکار به ما)'
                      : 'تسویه کامل'}
                  </span>
                </div>
              </div>
            </div>

            {/* Settlement Form */}
            <form onSubmit={handleSaveSettlementSubmit} className="p-6 space-y-4 text-xs">
              {/* Transaction Direction */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  نوع عملیات تسویه <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettleForm({ ...settleForm, txType: 'RECEIPT' })}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      settleForm.txType === 'RECEIPT'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    دریافت وجه از شخص (ورودی خزانه)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleForm({ ...settleForm, txType: 'PAYMENT' })}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      settleForm.txType === 'PAYMENT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    پرداخت وجه به شخص (خروجی خزانه)
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  روش تسویه و پرداخت <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'POS', label: 'کارتخوان (POS)' },
                    { id: 'CHEQUE', label: 'چک صیادی' },
                    { id: 'BANK_TRANSFER', label: 'سند بانکی / حواله' },
                    { id: 'INSTALLMENT', label: 'اقساطی' },
                    { id: 'CASH', label: 'نقدی (صندوق)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setSettleForm({
                          ...settleForm,
                          paymentMethod: m.id as 'POS' | 'CHEQUE' | 'BANK_TRANSFER' | 'CASH' | 'INSTALLMENT',
                        })
                      }
                      className={`py-2 px-1 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                        settleForm.paymentMethod === m.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    مبلغ تسویه (ریال) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    dir="ltr"
                    value={settleForm.amountIrr}
                    onChange={(e) => setSettleForm({ ...settleForm, amountIrr: e.target.value })}
                    placeholder="مبلغ به ریال"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                  {Number(settleForm.amountIrr) > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1 font-sans">
                      معادل: {(Number(settleForm.amountIrr) / 10).toLocaleString('fa-IR')} تومان
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاریخ جلالی</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={settleForm.dateJalali}
                    onChange={(e) => setSettleForm({ ...settleForm, dateJalali: e.target.value })}
                    placeholder="1405/01/25"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Conditional Method Fields */}
              {/* 1. POS */}
              {settleForm.paymentMethod === 'POS' && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-blue-950 mb-1">حساب بانکی کارتخوان</label>
                      <select
                        value={settleForm.bankAccountId}
                        onChange={(e) => setSettleForm({ ...settleForm, bankAccountId: Number(e.target.value) })}
                        className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      >
                        {(foundationData.bankAccounts || []).map((ba) => (
                          <option key={ba.id} value={ba.id}>
                            {ba.bankNameFa} - {ba.accountNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-blue-950 mb-1">شماره ارجاع / پیگیری پوز</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={settleForm.referenceNumber}
                        onChange={(e) => setSettleForm({ ...settleForm, referenceNumber: e.target.value })}
                        placeholder="مثال: 98124018"
                        className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CHEQUE */}
              {settleForm.paymentMethod === 'CHEQUE' && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-amber-950 mb-1">شماره صیادی ۱۶ رقمی</label>
                      <input
                        type="text"
                        dir="ltr"
                        required
                        value={settleForm.chequeNumber}
                        onChange={(e) => setSettleForm({ ...settleForm, chequeNumber: e.target.value })}
                        placeholder="1234567890123456"
                        className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-amber-950 mb-1">تاریخ سررسید چک</label>
                      <input
                        type="text"
                        dir="ltr"
                        required
                        value={settleForm.chequeDueDateJalali}
                        onChange={(e) => setSettleForm({ ...settleForm, chequeDueDateJalali: e.target.value })}
                        placeholder="1405/03/15"
                        className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-amber-950 mb-1">بانک صادرکننده</label>
                      <input
                        type="text"
                        value={settleForm.bankNameFa}
                        onChange={(e) => setSettleForm({ ...settleForm, bankNameFa: e.target.value })}
                        placeholder="بانک ملت"
                        className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. BANK_TRANSFER */}
              {settleForm.paymentMethod === 'BANK_TRANSFER' && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-purple-950 mb-1">حساب بانکی مبدأ/مقصد</label>
                      <select
                        value={settleForm.bankAccountId}
                        onChange={(e) => setSettleForm({ ...settleForm, bankAccountId: Number(e.target.value) })}
                        className="w-full rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      >
                        {(foundationData.bankAccounts || []).map((ba) => (
                          <option key={ba.id} value={ba.id}>
                            {ba.bankNameFa} - {ba.accountNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-purple-950 mb-1">شماره سند / پیگیری پایا-ساتنا</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={settleForm.referenceNumber}
                        onChange={(e) => setSettleForm({ ...settleForm, referenceNumber: e.target.value })}
                        placeholder="مثال: TRF-889104"
                        className="w-full rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. INSTALLMENT */}
              {settleForm.paymentMethod === 'INSTALLMENT' && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-indigo-950 mb-1">تعداد اقساط ماهانه</label>
                      <select
                        value={settleForm.installmentCount}
                        onChange={(e) => setSettleForm({ ...settleForm, installmentCount: Number(e.target.value) })}
                        className="w-full rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      >
                        <option value={2}>۲ قسط ماهانه</option>
                        <option value={3}>۳ قسط ماهانه</option>
                        <option value={4}>۴ قسط ماهانه</option>
                        <option value={6}>۶ قسط ماهانه</option>
                        <option value={10}>۱۰ قسط ماهانه</option>
                        <option value={12}>۱۲ قسط ماهانه</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-indigo-950 mb-1">مبلغ هر قسط تقریبی</label>
                      <div className="p-2 rounded bg-white border border-indigo-300 font-mono font-bold text-slate-800">
                        {settleForm.amountIrr && Number(settleForm.amountIrr) > 0
                          ? Math.round(Number(settleForm.amountIrr) / (settleForm.installmentCount || 1)).toLocaleString('fa-IR') + ' ریال'
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. CASH */}
              {settleForm.paymentMethod === 'CASH' && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <label className="block font-semibold text-emerald-950 mb-1">صندوق دریافت/پرداخت نقدی</label>
                  <select
                    value={settleForm.cashBoxId}
                    onChange={(e) => setSettleForm({ ...settleForm, cashBoxId: Number(e.target.value) })}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    {(foundationData.cashBoxes || []).map((cb) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.titleFa} (کد: {cb.boxCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">شرح و بابت تسویه</label>
                <input
                  type="text"
                  value={settleForm.descriptionFa}
                  onChange={(e) => setSettleForm({ ...settleForm, descriptionFa: e.target.value })}
                  placeholder="مثال: تسویه فاکتور خرید یا مانده بدهی..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSettlingParty(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 font-bold shadow-md transition-colors flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  <span>ثبت و صدور سند تسویه</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={partyToDelete !== null}
        title="تایید حذف طرف تجاری"
        message={`آیا از حذف کامل طرف تجاری «${partyToDelete?.fullName || partyToDelete?.companyTitle}» با کد ${partyToDelete?.partyCode} اطمینان دارید؟`}
        details={`نوع: ${partyToDelete?.primaryType || '-'}\nتلفن همراه: ${partyToDelete?.mobile || '-'}`}
        errorMessage={deleteError}
        confirmText="حذف طرف تجاری"
        cancelText="انصراف"
        isLoading={isDeletingParty}
        isDestructive={true}
        onConfirm={handleConfirmDeleteParty}
        onClose={() => {
          setPartyToDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
