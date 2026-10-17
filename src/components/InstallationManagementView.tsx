import React, { useState, useMemo, useEffect } from 'react';
import {
  Wrench,
  UserCheck,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  Search,
  Building2,
  MapPin,
  FileText,
  XCircle,
  ChevronDown,
  X,
  CreditCard,
  Layers,
  Phone,
  FolderKanban,
  Box,
  TrendingUp,
  RotateCcw,
  Send,
  Check,
  ShieldCheck,
  Eye,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  FoundationDataResponse,
  InstallationJobRecord,
  InstallationJobStatus,
  PartyRecord,
  SalesInvoiceRecord,
  ProjectRecord,
  ProjectStatus,
  ProjectMaterialRequisitionRecord,
  ProjectProfitabilityDetail,
} from '../types/foundation';
import { printHtmlContent } from '../utils/printUtils';
import { QuickMasterModal, QuickAddButton, QuickMasterType } from './QuickMasterModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface InstallationManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => void;
}

export const InstallationManagementView: React.FC<InstallationManagementViewProps> = ({
  foundationData,
  onRefresh,
}) => {
  const parties = foundationData.parties || [];
  const salesInvoices = foundationData.salesInvoices || [];

  const [localJobs, setLocalJobs] = useState<InstallationJobRecord[]>(foundationData.installationJobs || []);
  const [quickMasterType, setQuickMasterType] = useState<QuickMasterType | null>(null);
  const [quickMasterRole, setQuickMasterRole] = useState<'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'OTHER'>('CUSTOMER');

  const fetchJobsDirect = async () => {
    try {
      const res = await fetch('/api/installation/jobs');
      const data = await res.json();
      if (data.ok && Array.isArray(data.jobs)) {
        setLocalJobs(data.jobs);
      }
    } catch {
      // transient
    }
  };

  React.useEffect(() => {
    if (Array.isArray(foundationData.installationJobs)) {
      setLocalJobs(foundationData.installationJobs);
    }
  }, [foundationData.installationJobs]);

  // Stage 11: Module Tab State
  const [activeModuleTab, setActiveModuleTab] = useState<'PROJECTS' | 'REQUISITIONS' | 'PROFITABILITY' | 'SERVICES'>('PROJECTS');
  const [projects, setProjects] = useState<ProjectRecord[]>(foundationData.projects || []);
  const [requisitions, setRequisitions] = useState<ProjectMaterialRequisitionRecord[]>(foundationData.projectRequisitions || []);
  const [selectedProfitability, setSelectedProfitability] = useState<ProjectProfitabilityDetail | null>(null);
  const [installerFilterId, setInstallerFilterId] = useState<string>('ALL');

  // Stage 11 Modals
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateReqOpen, setIsCreateReqOpen] = useState(false);
  const [selectedReqForAction, setSelectedReqForAction] = useState<{ req: ProjectMaterialRequisitionRecord; type: 'APPROVE' | 'ISSUE' | 'CONSUME' | 'RETURN' } | null>(null);

  // Delete States
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'PROJECT' | 'JOB';
    title: string;
    message: string;
    details: string;
    id: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // New Project Form State
  const [newPrjForm, setNewPrjForm] = useState({
    titleFa: '',
    customerId: parties[0]?.id || 1,
    installerId: '',
    salesInvoiceId: '',
    contractAmountIrr: 450000000,
    locationAddressFa: '',
    startDateJalali: '1405/01/25',
    targetCompletionDateJalali: '1405/03/15',
    notesFa: '',
  });

  // New Requisition Form State
  const [newReqForm, setNewReqForm] = useState({
    projectId: 1,
    itemId: foundationData.items?.[0]?.id || 1,
    sourceWarehouseId: foundationData.warehouses?.[0]?.id || 1,
    requestedQty: 1,
    serialsStr: '',
    notesFa: '',
  });

  // Requisition Action Form State
  const [reqActionQty, setReqActionQty] = useState<number>(1);
  const [reqActionDate, setReqActionDate] = useState<string>('1405/01/25');

  // Active User & Installer Role Check
  const activeUser = foundationData.activeUser;
  const isInstallerUser = Boolean(
    activeUser.installerPartyId ||
    activeUser.jobTitle?.includes('نصاب') ||
    activeUser.assignedRoles?.includes('INSTALLER')
  );

  // Visit Report Modals & Reassign State
  const [selectedVisitReportPrj, setSelectedVisitReportPrj] = useState<ProjectRecord | null>(null);
  const [visitDateJalali, setVisitDateJalali] = useState('1405/01/25');
  const [visitNotesFa, setVisitNotesFa] = useState('');
  const [visitProjectStatus, setVisitProjectStatus] = useState<'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('IN_PROGRESS');

  const [reviewReportPrj, setReviewReportPrj] = useState<ProjectRecord | null>(null);
  const [reviewNotesFa, setReviewNotesFa] = useState('');

  const [reassignPrj, setReassignPrj] = useState<ProjectRecord | null>(null);
  const [reassignInstallerId, setReassignInstallerId] = useState<string>('');

  const fetchProjects = async () => {
    try {
      const url = installerFilterId !== 'ALL' ? `/api/projects?installerId=${installerFilterId}` : '/api/projects';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && Array.isArray(data.projects)) {
        setProjects(data.projects);
      }
    } catch {
      // transient
    }
  };

  const fetchRequisitions = async () => {
    try {
      const url = installerFilterId !== 'ALL' ? `/api/projects/requisitions?installerId=${installerFilterId}` : '/api/projects/requisitions';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && Array.isArray(data.requisitions)) {
        setRequisitions(data.requisitions);
      }
    } catch {
      // transient
    }
  };

  const loadProjectProfitability = async (prjId: number) => {
    try {
      const res = await fetch(`/api/projects/${prjId}/profitability`);
      const data = await res.json();
      if (data.ok && data.detail) {
        setSelectedProfitability(data.detail);
      }
    } catch {
      // transient
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchRequisitions();
  }, [installerFilterId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Job Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [titleFa, setTitleFa] = useState('');
  const [customerId, setCustomerId] = useState<number>(parties[0]?.id || 1);
  const [salesInvoiceId, setSalesInvoiceId] = useState<string>('');
  const [installerId, setInstallerId] = useState<string>('');
  const [serviceFeeIrr, setServiceFeeIrr] = useState<number>(30000000);
  const [additionalExpensesIrr, setAdditionalExpensesIrr] = useState<number>(10000000);
  const [locationAddressFa, setLocationAddressFa] = useState('');
  const [scheduledDateJalali, setScheduledDateJalali] = useState('1405/01/25');
  const [notesFa, setNotesFa] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Change / Assign Modal State
  const [selectedJob, setSelectedJob] = useState<InstallationJobRecord | null>(null);
  const [updateStatus, setUpdateStatus] = useState<InstallationJobStatus>('COMPLETED');
  const [updateInstallerId, setUpdateInstallerId] = useState<string>('');
  const [updatePaidAmountIrr, setUpdatePaidAmountIrr] = useState<number>(0);
  const [updateCompletedDate, setUpdateCompletedDate] = useState('1405/01/25');
  const [updateNotes, setUpdateNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Print Job Sheet Modal State
  const [printJob, setPrintJob] = useState<InstallationJobRecord | null>(null);

  // Filtered List
  const filteredJobs = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return localJobs.filter((j) => {
      const matchesSearch =
        !q ||
        (j.jobCode || '').toLowerCase().includes(q) ||
        (j.titleFa || '').toLowerCase().includes(q) ||
        (j.customerTitleFa || '').toLowerCase().includes(q) ||
        ((j.installerTitleFa || '').toLowerCase().includes(q)) ||
        ((j.locationAddressFa || '').toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || j.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [localJobs, searchQuery, statusFilter]);

  // Installers List
  const installers = useMemo(() => {
    const list = parties.filter((p) => p.roles?.includes('INSTALLER') || p.primaryType === 'INSTALLER');
    return list.length > 0 ? list : parties;
  }, [parties]);

  // Customers List
  const customers = useMemo(() => {
    return parties.filter((p) => p.roles?.includes('CUSTOMER') || p.primaryType === 'CUSTOMER');
  }, [parties]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = localJobs.length;
    const pendingCount = localJobs.filter((j) => j.status === 'PENDING_ASSIGNMENT').length;
    const inProgressCount = localJobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'ASSIGNED').length;
    const completedCount = localJobs.filter((j) => j.status === 'COMPLETED').length;
    const totalValue = localJobs.reduce((sum, j) => sum + j.totalCostIrr, 0);
    const totalCollected = localJobs.reduce((sum, j) => sum + j.paidAmountIrr, 0);

    return {
      totalCount,
      pendingCount,
      inProgressCount,
      completedCount,
      totalValue,
      totalCollected,
    };
  }, [localJobs]);

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrjForm.titleFa.trim()) {
      setFeedback({ type: 'error', message: 'عنوان پروژه الزامی است.' });
      return;
    }
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPrjForm,
          installerId: newPrjForm.installerId ? Number(newPrjForm.installerId) : undefined,
          salesInvoiceId: newPrjForm.salesInvoiceId ? Number(newPrjForm.salesInvoiceId) : undefined,
          contractAmountIrr: Number(newPrjForm.contractAmountIrr) || 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsCreateProjectOpen(false);
        setNewPrjForm({
          titleFa: '',
          customerId: parties[0]?.id || 1,
          installerId: '',
          salesInvoiceId: '',
          contractAmountIrr: 450000000,
          locationAddressFa: '',
          startDateJalali: '1405/01/25',
          targetCompletionDateJalali: '1405/03/15',
          notesFa: '',
        });
        await fetchProjects();
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت پروژه' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ارتباط با سرور' });
    }
  };

  const handleCreateReqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serials = newReqForm.serialsStr
        ? newReqForm.serialsStr.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : undefined;

      const res = await fetch(`/api/projects/${newReqForm.projectId}/requisitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: Number(newReqForm.itemId),
          sourceWarehouseId: Number(newReqForm.sourceWarehouseId),
          requestedQty: Number(newReqForm.requestedQty) || 1,
          serials,
          notesFa: newReqForm.notesFa,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsCreateReqOpen(false);
        await fetchRequisitions();
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت درخواست کالا' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ارتباط با سرور' });
    }
  };

  const handleReqActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForAction) return;
    const { req, type } = selectedReqForAction;

    let endpoint = '';
    let bodyData: Record<string, unknown> = {};

    if (type === 'APPROVE') {
      endpoint = `/api/projects/requisitions/${req.id}/approve`;
      bodyData = { approvedQty: Number(reqActionQty) || req.requestedQty };
    } else if (type === 'ISSUE') {
      endpoint = `/api/projects/requisitions/${req.id}/issue`;
      bodyData = { issuedQty: Number(reqActionQty) || req.approvedQty };
    } else if (type === 'CONSUME') {
      endpoint = `/api/projects/requisitions/${req.id}/consume`;
      bodyData = {
        consumedQty: Number(reqActionQty) || req.issuedQty,
        consumedAtJalali: reqActionDate,
      };
    } else if (type === 'RETURN') {
      endpoint = `/api/projects/requisitions/${req.id}/return`;
      bodyData = {
        returnedQty: Number(reqActionQty) || 1,
        returnedAtJalali: reqActionDate,
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setSelectedReqForAction(null);
        await fetchRequisitions();
        await fetchProjects();
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در اعمال عملیات روی حواله کالا' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در ارتباط با سرور' });
    }
  };

  const handleSubmitVisitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitReportPrj) return;
    try {
      const res = await fetch(`/api/projects/${selectedVisitReportPrj.id}/visit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitDateJalali,
          notesFa: visitNotesFa,
          updatedProjectStatus: visitProjectStatus,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setSelectedVisitReportPrj(null);
        setVisitNotesFa('');
        await fetchProjects();
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت گزارش بازدید' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در برقراری ارتباط با سرور' });
    }
  };

  const handleReviewVisitReport = async (approved: boolean) => {
    if (!reviewReportPrj) return;
    try {
      const res = await fetch(`/api/projects/${reviewReportPrj.id}/review-visit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, reviewNotesFa }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setReviewReportPrj(null);
        setReviewNotesFa('');
        await fetchProjects();
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در بررسی گزارش بازدید' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در برقراری ارتباط با سرور' });
    }
  };

  const handleReassignInstaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignPrj) return;
    try {
      const res = await fetch(`/api/projects/${reassignPrj.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installerId: reassignInstallerId ? Number(reassignInstallerId) : null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setReassignPrj(null);
        await fetchProjects();
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در تغییر نصاب' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در برقراری ارتباط با سرور' });
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً عنوان خدمت نصب را وارد کنید.' });
      return;
    }
    if (!locationAddressFa.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً آدرس دقیق محل نصب را وارد کنید.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/installation/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleFa: titleFa.trim(),
          customerId,
          salesInvoiceId: salesInvoiceId ? Number(salesInvoiceId) : undefined,
          installerId: installerId ? Number(installerId) : undefined,
          serviceFeeIrr: Number(serviceFeeIrr) || 0,
          additionalExpensesIrr: Number(additionalExpensesIrr) || 0,
          locationAddressFa: locationAddressFa.trim(),
          scheduledDateJalali,
          notesFa: notesFa.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: 'success', message: json.messageFa || 'پرونده نصب با موفقیت ثبت شد.' });
        setIsCreateModalOpen(false);
        setTitleFa('');
        setLocationAddressFa('');
        setNotesFa('');
        if (json.job) {
          setLocalJobs((prev) => [json.job, ...prev.filter((j) => j.id !== json.job.id)]);
        }
        onRefresh();
        fetchJobsDirect();
      } else {
        setFeedback({ type: 'error', message: json.messageFa || 'خطا در ثبت پرونده نصب.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'ارتباط با سرور برقرار نشد.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateJobStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsUpdating(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/installation/jobs/${selectedJob.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updateStatus,
          installerId: updateInstallerId ? Number(updateInstallerId) : undefined,
          paidAmountIrr: Number(updatePaidAmountIrr) || 0,
          completedDateJalali: updateCompletedDate,
          notesFa: updateNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: 'success', message: json.messageFa || 'وضعیت سفارش نصب با موفقیت به‌روزرسانی شد.' });
        setSelectedJob(null);
        if (json.job) {
          setLocalJobs((prev) => prev.map((j) => (j.id === json.job.id ? json.job : j)));
        }
        onRefresh();
        fetchJobsDirect();
      } else {
        setFeedback({ type: 'error', message: json.messageFa || 'خطا در به‌روزرسانی وضعیت.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در شبکه یا سرور.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = (prj: ProjectRecord) => {
    setDeleteError(null);
    setDeleteTarget({
      type: 'PROJECT',
      title: 'تایید حذف پروژه CCTV',
      message: `آیا از حذف کامل پروژه «${prj.titleFa}» با کد ${prj.projectCode} اطمینان دارید؟`,
      details: `عنوان: ${prj.titleFa}\nمشتری: ${prj.customerTitleFa || '-'}\nمبلغ قرارداد: ${(prj.contractAmountIrr / 10).toLocaleString('fa-IR')} تومان`,
      id: prj.id,
    });
  };

  const handleDeleteJob = (job: InstallationJobRecord) => {
    setDeleteError(null);
    setDeleteTarget({
      type: 'JOB',
      title: 'تایید حذف سفارش نصب',
      message: `آیا از حذف سفارش نصب «${job.jobCode}» اطمینان دارید؟`,
      details: `کد سفارش: ${job.jobCode}\nعنوان: ${job.titleFa}`,
      id: job.id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const url =
        deleteTarget.type === 'PROJECT'
          ? `/api/projects/${deleteTarget.id}`
          : `/api/installation/jobs/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || 'حذف با موفقیت انجام گردید.' });
        setDeleteTarget(null);
        setDeleteError(null);
        onRefresh();
        if (deleteTarget.type === 'PROJECT') {
          fetchProjects();
        } else {
          fetchJobsDirect();
        }
      } else {
        const msg = data.messageFa || 'امکان حذف وجود ندارد.';
        setDeleteError(msg);
        setFeedback({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'خطا در ارتباط با سرور هنگام حذف.';
      setDeleteError(msg);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: InstallationJobStatus) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            در انتظار تخصیص نصاب
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <UserCheck className="h-3 w-3 text-blue-600" />
            تخصیص‌یافته به نصاب
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Wrench className="h-3 w-3 text-indigo-600" />
            در حال اجرا در محل
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-3 w-3 text-emerald-600" />
            تکمیل و تحویل نهایی
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" />
            لغو شده
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <Wrench className="h-5 w-5 text-indigo-600" />
            <span>مدیریت خدمات نصب، راه‌اندازی و پروژه‌های فنی</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            پیگیری پرونده‌های نصب دوربین و شبکه، تخصیص نصاب مسئول، ثبت اجرت و هزینه‌های جانبی و تحویل نهایی به مشتری
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>ثبت سفارش خدمات نصب جدید</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Installer User Restricted Access Notice */}
      {isInstallerUser && (
        <div className="bg-cyan-50 border border-cyan-300 rounded-xl p-3 flex items-center justify-between text-xs text-cyan-950">
          <div className="flex items-center gap-2 font-bold">
            <UserCheck className="h-4 w-4 text-cyan-700 shrink-0" />
            <span>
              کارتابل اختصاصی نصاب: هم‌اکنون با حساب کاربر <strong>{activeUser.fullName}</strong> متصل هستید.
              فقط پروژه‌های اختصاص‌یافته به شما قابل مشاهده است و اطلاعات مالی/قیمت‌های خرید مسدود می‌باشد.
            </span>
          </div>
        </div>
      )}

      {/* Module Sub-Tab Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveModuleTab('PROJECTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeModuleTab === 'PROJECTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>کارتابل پروژه‌ها ({projects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModuleTab('REQUISITIONS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeModuleTab === 'REQUISITIONS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>حواله‌ها و درخواست‌های کالا ({requisitions.length})</span>
          </button>

          {!isInstallerUser && (
            <button
              type="button"
              onClick={() => setActiveModuleTab('PROFITABILITY')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeModuleTab === 'PROFITABILITY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>تحلیل سودآوری پروژه‌ها</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveModuleTab('SERVICES')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeModuleTab === 'SERVICES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>سفارشات نصب متفرقه ({localJobs.length})</span>
          </button>
        </div>

        {activeModuleTab === 'PROJECTS' && !isInstallerUser && (
          <button
            type="button"
            onClick={() => setIsCreateProjectOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>تعریف پروژه جدید</span>
          </button>
        )}

        {activeModuleTab === 'REQUISITIONS' && (
          <button
            type="button"
            onClick={() => setIsCreateReqOpen(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>درخواست کالا</span>
          </button>
        )}
      </div>

      {/* ------------------- MODULE TAB 1: PROJECTS & INSTALLER WORKSPACE ------------------- */}
      {activeModuleTab === 'PROJECTS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در عنوان، کد پروژه، مشتری، آدرس..."
                  className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {!isInstallerUser && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">نصاب:</span>
                  <select
                    value={installerFilterId}
                    onChange={(e) => setInstallerFilterId(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="ALL">همه نصابان</option>
                    {installers.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">وضعیت:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="ALL">همه وضعیت‌ها</option>
                  <option value="DRAFT">پیش‌نویس</option>
                  <option value="APPROVED">تأییدشده و آماده اجرا</option>
                  <option value="IN_PROGRESS">در حال اجرا</option>
                  <option value="COMPLETED">تکمیل و تحویل نهایی</option>
                  <option value="CANCELLED">لغو شده</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              پروژه‌ها: {projects.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                هیچ پروژه‌ای یافت نشد.
              </div>
            ) : (
              projects
                .filter((p) => {
                  const q = searchQuery.trim().toLowerCase();
                  const matchesSearch =
                    !q ||
                    p.projectCode.toLowerCase().includes(q) ||
                    p.titleFa.toLowerCase().includes(q) ||
                    p.customerTitleFa.toLowerCase().includes(q) ||
                    (p.locationAddressFa || '').toLowerCase().includes(q);
                  const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
                  return matchesSearch && matchesStatus;
                })
                .map((prj) => (
                  <div
                    key={prj.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                          {prj.projectCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                            prj.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : prj.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : prj.status === 'APPROVED'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {prj.status === 'COMPLETED'
                            ? '🟢 تکمیل نهایی'
                            : prj.status === 'IN_PROGRESS'
                            ? '🔵 در حال اجرا'
                            : prj.status === 'APPROVED'
                            ? '🟡 آماده اجرا'
                            : 'پیش‌نویس'}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 leading-snug">{prj.titleFa}</h3>

                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>کارفرما: <strong>{prj.customerTitleFa}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="truncate" title={prj.locationAddressFa}>
                            {prj.locationAddressFa}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>شروع: {prj.startDateJalali}</span>
                          {prj.targetCompletionDateJalali && (
                            <span> | تحویل: {prj.targetCompletionDateJalali}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span>
                            نصاب: <strong>{prj.installerTitleFa || 'تخصیص داده نشده'}</strong>
                          </span>
                        </div>
                        {!isInstallerUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setReassignPrj(prj);
                              setReassignInstallerId(prj.installerId ? String(prj.installerId) : '');
                            }}
                            className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                          >
                            تغییر نصاب
                          </button>
                        )}
                      </div>

                      {prj.lastVisitReport ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-amber-950">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5 text-amber-700" />
                              گزارش بازدید ({prj.lastVisitReport.visitDateJalali}):
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                prj.lastVisitReport.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : prj.lastVisitReport.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {prj.lastVisitReport.status === 'APPROVED'
                                ? 'تأییدشده'
                                : prj.lastVisitReport.status === 'REJECTED'
                                ? 'ردشده'
                                : 'در انتظار بررسی'}
                            </span>
                          </div>
                          <p className="text-slate-700 text-[11px] line-clamp-2">
                            {prj.lastVisitReport.notesFa}
                          </p>
                          {!isInstallerUser && prj.lastVisitReport.status === 'SUBMITTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewReportPrj(prj);
                                setReviewNotesFa('');
                              }}
                              className="mt-1 w-full text-center bg-amber-600 text-white font-bold text-[11px] py-1 rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
                            >
                              بررسی گزارش نصاب
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic text-center py-1">
                          هنوز گزارش بازدیدی برای این پروژه ثبت نگردیده است.
                        </div>
                      )}

                      {!isInstallerUser && prj.contractAmountIrr > 0 && (
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-mono">
                          <span className="text-slate-500">مبلغ قرارداد:</span>
                          <span className="font-bold text-slate-900">
                            {prj.contractAmountIrr.toLocaleString()} ریال
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVisitReportPrj(prj);
                          setVisitDateJalali('1405/01/25');
                          setVisitNotesFa(prj.lastVisitReport?.notesFa || '');
                          setVisitProjectStatus(prj.status);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        <span>ثبت گزارش کار</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewReqForm((prev) => ({ ...prev, projectId: prj.id }));
                          setIsCreateReqOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Box className="h-3.5 w-3.5 text-slate-600" />
                        <span>درخواست کالا</span>
                      </button>

                      {!isInstallerUser && (
                        <div className="col-span-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModuleTab('PROFITABILITY');
                              loadProjectProfitability(prj.id);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                          >
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                            <span>ریز سودآوری و بهای تمام‌شده</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(prj)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="حذف کامل پروژه"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ------------------- MODULE TAB 2: MATERIAL REQUISITIONS ------------------- */}
      {activeModuleTab === 'REQUISITIONS' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900">لیست حواله‌ها و درخواست‌های کالای پروژه‌ها</span>
            <button
              type="button"
              onClick={() => setIsCreateReqOpen(true)}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-2xs"
            >
              + ثبت درخواست کالا
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3">کد درخواست</th>
                  <th className="px-4 py-3">عنوان پروژه</th>
                  <th className="px-4 py-3">عنوان کالا</th>
                  <th className="px-4 py-3">انبار مبدأ</th>
                  <th className="px-4 py-3">تعداد</th>
                  <th className="px-4 py-3">درخواست‌کننده</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      هیچ درخواست کالایی ثبت نگردیده است.
                    </td>
                  </tr>
                ) : (
                  requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-900">{req.requestCode}</td>
                      <td className="px-4 py-3 font-semibold">{req.projectTitleFa}</td>
                      <td className="px-4 py-3 text-slate-800">{req.itemTitleFa}</td>
                      <td className="px-4 py-3 text-slate-600">{req.sourceWarehouseTitleFa}</td>
                      <td className="px-4 py-3 font-mono font-bold">
                        خواسته: {req.requestedQty} | تحویل: {req.issuedQty} | مصرف: {req.consumedQty}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{req.requestedByNameFa}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            req.status === 'CONSUMED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : req.status === 'ISSUED'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : req.status === 'APPROVED'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {req.status === 'CONSUMED'
                            ? 'مصرف قطعی'
                            : req.status === 'ISSUED'
                            ? 'تحویل انبار'
                            : req.status === 'APPROVED'
                            ? 'تأیید مدیر'
                            : 'درخواست اولیه'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {req.status === 'REQUESTED' && !isInstallerUser && (
                            <button
                              type="button"
                              onClick={() => setSelectedReqForAction({ req, type: 'APPROVE' })}
                              className="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-300 font-bold hover:bg-amber-100 text-[11px]"
                            >
                              تأیید مدیر
                            </button>
                          )}
                          {req.status === 'APPROVED' && !isInstallerUser && (
                            <button
                              type="button"
                              onClick={() => setSelectedReqForAction({ req, type: 'ISSUE' })}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-300 font-bold hover:bg-blue-100 text-[11px]"
                            >
                              تحویل انبار
                            </button>
                          )}
                          {(req.status === 'ISSUED' || req.status === 'APPROVED') && (
                            <button
                              type="button"
                              onClick={() => setSelectedReqForAction({ req, type: 'CONSUME' })}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100 text-[11px]"
                            >
                              ثبت مصرف
                            </button>
                          )}
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

      {/* ------------------- MODULE TAB 3: PROFITABILITY (MANAGER ONLY) ------------------- */}
      {activeModuleTab === 'PROFITABILITY' && !isInstallerUser && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span>تحلیل جامع سودآوری و بهای تمام‌شده پروژه‌های اجرایی</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => loadProjectProfitability(p.id)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all space-y-2"
              >
                <div className="flex justify-between font-bold text-xs">
                  <span>{p.titleFa}</span>
                  <span className="font-mono text-indigo-900">{p.projectCode}</span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>مبلغ قرارداد:</span>
                    <span>{p.contractAmountIrr.toLocaleString()} ریال</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>هزینه کالا و مواد:</span>
                    <span>{p.consumedMaterialsCostIrr.toLocaleString()} ریال</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t">
                    <span>سود خالص:</span>
                    <span>{p.netProfitIrr.toLocaleString()} ریال ({p.netMarginPct}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedProfitability && (
            <div className="border border-emerald-300 bg-emerald-50/50 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-sm text-emerald-950">
                جزئیات بهای تمام‌شده پروژه «{selectedProfitability.projectTitleFa}» ({selectedProfitability.projectCode})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-[11px]">مبلغ کل قرارداد</span>
                  <strong className="text-slate-900">{selectedProfitability.contractAmountIrr.toLocaleString()} ریال</strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-rose-200">
                  <span className="text-slate-500 block text-[11px]">ارزش اقلام مصرفی</span>
                  <strong className="text-rose-700">{selectedProfitability.totalMaterialCostIrr.toLocaleString()} ریال</strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200">
                  <span className="text-slate-500 block text-[11px]">دستمزد و هزینه‌ها</span>
                  <strong className="text-amber-800">{(selectedProfitability.installerWagesIrr + selectedProfitability.allocatedExpensesIrr).toLocaleString()} ریال</strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-300">
                  <span className="text-slate-500 block text-[11px]">سود خالص نهایی</span>
                  <strong className="text-emerald-800">{selectedProfitability.netProfitIrr.toLocaleString()} ریال</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------- MODULE TAB 4: SERVICES & INSTALLATION JOBS ------------------- */}
      {activeModuleTab === 'SERVICES' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>کل سفارشات نصب</span>
                <Layers className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
                {metrics.totalCount} <span className="text-xs font-normal text-slate-500">پرونده</span>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
                <span>در انتظار تخصیص نصاب</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xl font-extrabold text-amber-950 mt-2 font-mono">
                {metrics.pendingCount} <span className="text-xs font-normal text-amber-800">پروژه</span>
              </div>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-indigo-800 font-medium">
                <span>در حال اجرا / تخصیص‌یافته</span>
                <Wrench className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-xl font-extrabold text-indigo-950 mt-2 font-mono">
                {metrics.inProgressCount} <span className="text-xs font-normal text-indigo-800">پروژه</span>
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                <span>تکمیل و تحویل نهایی</span>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-emerald-950 mt-2 font-mono">
                {metrics.completedCount} <span className="text-xs font-normal text-emerald-800">پروژه</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در کد، عنوان نصب، مشتری، نصاب یا آدرس..."
                  className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">وضعیت:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">همه وضعیت‌ها</option>
                  <option value="PENDING_ASSIGNMENT">در انتظار تخصیص نصاب</option>
                  <option value="ASSIGNED">تخصیص‌یافته به نصاب</option>
                  <option value="IN_PROGRESS">در حال اجرا</option>
                  <option value="COMPLETED">تکمیل و تحویل شده</option>
                  <option value="CANCELLED">لغو شده</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              نمایش {filteredJobs.length} از {localJobs.length} پرونده نصب
            </div>
          </div>

          {/* Jobs Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">کد پروژه</th>
                    <th className="px-4 py-3">عنوان خدمات نصب</th>
                    <th className="px-4 py-3">مشتری سفارش‌دهنده</th>
                    <th className="px-4 py-3">فاکتور فروش مرتبط</th>
                    <th className="px-4 py-3">نصاب مسئول</th>
                    <th className="px-4 py-3">اجرت و هزینه کل</th>
                    <th className="px-4 py-3">تاریخ برنامه‌ریزی</th>
                    <th className="px-4 py-3">وضعیت</th>
                    <th className="px-4 py-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        هیچ پرونده خدمات نصبی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{j.jobCode}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-semibold text-slate-900">{j.titleFa}</div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5" title={j.locationAddressFa}>
                            📍 {j.locationAddressFa}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{j.customerTitleFa}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {j.invoiceNumber ? (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              <FileText className="h-3 w-3 text-blue-600" />
                              {j.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">مستقل (بدون فاکتور)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {j.installerTitleFa ? (
                            <span className="text-indigo-900 font-semibold">{j.installerTitleFa}</span>
                          ) : (
                            <span className="text-amber-700 italic">تعیین نشده</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {j.totalCostIrr.toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-500 font-normal">ریال</span>
                          {j.paidAmountIrr > 0 && (
                            <div className="text-[10px] text-emerald-600 font-normal">
                              دریافتی: {j.paidAmountIrr.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{j.scheduledDateJalali}</td>
                        <td className="px-4 py-3">{getStatusBadge(j.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJob(j);
                                setUpdateStatus(j.status);
                                setUpdateInstallerId(j.installerId ? String(j.installerId) : '');
                                setUpdatePaidAmountIrr(j.paidAmountIrr);
                                setUpdateNotes(j.notesFa || '');
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors text-[11px]"
                            >
                              تغییر وضعیت / نصاب
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintJob(j)}
                              className="p-1 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                              title="چاپ فرم تحویل خدمات نصب"
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteJob(j)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف سفارش نصب"
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
        </>
      )}

      {/* ------------------- MODALS ------------------- */}

      {/* VISIT REPORT MODAL FOR INSTALLER */}
      {selectedVisitReportPrj && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-sm text-slate-900">ثبت گزارش بازدید و پیشرفت کار پروژه</span>
              <button
                type="button"
                onClick={() => setSelectedVisitReportPrj(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitVisitReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان پروژه</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedVisitReportPrj.projectCode} - ${selectedVisitReportPrj.titleFa}`}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاریخ بازدید (شمسی)</label>
                <input
                  type="text"
                  required
                  value={visitDateJalali}
                  onChange={(e) => setVisitDateJalali(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">وضعیت پروژه</label>
                <select
                  value={visitProjectStatus}
                  onChange={(e) => setVisitProjectStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="IN_PROGRESS">در حال اجرای پروژه در محل</option>
                  <option value="COMPLETED">تکمیل و آماده تحویل نهایی</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">توضیحات و گزارش فنی بازدید</label>
                <textarea
                  required
                  rows={4}
                  value={visitNotesFa}
                  onChange={(e) => setVisitNotesFa(e.target.value)}
                  placeholder="توضیحات پیشرفت کار، متراژ کابل‌کشی، زوایای دید دوربین‌ها و اقلام مورد نیاز..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedVisitReportPrj(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  ارسال گزارش بازدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGER REVIEW VISIT REPORT MODAL */}
      {reviewReportPrj && reviewReportPrj.lastVisitReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-sm text-slate-900">بررسی و تأیید گزارش بازدید نصاب</span>
              <button
                type="button"
                onClick={() => setReviewReportPrj(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                <div>پروژه: <strong>{reviewReportPrj.titleFa}</strong></div>
                <div>نصاب: <strong>{reviewReportPrj.lastVisitReport.submittedByNameFa}</strong></div>
                <div>تاریخ گزارش: <strong className="font-mono">{reviewReportPrj.lastVisitReport.visitDateJalali}</strong></div>
                <div className="pt-2 text-slate-800 font-medium">
                  متن گزارش: «{reviewReportPrj.lastVisitReport.notesFa}»
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">توضیحات و بازخورد مدیر فنی</label>
                <input
                  type="text"
                  value={reviewNotesFa}
                  onChange={(e) => setReviewNotesFa(e.target.value)}
                  placeholder="یادداشت مدیر در صورت نیاز..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => handleReviewVisitReport(false)}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
                >
                  رد گزارش
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewVisitReport(true)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 cursor-pointer"
                >
                  تأیید گزارش نصاب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN INSTALLER MODAL */}
      {reassignPrj && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-sm text-slate-900">تخصیص / تغییر نصاب پروژه</span>
              <button
                type="button"
                onClick={() => setReassignPrj(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleReassignInstaller} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">پروژه انتخاب‌شده</label>
                <input
                  type="text"
                  disabled
                  value={`${reassignPrj.projectCode} - ${reassignPrj.titleFa}`}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">انتخاب نصاب مسئول جدید</label>
                <select
                  value={reassignInstallerId}
                  onChange={(e) => setReassignInstallerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="">-- لغو تخصیص نصاب --</option>
                  {installers.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setReassignPrj(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  ثبت تخصیص جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-sm text-slate-900">تعریف و ثبت پروژه جدید (نظارت تصویری / شبکه)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="p-6 space-y-5">
              {/* Section 1: Basic Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>مشخصات پایه پروژه</span>
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    عنوان پروژه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPrjForm.titleFa}
                    onChange={(e) => setNewPrjForm({ ...newPrjForm, titleFa: e.target.value })}
                    placeholder="مثال: اجرای شبکه و ۶۴ دوربین مداربسته مجتمع امین"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>کارفرما / خریدار پروژه <span className="text-rose-500">*</span></span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMasterRole('CUSTOMER');
                          setQuickMasterType('PARTY');
                        }}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>مشتری جدید</span>
                      </button>
                    </label>
                    <select
                      value={newPrjForm.customerId}
                      onChange={(e) => setNewPrjForm({ ...newPrjForm, customerId: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.partyCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>نصاب مسئول پروژه</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMasterRole('INSTALLER');
                          setQuickMasterType('PARTY');
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>نصاب جدید</span>
                      </button>
                    </label>
                    <select
                      value={newPrjForm.installerId}
                      onChange={(e) => setNewPrjForm({ ...newPrjForm, installerId: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="">-- تعیین بعداً (در انتظار تخصیص) --</option>
                      {installers.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          🔧 {inst.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Financials & Schedule */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>مبالغ قرارداد و زمان‌بندی</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      مبلغ کل قرارداد (ریال)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={newPrjForm.contractAmountIrr}
                        onChange={(e) => setNewPrjForm({ ...newPrjForm, contractAmountIrr: Number(e.target.value) })}
                        className="w-full pl-12 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                      <span className="absolute left-3 top-2.5 text-[10px] text-slate-400">ریال</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      تاریخ شروع قرارداد (شمسی)
                    </label>
                    <input
                      type="text"
                      value={newPrjForm.startDateJalali}
                      onChange={(e) => setNewPrjForm({ ...newPrjForm, startDateJalali: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Location */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <MapPin className="h-4 w-4 text-rose-600" />
                  <span>موقعیت مکانی و آدرس اجرای کار</span>
                </h4>

                <div>
                  <textarea
                    rows={2}
                    value={newPrjForm.locationAddressFa}
                    onChange={(e) => setNewPrjForm({ ...newPrjForm, locationAddressFa: e.target.value })}
                    placeholder="آدرس دقیق موقعیت نصب..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 cursor-pointer shadow-xs transition-colors"
                >
                  ثبت و ایجاد پروژه جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE REQUISITION MODAL */}
      {isCreateReqOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-sm text-slate-900">ثبت درخواست جدید کالا برای پروژه</span>
              <button
                type="button"
                onClick={() => setIsCreateReqOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReqSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">انتخاب پروژه</label>
                <select
                  value={newReqForm.projectId}
                  onChange={(e) => setNewReqForm({ ...newReqForm, projectId: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode} - {p.titleFa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">انتخاب کالا / تجهیزات</label>
                <select
                  value={newReqForm.itemId}
                  onChange={(e) => setNewReqForm({ ...newReqForm, itemId: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  {(foundationData.items || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.titleFa} (کد: {item.itemCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تعداد درخواستی</label>
                  <input
                    type="number"
                    min={1}
                    value={newReqForm.requestedQty}
                    onChange={(e) => setNewReqForm({ ...newReqForm, requestedQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">انبار مبدأ</label>
                  <select
                    value={newReqForm.sourceWarehouseId}
                    onChange={(e) => setNewReqForm({ ...newReqForm, sourceWarehouseId: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    {(foundationData.warehouses || []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.titleFa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">توضیحات و علت درخواست</label>
                <input
                  type="text"
                  value={newReqForm.notesFa}
                  onChange={(e) => setNewReqForm({ ...newReqForm, notesFa: e.target.value })}
                  placeholder="جهت کابل‌کشی فاز دوم پروژه..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateReqOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  ثبت درخواست کالا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl lg:max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Wrench className="h-5 w-5 text-indigo-600" />
                <span className="text-sm">ثبت پرونده خدمات نصب و راه‌اندازی جدید</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  عنوان پروژه یا خدمات نصب <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titleFa}
                  onChange={(e) => setTitleFa(e.target.value)}
                  placeholder="مثال: نصب و کابل‌کشی دوربین‌های مداربسته مجتمع نگین"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    مشتری سفارش‌دهنده <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(Number(e.target.value))}
                      className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.partyCode})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMasterRole('CUSTOMER');
                        setQuickMasterType('PARTY');
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                      title="افزودن سریع شخص / خریدار جدید"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>مشتری جدید</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    فاکتور فروش مرتبط (اختیاری)
                  </label>
                  <select
                    value={salesInvoiceId}
                    onChange={(e) => setSalesInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="">-- بدون فاکتور (سفارش نصب مستقل) --</option>
                    {salesInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        فاکتور {inv.invoiceNumber} - {inv.customerTitleFa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    نصاب مسئول / تکنسین اجرا
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={installerId}
                      onChange={(e) => setInstallerId(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="">-- تعیین بعداً (در انتظار تخصیص) --</option>
                      {installers.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.fullName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMasterRole('INSTALLER');
                        setQuickMasterType('PARTY');
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                      title="افزودن نصاب / تکنسین جدید"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>نصاب جدید</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    تاریخ برنامه‌ریزی نصب (شمسی)
                  </label>
                  <input
                    type="text"
                    value={scheduledDateJalali}
                    onChange={(e) => setScheduledDateJalali(e.target.value)}
                    placeholder="1405/01/25"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اجرت پایه نصب (ریال)
                  </label>
                  <input
                    type="number"
                    value={serviceFeeIrr}
                    onChange={(e) => setServiceFeeIrr(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    هزینه‌های جانبی (کابل/داکت/داربست)
                  </label>
                  <input
                    type="number"
                    value={additionalExpensesIrr}
                    onChange={(e) => setAdditionalExpensesIrr(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  آدرس کامل و دقیق محل اجرا <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={locationAddressFa}
                  onChange={(e) => setLocationAddressFa(e.target.value)}
                  placeholder="تهران، خیابان..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">توضیحات تکمیلی</label>
                <input
                  type="text"
                  value={notesFa}
                  onChange={(e) => setNotesFa(e.target.value)}
                  placeholder="تجهیزات همراه نصاب، نکات ایمنی و هماهنگی‌ها..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSubmitting ? 'در حال ثبت...' : 'ثبت قطعی سفارش نصب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS & INSTALLER UPDATE MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                <span>تغییر وضعیت و نصاب مسئول [{selectedJob.jobCode}]</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateJobStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">وضعیت جدید انجام پروژه</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as InstallationJobStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="PENDING_ASSIGNMENT">در انتظار تخصیص نصاب</option>
                  <option value="ASSIGNED">تخصیص‌یافته به نصاب</option>
                  <option value="IN_PROGRESS">در حال اجرا در محل</option>
                  <option value="COMPLETED">تکمیل و تحویل نهایی</option>
                  <option value="CANCELLED">لغو شده</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>تکنسین / نصاب مسئول</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickMasterRole('INSTALLER');
                      setQuickMasterType('PARTY');
                    }}
                    className="text-[10px] text-cyan-600 hover:text-cyan-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    title="افزودن نصاب / تکنسین جدید"
                  >
                    <Plus className="w-3 h-3" />
                    <span>نصاب جدید</span>
                  </button>
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={updateInstallerId}
                    onChange={(e) => setUpdateInstallerId(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- بدون تغییر --</option>
                    {installers.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.fullName}
                      </option>
                    ))}
                  </select>
                  <QuickAddButton
                    onClick={() => {
                      setQuickMasterRole('INSTALLER');
                      setQuickMasterType('PARTY');
                    }}
                    title="افزودن نصاب / تکنسین جدید"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مبلغ دریافتی بابت اجرت و خدمات (ریال)
                </label>
                <input
                  type="number"
                  value={updatePaidAmountIrr}
                  onChange={(e) => setUpdatePaidAmountIrr(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {updateStatus === 'COMPLETED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاریخ تحویل نهایی (شمسی)</label>
                  <input
                    type="text"
                    value={updateCompletedDate}
                    onChange={(e) => setUpdateCompletedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">یادداشت فنی یا گزارش کار</label>
                <input
                  type="text"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="گزارش تحویل، تست سلامت تجهیزات..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isUpdating ? 'در حال ثبت...' : 'بروزرسانی تغییرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT JOB SHEET MODAL */}
      {printJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="font-bold text-sm text-slate-900">چاپ برگه تحویل و رضایت‌سنجی خدمات نصب</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!printJob) return;
                    const html = `
                      <div style="font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; text-align: right; padding: 12px; font-size: 11px;">
                        <div style="border-bottom: 2px solid #4338ca; padding-bottom: 10px; margin-bottom: 14px; text-align: center;">
                          <h2 style="font-size: 16px; font-weight: 800; color: #1e1b4b; margin: 0 0 4px 0;">فروشگاه دوربین مداربسته و تجهیزات شبکه مهرگان</h2>
                          <h3 style="font-size: 12px; font-weight: 700; color: #4338ca; margin: 0 0 8px 0;">برگه کار و تحویل خدمات نصب و راه‌اندازی</h3>
                          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
                            <span>کد پرونده: ${printJob.jobCode}</span>
                            <span>تاریخ تنظیم: ${printJob.scheduledDateJalali}</span>
                          </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; background: #f8fafc; margin-bottom: 14px; font-size: 11px;">
                          <div><strong>مشتری:</strong> ${printJob.customerTitleFa}</div>
                          <div><strong>نصاب مسئول:</strong> ${printJob.installerTitleFa || 'تعیین نشده'}</div>
                          <div style="grid-column: span 2;"><strong>آدرس محل نصب:</strong> ${printJob.locationAddressFa}</div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
                          <thead>
                            <tr style="background: #f1f5f9;">
                              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">شرح خدمات و پروژه‌ها</th>
                              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 130px;">مبلغ (ریال)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style="border: 1px solid #cbd5e1; padding: 6px;">عنوان پروژه: ${printJob.titleFa} - اجرت پایه نصب</td>
                              <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">${printJob.serviceFeeIrr.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style="border: 1px solid #cbd5e1; padding: 6px;">هزینه‌های جانبی و ایاب و ذهاب</td>
                              <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">${printJob.additionalExpensesIrr.toLocaleString()}</td>
                            </tr>
                            <tr style="font-weight: 800; background: #eef2ff;">
                              <td style="border: 1px solid #cbd5e1; padding: 8px;">جمع کل خدمات:</td>
                              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; color: #312e81;">${printJob.totalCostIrr.toLocaleString()} ریال</td>
                            </tr>
                          </tbody>
                        </table>

                        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 11px;">
                          <div style="width: 45%; border-top: 1px dashed #94a3b8; padding-top: 10px;">
                            <strong>امضاء و تایید تکنسین نصب:</strong><br/><br/><br/>
                          </div>
                          <div style="width: 45%; border-top: 1px dashed #94a3b8; padding-top: 10px;">
                            <strong>تایید تحویل کالا و رضایت‌مندی مشتری:</strong><br/><br/><br/>
                          </div>
                        </div>
                      </div>
                    `;
                    await printHtmlContent({
                      title: `برگه تحویل نصب - ${printJob.jobCode}`,
                      bodyHtml: html,
                      isThermal: false,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>چاپ برگه</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintJob(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-right font-sans text-xs">
              <div className="border-b border-slate-300 pb-4 text-center">
                <h2 className="text-base font-extrabold text-slate-900">
                  فروشگاه دوربین مداربسته و تجهیزات شبکه مهرگان
                </h2>
                <h3 className="text-xs font-bold text-indigo-700 mt-1">
                  برگه کار و تحویل خدمات نصب و راه‌اندازی
                </h3>
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono mt-3">
                  <span>کد پرونده: {printJob.jobCode}</span>
                  <span>تاریخ تنظیم: {printJob.scheduledDateJalali}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-slate-50">
                <div>
                  <span className="text-slate-500">مشتری: </span>
                  <span className="font-bold text-slate-900">{printJob.customerTitleFa}</span>
                </div>
                <div>
                  <span className="text-slate-500">نصاب مسئول: </span>
                  <span className="font-bold text-indigo-900">{printJob.installerTitleFa || 'تعیین نشده'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">آدرس محل نصب: </span>
                  <span className="font-medium text-slate-900">{printJob.locationAddressFa}</span>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="font-bold text-slate-900 border-b pb-1">شرح خدمات و هزینه‌ها:</div>
                <div className="flex justify-between py-1 border-b">
                  <span>عنوان پروژه:</span>
                  <span className="font-semibold">{printJob.titleFa}</span>
                </div>
                <div className="flex justify-between py-1 border-b font-mono">
                  <span>اجرت پایه نصب:</span>
                  <span>{printJob.serviceFeeIrr.toLocaleString()} ریال</span>
                </div>
                <div className="flex justify-between py-1 border-b font-mono">
                  <span>هزینه‌های جانبی:</span>
                  <span>{printJob.additionalExpensesIrr.toLocaleString()} ریال</span>
                </div>
                <div className="flex justify-between py-1 font-bold font-mono text-indigo-950 text-sm">
                  <span>جمع کل خدمات:</span>
                  <span>{printJob.totalCostIrr.toLocaleString()} ریال</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[11px]">
                <div className="space-y-12">
                  <p className="font-bold text-slate-800">امضاء و تایید تکنسین نصب:</p>
                  <p className="text-slate-400">.........................................</p>
                </div>
                <div className="space-y-12">
                  <p className="font-bold text-slate-800">تایید تحویل کالا و رضایت‌مندی مشتری:</p>
                  <p className="text-slate-400">.........................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK MASTER MODAL FOR INSTANT PARTY/CUSTOMER/INSTALLER CREATION */}
      {quickMasterType && (
        <QuickMasterModal
          isOpen={true}
          onClose={() => setQuickMasterType(null)}
          type={quickMasterType}
          defaultPartyRole={quickMasterRole}
          onSuccess={async (result) => {
            if (result.type === 'PARTY') {
              if (quickMasterRole === 'INSTALLER') {
                setInstallerId(String(result.id));
              } else {
                setCustomerId(result.id);
              }
            }
            if (onRefresh) await onRefresh();
            setQuickMasterType(null);
          }}
          onRefresh={onRefresh}
        />
      )}

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
