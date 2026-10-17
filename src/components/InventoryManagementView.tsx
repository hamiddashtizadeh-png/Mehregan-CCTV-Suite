import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Layers,
  Barcode,
  Cpu,
  Boxes,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  RefreshCw,
  Building2,
  Eye,
  Edit2,
  SlidersHorizontal,
  ChevronDown,
  Warehouse,
  Hash,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  DollarSign,
  TrendingUp,
  Tag,
  Check,
  X,
  ExternalLink,
  Download,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import { QuickMasterModal, QuickAddButton, QuickMasterType } from './QuickMasterModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  FoundationDataResponse,
  ItemRecord,
  ItemCategoryRecord,
  ItemBrandRecord,
  ItemUnitRecord,
  WarehouseRecord,
  ItemSerialRecord,
  InventoryDocumentRecord,
  ItemKardexEntry,
  InventoryDocType,
  SerialStatus,
} from '../types/foundation';

interface InventoryManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => Promise<void>;
}

type SubTab = 'ITEMS' | 'KARDEX' | 'SERIALS' | 'DOCUMENTS' | 'WAREHOUSES';

const DOC_TYPE_META: Record<
  InventoryDocType,
  { labelFa: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  INBOUND_PURCHASE: {
    labelFa: 'رسید ورود خرید',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ArrowDownLeft,
  },
  OUTBOUND_SALE: {
    labelFa: 'حواله خروج فروش',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: ArrowUpRight,
  },
  TRANSFER: {
    labelFa: 'انتقال بین انبارها',
    colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: ArrowRightLeft,
  },
  INBOUND_RETURN: {
    labelFa: 'برگشت از فروش مشتری',
    colorClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: RotateCcw,
  },
  OUTBOUND_RETURN: {
    labelFa: 'برگشت به تأمین‌کننده',
    colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: RotateCcw,
  },
  ADJUSTMENT_IN: {
    labelFa: 'تعدیل انبارگردانی (افزایش)',
    colorClass: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: Plus,
  },
  ADJUSTMENT_OUT: {
    labelFa: 'تعدیل انبارگردانی (کاهش)',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: X,
  },
};

const SERIAL_STATUS_META: Record<SerialStatus, { labelFa: string; colorClass: string }> = {
  IN_STOCK: { labelFa: 'موجود در انبار', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  DISPATCHED: { labelFa: 'تحویل / خارج شده', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  RESERVED: { labelFa: 'رزرو پروژه', colorClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  RETURNED: { labelFa: 'مرجوعی مشتری', colorClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  RETURNED_TO_SUPPLIER: { labelFa: 'مرجوع به تأمین‌کننده', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  DEFECTIVE: { labelFa: 'معیوب / گارانتی', colorClass: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export function InventoryManagementView({ foundationData, onRefresh }: InventoryManagementViewProps) {
  const [subTab, setSubTab] = useState<SubTab>('ITEMS');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<ItemRecord | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Live Data States
  const [items, setItems] = useState<ItemRecord[]>(foundationData.items || []);
  const [categories, setCategories] = useState<ItemCategoryRecord[]>(foundationData.itemCategories || []);
  const [brands, setBrands] = useState<ItemBrandRecord[]>(foundationData.itemBrands || []);
  const [units, setUnits] = useState<ItemUnitRecord[]>(foundationData.itemUnits || []);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>(foundationData.warehouses || []);
  const [serials, setSerials] = useState<ItemSerialRecord[]>([]);
  const [documents, setDocuments] = useState<InventoryDocumentRecord[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalItemsCount: 0,
    totalValuationIrr: 0,
    lowStockItemsCount: 0,
    activeSerialsCount: 0,
    warehousesCount: 0,
  });

  // Filter States
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<number | 'ALL'>('ALL');
  const [onlyLowStockFilter, setOnlyLowStockFilter] = useState(false);

  // Kardex States
  const [selectedKardexItemId, setSelectedKardexItemId] = useState<number | null>(null);
  const [selectedKardexWarehouseId, setSelectedKardexWarehouseId] = useState<number | 'ALL'>('ALL');
  const [kardexEntries, setKardexEntries] = useState<ItemKardexEntry[]>([]);
  const [kardexLoading, setKardexLoading] = useState(false);

  // Serial Tracker States
  const [serialSearch, setSerialSearch] = useState('');
  const [serialStatusFilter, setSerialStatusFilter] = useState<string>('ALL');
  const [serialWarehouseFilter, setSerialWarehouseFilter] = useState<number | 'ALL'>('ALL');

  // Documents States
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');
  const [docSearch, setDocSearch] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [quickMasterType, setQuickMasterType] = useState<QuickMasterType | null>(null);
  const [quickMasterWarehouseTarget, setQuickMasterWarehouseTarget] = useState<'SOURCE' | 'TARGET'>('TARGET');

  // New Item Form
  const [itemFormData, setItemFormData] = useState({
    titleFa: '',
    model: '',
    barcode: '',
    categoryId: 1,
    brandId: 1,
    unitId: 1,
    isSerialized: false,
    hasMacAddress: false,
    minStockAlert: 5,
    maxStockLevel: 50,
    purchasePriceIrr: 0,
    salePriceIrr: 0,
    notes: '',
    specResolution: '4MP (2688x1520)',
    specLens: '2.8mm Starlight',
    specNightVision: '30m Smart IR',
    specPoe: 'true',
    specCasing: 'IP67 Metal',
    specCompression: 'H.265+',
  });

  // New Document Form
  const [docFormData, setDocFormData] = useState({
    docType: 'INBOUND_PURCHASE' as InventoryDocType,
    dateJalali: '1405/01/29',
    sourceWarehouseId: 1,
    targetWarehouseId: 1,
    partyId: 1,
    itemId: 1,
    quantity: 1,
    unitCostIrr: 0,
    serialNumbersText: '',
    macAddressesText: '',
    notesFa: '',
  });

  // New Warehouse Form
  const [whFormData, setWhFormData] = useState({
    warehouseCode: '',
    titleFa: '',
    keeperNameFa: '',
    phone: '',
    addressFa: '',
    isDefault: false,
  });

  // Fetch all inventory data
  const loadAllInventoryData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catsRes, brandsRes, unitsRes, whRes, sumRes] = await Promise.all([
        fetch('/api/inventory/items').then((r) => r.json()),
        fetch('/api/inventory/categories').then((r) => r.json()),
        fetch('/api/inventory/brands').then((r) => r.json()),
        fetch('/api/inventory/units').then((r) => r.json()),
        fetch('/api/inventory/warehouses').then((r) => r.json()),
        fetch('/api/inventory/summary').then((r) => r.json()),
      ]);

      if (itemsRes.ok) setItems(itemsRes.items || []);
      if (catsRes.ok) setCategories(catsRes.categories || []);
      if (brandsRes.ok) setBrands(brandsRes.brands || []);
      if (unitsRes.ok) setUnits(unitsRes.units || []);
      if (whRes.ok) setWarehouses(whRes.warehouses || []);
      if (sumRes.ok) setSummaryStats(sumRes.data);
    } catch {
      // transient
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllInventoryData();
  }, []);

  // Fetch Serials when Serials tab active
  useEffect(() => {
    if (subTab === 'SERIALS') {
      fetch('/api/inventory/serials')
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) setSerials(data.serials || []);
        });
    }
  }, [subTab]);

  // Fetch Documents when Documents tab active
  useEffect(() => {
    if (subTab === 'DOCUMENTS') {
      fetch('/api/inventory/documents')
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) setDocuments(data.documents || []);
        });
    }
  }, [subTab]);

  // Fetch Kardex when selected item changes
  const loadKardexForItem = async (itemId: number, whId?: number | 'ALL') => {
    try {
      setKardexLoading(true);
      setSelectedKardexItemId(itemId);
      const query = whId && whId !== 'ALL' ? `?warehouseId=${whId}` : '';
      const res = await fetch(`/api/inventory/kardex/${itemId}${query}`);
      const json = await res.json();
      if (json.ok) {
        setKardexEntries(json.kardex || []);
      }
    } catch {
      // transient
    } finally {
      setKardexLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'KARDEX' && items.length > 0 && selectedKardexItemId === null) {
      loadKardexForItem(items[0].id, selectedKardexWarehouseId);
    }
  }, [subTab, items, selectedKardexItemId, selectedKardexWarehouseId]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategoryFilter !== 'ALL' && item.categoryId !== selectedCategoryFilter) return false;
      if (selectedBrandFilter !== 'ALL' && item.brandId !== selectedBrandFilter) return false;
      if (onlyLowStockFilter && !item.isLowStock) return false;
      if (itemSearch) {
        const s = itemSearch.toLowerCase().trim();
        const m1 = item.itemCode.toLowerCase().includes(s);
        const m2 = item.model.toLowerCase().includes(s);
        const m3 = item.titleFa.toLowerCase().includes(s);
        const m4 = item.barcode ? item.barcode.toLowerCase().includes(s) : false;
        if (!m1 && !m2 && !m3 && !m4) return false;
      }
      return true;
    });
  }, [items, selectedCategoryFilter, selectedBrandFilter, onlyLowStockFilter, itemSearch]);

  // Filtered Serials
  const filteredSerials = useMemo(() => {
    return serials.filter((s) => {
      if (serialStatusFilter !== 'ALL' && s.status !== serialStatusFilter) return false;
      if (serialWarehouseFilter !== 'ALL' && s.currentWarehouseId !== serialWarehouseFilter) return false;
      if (serialSearch) {
        const q = serialSearch.toLowerCase().trim();
        const m1 = s.serialNumber.toLowerCase().includes(q);
        const m2 = s.macAddress ? s.macAddress.toLowerCase().includes(q) : false;
        const m3 = s.itemTitleFa ? s.itemTitleFa.toLowerCase().includes(q) : false;
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [serials, serialStatusFilter, serialWarehouseFilter, serialSearch]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => {
      if (docTypeFilter !== 'ALL' && d.docType !== docTypeFilter) return false;
      if (docSearch) {
        const q = docSearch.toLowerCase().trim();
        const m1 = d.docNumber.toLowerCase().includes(q);
        const m2 = d.partyNameFa ? d.partyNameFa.toLowerCase().includes(q) : false;
        const m3 = d.notesFa ? d.notesFa.toLowerCase().includes(q) : false;
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [documents, docTypeFilter, docSearch]);

  // Handle Save Item (Create or Edit)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        titleFa: itemFormData.titleFa,
        model: itemFormData.model,
        barcode: itemFormData.barcode || null,
        categoryId: Number(itemFormData.categoryId),
        brandId: Number(itemFormData.brandId),
        unitId: Number(itemFormData.unitId),
        isSerialized: itemFormData.isSerialized,
        hasMacAddress: itemFormData.hasMacAddress,
        minStockAlert: Number(itemFormData.minStockAlert),
        maxStockLevel: Number(itemFormData.maxStockLevel),
        purchasePriceIrr: Number(itemFormData.purchasePriceIrr),
        salePriceIrr: Number(itemFormData.salePriceIrr),
        notes: itemFormData.notes,
        technicalSpecs: {
          resolution: itemFormData.specResolution,
          lens: itemFormData.specLens,
          nightVision: itemFormData.specNightVision,
          poe: itemFormData.specPoe === 'true',
          casing: itemFormData.specCasing,
          compression: itemFormData.specCompression,
        },
      };

      const url = editingItem ? `/api/inventory/items/${editingItem.id}` : '/api/inventory/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsItemModalOpen(false);
        setEditingItem(null);
        await loadAllInventoryData();
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت کالا.' });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'خطای ارتباط با سرور.' });
    }
  };

  // Handle Toggle Item Status
  const handleToggleItemStatus = async (item: ItemRecord) => {
    try {
      const res = await fetch(`/api/inventory/items/${item.id}/status`, { method: 'PATCH' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        await loadAllInventoryData();
      } else {
        setFeedback({ type: 'error', message: data.messageFa });
      }
    } catch {
      setFeedback({ type: 'error', message: 'خطا در تغییر وضعیت کالا.' });
    }
  };

  // Open Create Item Modal
  const openCreateItemModal = () => {
    setEditingItem(null);
    setItemFormData({
      titleFa: '',
      model: '',
      barcode: '',
      categoryId: categories[0]?.id || 1,
      brandId: brands[0]?.id || 1,
      unitId: units[0]?.id || 1,
      isSerialized: false,
      hasMacAddress: false,
      minStockAlert: 5,
      maxStockLevel: 50,
      purchasePriceIrr: 0,
      salePriceIrr: 0,
      notes: '',
      specResolution: '4MP (2688x1520)',
      specLens: '2.8mm Starlight Fixed',
      specNightVision: '30m Smart IR',
      specPoe: 'true',
      specCasing: 'IP67 Metal',
      specCompression: 'H.265+',
    });
    setIsItemModalOpen(true);
  };

  // Open Edit Item Modal
  const openEditItemModal = (item: ItemRecord) => {
    setEditingItem(item);
    setItemFormData({
      titleFa: item.titleFa,
      model: item.model,
      barcode: item.barcode || '',
      categoryId: item.categoryId,
      brandId: item.brandId,
      unitId: item.unitId,
      isSerialized: item.isSerialized,
      hasMacAddress: item.hasMacAddress,
      minStockAlert: item.minStockAlert,
      maxStockLevel: item.maxStockLevel || 50,
      purchasePriceIrr: item.purchasePriceIrr,
      salePriceIrr: item.salePriceIrr,
      notes: item.notes || '',
      specResolution: String(item.technicalSpecs?.resolution || '4MP'),
      specLens: String(item.technicalSpecs?.lens || '2.8mm'),
      specNightVision: String(item.technicalSpecs?.nightVision || '30m Smart IR'),
      specPoe: String(item.technicalSpecs?.poe ?? true),
      specCasing: String(item.technicalSpecs?.casing || 'IP67 Metal'),
      specCompression: String(item.technicalSpecs?.compression || 'H.265+'),
    });
    setIsItemModalOpen(true);
  };

  // Handle Save Document (Authoritative Inbound / Outbound / Transfer / Return / Adjustment)
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const serialList = docFormData.serialNumbersText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const macList = docFormData.macAddressesText
        .split('\n')
        .map((m) => m.trim())
        .filter(Boolean);

      const payload = {
        docType: docFormData.docType,
        dateJalali: docFormData.dateJalali,
        sourceWarehouseId:
          docFormData.docType === 'INBOUND_PURCHASE' || docFormData.docType === 'INBOUND_RETURN' || docFormData.docType === 'ADJUSTMENT_IN'
            ? null
            : Number(docFormData.sourceWarehouseId),
        targetWarehouseId:
          docFormData.docType === 'OUTBOUND_SALE' || docFormData.docType === 'OUTBOUND_RETURN' || docFormData.docType === 'ADJUSTMENT_OUT'
            ? null
            : Number(docFormData.targetWarehouseId),
        partyId: Number(docFormData.partyId),
        lines: [
          {
            itemId: Number(docFormData.itemId),
            quantity: Number(docFormData.quantity),
            unitCostIrr: Number(docFormData.unitCostIrr),
            serialNumbers: serialList,
            macAddresses: macList,
          },
        ],
        notesFa: docFormData.notesFa,
      };

      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsDocModalOpen(false);
        await loadAllInventoryData();
        if (subTab === 'DOCUMENTS') {
          const docRes = await fetch('/api/inventory/documents').then((r) => r.json());
          if (docRes.ok) setDocuments(docRes.documents || []);
        }
        if (selectedKardexItemId) {
          await loadKardexForItem(selectedKardexItemId, selectedKardexWarehouseId);
        }
        await onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ثبت سند انبار.' });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'خطای ارتباط با سرور.' });
    }
  };

  // Handle Save Warehouse
  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whFormData),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa });
        setIsWarehouseModalOpen(false);
        await loadAllInventoryData();
      } else {
        setFeedback({ type: 'error', message: data.messageFa || 'خطا در ایجاد انبار.' });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'خطای سرور.' });
    }
  };

  // Handle Delete Item
  const handleDeleteItem = (item: ItemRecord) => {
    setDeleteError(null);
    setItemToDelete(item);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/inventory/items/${itemToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: 'success', message: data.messageFa || `کالای «${itemToDelete.titleFa}» با موفقیت حذف گردید.` });
        setItemToDelete(null);
        setDeleteError(null);
        await loadAllInventoryData();
        await onRefresh();
      } else {
        const msg = data.messageFa || 'امکان حذف کالا وجود ندارد به دلیل وجود گردش انبار، فاکتور خرید/فروش یا کاردکس.';
        setDeleteError(msg);
        setFeedback({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'خطا در ارتباط با سرور هنگام حذف کالا.';
      setDeleteError(msg);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsDeletingItem(false);
    }
  };

  const selectedKardexItem = items.find((i) => i.id === selectedKardexItemId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              مدیریت جامع کالاها، انبارداری و کاردکس (مرحله ۴)
            </h1>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            رهگیری دقیق اسناد ورود، خروج، انتقال و مرجوعی کالا • کنترل هوشمند موجودی منفی • ردیابی سریال و MAC تجهیزات شبکه
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openCreateItemModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>تعریف کالای جدید</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <ArrowRightLeft className="h-4 w-4 text-emerald-700" />
            <span>ثبت سند جدید انبار</span>
          </button>

          <button
            type="button"
            onClick={loadAllInventoryData}
            disabled={loading}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 p-3 text-xs rounded-lg border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">تنوع اقلام کاتالوگ</span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{summaryStats.totalItemsCount || items.length}</div>
          <span className="text-[11px] text-slate-500">کالای فعال در پایگاه داده</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">ارزش ریالی موجودی</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700 font-mono">
            {summaryStats.totalValuationIrr.toLocaleString('fa-IR')}
          </div>
          <span className="text-[11px] text-slate-500">ریال برمبنای قیمت خرید</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">هشدار نقطه سفارش</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600">{summaryStats.lowStockItemsCount}</div>
          <span className="text-[11px] text-amber-700">اقلام زیر حداقل موجودی</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">واحدهای سریال‌دار فعال</span>
            <Barcode className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-700">{summaryStats.activeSerialsCount}</div>
          <span className="text-[11px] text-purple-800">موجود در انبارهای شرکت</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">انبارهای فعال</span>
            <Warehouse className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-700">{warehouses.length}</div>
          <span className="text-[11px] text-indigo-800">مرکزی، خدمات و پروژه‌ها</span>
        </div>
      </div>

      {/* SubTab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setSubTab('ITEMS')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            subTab === 'ITEMS'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>کالاها و کاتالوگ ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('KARDEX')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            subTab === 'KARDEX'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>کاردکس کالا (Kardex Ledger)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('SERIALS')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            subTab === 'SERIALS'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Barcode className="h-4 w-4" />
          <span>رهگیری سریال و MAC آدرس</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('DOCUMENTS')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            subTab === 'DOCUMENTS'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>اسناد گردش انبار</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('WAREHOUSES')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            subTab === 'WAREHOUSES'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          <span>مدیریت انبارها ({warehouses.length})</span>
        </button>
      </div>

      {/* TAB 1: ITEMS & CATALOG */}
      {subTab === 'ITEMS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در عنوان، مدل سخت‌افزاری، کد یا بارکد..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="ALL">همه دسته‌بندی‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameFa}
                </option>
              ))}
            </select>

            <select
              value={selectedBrandFilter}
              onChange={(e) => setSelectedBrandFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="ALL">همه برندها</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameFa}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyLowStockFilter}
                onChange={(e) => setOnlyLowStockFilter(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>فقط کالاهای رو به اتمام</span>
            </label>

            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={() => {
                  const exportData = filteredItems.map((item) => ({
                    itemCode: item.itemCode,
                    barcode: item.barcode || '-',
                    titleFa: item.titleFa,
                    model: item.model || '-',
                    category: categories.find((c) => c.id === item.categoryId)?.nameFa || '-',
                    brand: brands.find((b) => b.id === item.brandId)?.nameFa || '-',
                    stock: item.totalStock ?? 0,
                    buyPriceIrr: (item.purchasePriceIrr ?? 0).toLocaleString(),
                    sellPriceIrr: (item.salePriceIrr ?? 0).toLocaleString(),
                    trackingType: item.isSerialized ? 'سریال‌دار' : item.hasMacAddress ? 'مک‌آدرس' : 'تعدادی ساده',
                  }));

                  exportToExcel(
                    `موجودی_کالاها_${Date.now()}`,
                    'موجودی کالاها',
                    [
                      { header: 'کد کالا', key: 'itemCode', width: 14 },
                      { header: 'بارکد', key: 'barcode', width: 16 },
                      { header: 'عنوان کالا', key: 'titleFa', width: 34 },
                      { header: 'مدل سخت‌افزاری', key: 'model', width: 18 },
                      { header: 'دسته‌بندی', key: 'category', width: 18 },
                      { header: 'برند', key: 'brand', width: 14 },
                      { header: 'موجودی کل', key: 'stock', width: 12 },
                      { header: 'قیمت خرید (ریال)', key: 'buyPriceIrr', width: 18 },
                      { header: 'قیمت فروش (ریال)', key: 'sellPriceIrr', width: 18 },
                      { header: 'نوع رهگیری', key: 'trackingType', width: 16 },
                    ],
                    exportData
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="دانلود خروجی اکسل موجودی کالاها"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                خروجی اکسل
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportData = filteredItems.map((item) => ({
                    itemCode: item.itemCode,
                    titleFa: item.titleFa,
                    model: item.model || '-',
                    category: categories.find((c) => c.id === item.categoryId)?.nameFa || '-',
                    brand: brands.find((b) => b.id === item.brandId)?.nameFa || '-',
                    stock: `${item.totalStock ?? 0} عدد`,
                    sellPriceIrr: `${(item.salePriceIrr ?? 0).toLocaleString()} ریال`,
                  }));

                  exportToPdf(
                    'گزارش رسمی موجودی انبار و کاتالوگ کالاهای امنیتی و دوربین مهرگان',
                    [
                      { header: 'کد کالا', key: 'itemCode' },
                      { header: 'عنوان و شرح کالا', key: 'titleFa' },
                      { header: 'مدل', key: 'model' },
                      { header: 'دسته', key: 'category' },
                      { header: 'برند', key: 'brand' },
                      { header: 'موجودی', key: 'stock' },
                      { header: 'قیمت فروش', key: 'sellPriceIrr' },
                    ],
                    exportData,
                    {
                      docNumber: `REP-STOCK-${Date.now().toString().slice(-6)}`,
                      summaryFa: `تعداد اقلام فهرست‌شده: ${filteredItems.length} قلم کالا | مجموع ارزش ریالی موجودی: ${(filteredItems.reduce((acc, i) => acc + (i.totalStock || 0) * (i.purchasePriceIrr || 0), 0) / 10).toLocaleString()} تومان`,
                    }
                  );
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="خروجی و چاپ PDF موجودی کالاها"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                خروجی PDF
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">کد / بارکد</th>
                  <th className="p-3">عنوان و مشخصات کالا</th>
                  <th className="p-3">مدل سخت‌افزاری</th>
                  <th className="p-3">دسته‌بندی / برند</th>
                  <th className="p-3 text-center">نوع رهگیری</th>
                  <th className="p-3 text-center">موجودی لحظه‌ای کل</th>
                  <th className="p-3 text-left">قیمت خرید (ریال)</th>
                  <th className="p-3 text-left">قیمت فروش (ریال)</th>
                  <th className="p-3 text-center">وضعیت</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div>{item.itemCode}</div>
                      {item.barcode && <div className="text-[10px] text-slate-500 font-normal">{item.barcode}</div>}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.titleFa}</div>
                      {item.technicalSpecs && (
                        <div className="text-[10px] text-slate-500 flex flex-wrap gap-1 mt-0.5">
                          {item.technicalSpecs.resolution && <span>• رزولوشن: {String(item.technicalSpecs.resolution)}</span>}
                          {item.technicalSpecs.lens && <span>• لنز: {String(item.technicalSpecs.lens)}</span>}
                          {item.technicalSpecs.poe && <span>• PoE: دارد</span>}
                        </div>
                      )}
                    </td>

                    <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">{item.model}</td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{item.categoryNameFa}</div>
                      <div className="text-[10px] text-slate-500">{item.brandName}</div>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      {item.isSerialized ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Barcode className="h-3 w-3" />
                          <span>سریال‌دار {item.hasMacAddress ? '+ MAC' : ''}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          استاندارد (تعداد/متر)
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`font-mono text-sm font-black ${
                            item.isLowStock ? 'text-amber-600' : 'text-slate-900'
                          }`}
                        >
                          {item.totalStock ?? 0}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.unitNameFa}</span>
                      </div>
                      {item.isLowStock && (
                        <div className="text-[10px] font-bold text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          <span>نقطه سفارش ({item.minStockAlert})</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-left font-mono whitespace-nowrap">
                      {item.purchasePriceIrr.toLocaleString('fa-IR')}
                    </td>

                    <td className="p-3 text-left font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {item.salePriceIrr.toLocaleString('fa-IR')}
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKardexItemId(item.id);
                            setSubTab('KARDEX');
                            loadKardexForItem(item.id, selectedKardexWarehouseId);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                          title="مشاهده کاردکس کالا"
                        >
                          کاردکس
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditItemModal(item)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded"
                          title="ویرایش کالا"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleItemStatus(item)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded"
                          title="تغییر وضعیت فعال/غیرفعال"
                        >
                          {item.status === 'ACTIVE' ? (
                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="حذف کامل کالا از انبار"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      کالایی مطابق فیلترهای مشخص‌شده یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KARDEX LEDGER */}
      {subTab === 'KARDEX' && (
        <div className="space-y-4">
          {/* Item Selector & Warehouse Filter Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-700">انتخاب کالا جهت استعلام کاردکس:</span>
                <select
                  value={selectedKardexItemId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedKardexItemId(id);
                    loadKardexForItem(id, selectedKardexWarehouseId);
                  }}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      [{i.itemCode}] {i.titleFa} — مدل: {i.model}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-bold text-slate-700 mr-2">فیلتر انبار:</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedKardexWarehouseId}
                    onChange={(e) => {
                      const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                      setSelectedKardexWarehouseId(val);
                      if (selectedKardexItemId) loadKardexForItem(selectedKardexItemId, val);
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  >
                    <option value="ALL">گردش کل شرکت (همه انبارها)</option>
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

              {selectedKardexItem && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500">موجودی لحظه‌ای: </span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {selectedKardexItem.totalStock} {selectedKardexItem.unitNameFa}
                      </span>
                    </div>
                    <div className="border-r border-slate-300 pr-3">
                      <span className="text-slate-500">سریال‌های فعال: </span>
                      <span className="font-mono font-bold text-purple-700">
                        {selectedKardexItem.activeSerialsCount} عدد
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const exportData = kardexEntries.map((row) => ({
                          dateJalali: row.dateJalali,
                          docNumber: row.docNumber,
                          docType: row.docTypeTitleFa,
                          warehouse: row.warehouseTitleFa,
                          party: row.partyNameFa || '-',
                          inQty: row.qtyIn || 0,
                          outQty: row.qtyOut || 0,
                          balance: row.runningBalance,
                          unitCost: ((row.unitCostIrr || 0) / 10).toLocaleString(),
                          totalCost: ((row.totalCostIrr || 0) / 10).toLocaleString(),
                        }));
                        exportToExcel(
                          `کاردکس_${selectedKardexItem.itemCode}_${Date.now()}`,
                          'کاردکس کالا',
                          [
                            { header: 'تاریخ', key: 'dateJalali', width: 14 },
                            { header: 'شماره سند', key: 'docNumber', width: 16 },
                            { header: 'نوع عملیات', key: 'docType', width: 22 },
                            { header: 'انبار', key: 'warehouse', width: 18 },
                            { header: 'طرف تجاری', key: 'party', width: 20 },
                            { header: 'وارده', key: 'inQty', width: 10 },
                            { header: 'صادره', key: 'outQty', width: 10 },
                            { header: 'مانده لحظه‌ای', key: 'balance', width: 14 },
                            { header: 'فی واحد (تومان)', key: 'unitCost', width: 16 },
                            { header: 'بهای کل (تومان)', key: 'totalCost', width: 18 },
                          ],
                          exportData
                        );
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="خروجی اکسل کاردکس کالا"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      اکسل کاردکس
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const exportData = kardexEntries.map((row) => ({
                          dateJalali: row.dateJalali,
                          docNumber: row.docNumber,
                          docType: row.docTypeTitleFa,
                          warehouse: row.warehouseTitleFa,
                          inQty: String(row.qtyIn || '-'),
                          outQty: String(row.qtyOut || '-'),
                          balance: String(row.runningBalance),
                          unitCost: `${((row.unitCostIrr || 0) / 10).toLocaleString()} تومان`,
                        }));
                        exportToPdf(
                          `کاردکس کالا: ${selectedKardexItem.titleFa} [${selectedKardexItem.itemCode}]`,
                          [
                            { header: 'تاریخ', key: 'dateJalali' },
                            { header: 'شماره سند', key: 'docNumber' },
                            { header: 'نوع سند', key: 'docType' },
                            { header: 'انبار', key: 'warehouse' },
                            { header: 'وارده', key: 'inQty' },
                            { header: 'صادره', key: 'outQty' },
                            { header: 'مانده', key: 'balance' },
                            { header: 'فی واحد', key: 'unitCost' },
                          ],
                          exportData,
                          {
                            docNumber: `KDX-${selectedKardexItem.itemCode}`,
                            summaryFa: `کالا: ${selectedKardexItem.titleFa} | مدل: ${selectedKardexItem.model || '-'} | موجودی کل: ${selectedKardexItem.totalStock} ${selectedKardexItem.unitNameFa || ''}`,
                          }
                        );
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="چاپ و خروجی PDF کاردکس"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-600" />
                      PDF کاردکس
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Kardex Ledger Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-3 text-center">ردیف</th>
                  <th className="p-3">تاریخ سند</th>
                  <th className="p-3">شماره سند انبار</th>
                  <th className="p-3">نوع عملیات انبار</th>
                  <th className="p-3">انبار مبدأ / مقصد</th>
                  <th className="p-3">طرف تجاری / پروژه</th>
                  <th className="p-3 text-center bg-emerald-900/60">وارده (In)</th>
                  <th className="p-3 text-center bg-rose-900/60">صادره (Out)</th>
                  <th className="p-3 text-center bg-blue-900/60">تراز لحظه‌ای (Balance)</th>
                  <th className="p-3 text-left">فی واحد (ریال)</th>
                  <th className="p-3 text-left">بهای کل (ریال)</th>
                  <th className="p-3">شماره سریال‌ها / توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {kardexEntries.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-mono whitespace-nowrap">{row.dateJalali}</td>
                    <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">{row.docNumber}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{row.docTypeTitleFa}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">{row.warehouseTitleFa}</td>
                    <td className="p-3 whitespace-nowrap text-slate-700">{row.partyNameFa || '—'}</td>

                    <td className="p-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30 whitespace-nowrap">
                      {row.qtyIn > 0 ? `+${row.qtyIn}` : '—'}
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-rose-700 bg-rose-50/30 whitespace-nowrap">
                      {row.qtyOut > 0 ? `-${row.qtyOut}` : '—'}
                    </td>

                    <td className="p-3 text-center font-mono font-black text-slate-900 text-sm bg-blue-50/40 whitespace-nowrap">
                      {row.runningBalance}
                    </td>

                    <td className="p-3 text-left font-mono whitespace-nowrap">
                      {row.unitCostIrr.toLocaleString('fa-IR')}
                    </td>

                    <td className="p-3 text-left font-mono font-bold text-slate-900 whitespace-nowrap">
                      {row.totalCostIrr.toLocaleString('fa-IR')}
                    </td>

                    <td className="p-3 text-xs max-w-xs truncate">
                      {row.serialNumbers && row.serialNumbers.length > 0 && (
                        <span className="font-mono text-[10px] text-purple-700 block truncate">
                          {row.serialNumbers.join(', ')}
                        </span>
                      )}
                      {row.notesFa && <span className="text-slate-500 block truncate">{row.notesFa}</span>}
                    </td>
                  </tr>
                ))}

                {kardexEntries.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      {kardexLoading ? 'در حال محاسبه کاردکس...' : 'هیچ سند ثبتی برای این کالا در انبار انتخاب‌شده وجود ندارد.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SERIAL & MAC TRACKER */}
      {subTab === 'SERIALS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در شماره سریال، MAC آدرس شبکه یا نام کالا..."
                value={serialSearch}
                onChange={(e) => setSerialSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={serialStatusFilter}
              onChange={(e) => setSerialStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="IN_STOCK">موجود در انبار</option>
              <option value="DISPATCHED">تحویل / خارج شده</option>
              <option value="RETURNED">مرجوعی</option>
              <option value="DEFECTIVE">معیوب / گارانتی</option>
            </select>

            <div className="flex items-center gap-1.5">
              <select
                value={serialWarehouseFilter}
                onChange={(e) => setSerialWarehouseFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="ALL">همه انبارها</option>
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

            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={() => {
                  const exportData = filteredSerials.map((s) => ({
                    serialNumber: s.serialNumber,
                    macAddress: s.macAddress || '-',
                    itemTitle: s.itemTitleFa || '-',
                    itemModel: s.itemCode || '-',
                    warehouse: s.warehouseTitleFa || '-',
                    status: s.status === 'IN_STOCK' ? 'موجود در انبار' : s.status === 'DISPATCHED' ? 'تحویل پروژه/فروش' : s.status === 'RETURNED' ? 'مرجوعی' : 'معیوب',
                    party: s.lastPartyNameFa || '-',
                  }));
                  exportToExcel(
                    `ردگیری_سریال‌ها_${Date.now()}`,
                    'لیست سریال‌ها',
                    [
                      { header: 'شماره سریال', key: 'serialNumber', width: 22 },
                      { header: 'مک آدرس', key: 'macAddress', width: 20 },
                      { header: 'نام کالا', key: 'itemTitle', width: 30 },
                      { header: 'مدل', key: 'itemModel', width: 18 },
                      { header: 'انبار استقرار', key: 'warehouse', width: 18 },
                      { header: 'وضعیت فیزیکی', key: 'status', width: 16 },
                      { header: 'طرف حساب', key: 'party', width: 20 },
                    ],
                    exportData
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="خروجی اکسل سریال‌های کالا"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                اکسل سریال‌ها
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportData = filteredSerials.map((s) => ({
                    serialNumber: s.serialNumber,
                    macAddress: s.macAddress || '-',
                    itemTitle: s.itemTitleFa || '-',
                    warehouse: s.warehouseTitleFa || '-',
                    status: s.status === 'IN_STOCK' ? 'موجود' : s.status === 'DISPATCHED' ? 'تحویل‌شده' : 'سایر',
                    party: s.lastPartyNameFa || '-',
                  }));
                  exportToPdf(
                    'گزارش رسمی ردگیری سریال و MAC آدرس تجهیزات نظارت تصویری مهرگان',
                    [
                      { header: 'شماره سریال (S/N)', key: 'serialNumber' },
                      { header: 'MAC شبکه', key: 'macAddress' },
                      { header: 'شرح کالا', key: 'itemTitle' },
                      { header: 'انبار فعلی', key: 'warehouse' },
                      { header: 'وضعیت', key: 'status' },
                      { header: 'طرف حساب', key: 'party' },
                    ],
                    exportData,
                    {
                      docNumber: `SER-${Date.now().toString().slice(-6)}`,
                      summaryFa: `تعداد کل سریال‌های گزارش‌شده: ${filteredSerials.length} دستگاه`,
                    }
                  );
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="چاپ و خروجی PDF سریال‌ها"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                PDF سریال‌ها
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">شماره سریال (S/N)</th>
                  <th className="p-3">MAC آدرس شبکه</th>
                  <th className="p-3">نام و مدل کالا</th>
                  <th className="p-3">انبار فعلی استقرار</th>
                  <th className="p-3 text-center">وضعیت فیزیکی</th>
                  <th className="p-3">آخرین سند ثبت‌شده</th>
                  <th className="p-3">طرف حساب مرتبط</th>
                  <th className="p-3">توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSerials.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {s.serialNumber}
                    </td>
                    <td className="p-3 font-mono text-purple-700 whitespace-nowrap">
                      {s.macAddress || 'ندارد'}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{s.itemTitleFa}</div>
                      <div className="font-mono text-[10px] text-slate-500">{s.itemCode}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap font-semibold text-slate-700">{s.warehouseTitleFa}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          SERIAL_STATUS_META[s.status]?.colorClass || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {SERIAL_STATUS_META[s.status]?.labelFa || s.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-blue-700 whitespace-nowrap">{s.lastDocNumber || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-slate-700">{s.lastPartyNameFa || '—'}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{s.notesFa || '—'}</td>
                  </tr>
                ))}

                {filteredSerials.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      شماره سریالی مطابق فیلتر یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WAREHOUSE DOCUMENTS */}
      {subTab === 'DOCUMENTS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در شماره سند، طرف حساب یا توضیحات..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="ALL">همه انواع اسناد</option>
              <option value="INBOUND_PURCHASE">رسید ورود خرید</option>
              <option value="OUTBOUND_SALE">حواله خروج فروش</option>
              <option value="TRANSFER">انتقال بین انبارها</option>
              <option value="INBOUND_RETURN">برگشت از فروش مشتری</option>
              <option value="OUTBOUND_RETURN">برگشت به تأمین‌کننده</option>
              <option value="ADJUSTMENT_IN">تعدیل مثبت انبارگردانی</option>
              <option value="ADJUSTMENT_OUT">تعدیل منفی انبارگردانی</option>
            </select>

            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={() => {
                  const exportData = filteredDocuments.map((doc) => ({
                    docNumber: doc.docNumber,
                    dateJalali: doc.dateJalali,
                    docType: DOC_TYPE_META[doc.docType]?.labelFa || doc.docType,
                    sourceWh: doc.sourceWarehouseTitleFa || '-',
                    targetWh: doc.targetWarehouseTitleFa || '-',
                    party: doc.partyNameFa || '-',
                    linesCount: doc.lines.length,
                    totalAmount: (doc.totalAmountIrr / 10).toLocaleString(),
                  }));
                  exportToExcel(
                    `اسناد_انبار_${Date.now()}`,
                    'اسناد انبارداری',
                    [
                      { header: 'شماره سند', key: 'docNumber', width: 16 },
                      { header: 'تاریخ', key: 'dateJalali', width: 14 },
                      { header: 'نوع سند', key: 'docType', width: 22 },
                      { header: 'انبار مبدأ', key: 'sourceWh', width: 18 },
                      { header: 'انبار مقصد', key: 'targetWh', width: 18 },
                      { header: 'طرف تجاری', key: 'party', width: 20 },
                      { header: 'تعداد اقلام', key: 'linesCount', width: 12 },
                      { header: 'مبلغ کل (تومان)', key: 'totalAmount', width: 18 },
                    ],
                    exportData
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="خروجی اکسل اسناد انبارداری"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                اکسل اسناد
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportData = filteredDocuments.map((doc) => ({
                    docNumber: doc.docNumber,
                    dateJalali: doc.dateJalali,
                    docType: DOC_TYPE_META[doc.docType]?.labelFa || doc.docType,
                    sourceWh: doc.sourceWarehouseTitleFa || '-',
                    targetWh: doc.targetWarehouseTitleFa || '-',
                    party: doc.partyNameFa || '-',
                    totalAmount: `${(doc.totalAmountIrr / 10).toLocaleString()} تومان`,
                  }));
                  exportToPdf(
                    'گزارش رسمی فهرست اسناد و حواله‌های ورود و خروج انبار مهرگان',
                    [
                      { header: 'شماره سند', key: 'docNumber' },
                      { header: 'تاریخ', key: 'dateJalali' },
                      { header: 'نوع سند', key: 'docType' },
                      { header: 'انبار مبدأ', key: 'sourceWh' },
                      { header: 'انبار مقصد', key: 'targetWh' },
                      { header: 'طرف تجاری', key: 'party' },
                      { header: 'مبلغ کل', key: 'totalAmount' },
                    ],
                    exportData,
                    {
                      docNumber: `DOC-WH-${Date.now().toString().slice(-6)}`,
                      summaryFa: `تعداد اسناد انبار: ${filteredDocuments.length} فقره`,
                    }
                  );
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="چاپ و خروجی PDF اسناد انبارداری"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                PDF اسناد
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">شماره سند</th>
                  <th className="p-3">تاریخ شمسی</th>
                  <th className="p-3">نوع سند انبار</th>
                  <th className="p-3">انبار مبدأ</th>
                  <th className="p-3">انبار مقصد</th>
                  <th className="p-3">طرف تجاری</th>
                  <th className="p-3 text-center">اقلام سند</th>
                  <th className="p-3 text-left">مبلغ کل سند (ریال)</th>
                  <th className="p-3 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredDocuments.map((doc) => {
                  const meta = DOC_TYPE_META[doc.docType];
                  const Icon = meta?.icon || FileText;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {doc.docNumber}
                      </td>
                      <td className="p-3 font-mono whitespace-nowrap">{doc.dateJalali}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            meta?.colorClass || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{meta?.labelFa || doc.docType}</span>
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600">{doc.sourceWarehouseTitleFa || '—'}</td>
                      <td className="p-3 whitespace-nowrap text-slate-600">{doc.targetWarehouseTitleFa || '—'}</td>
                      <td className="p-3 whitespace-nowrap font-medium text-slate-800">{doc.partyNameFa || '—'}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {doc.lines.length} قلم
                        </span>
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-900 whitespace-nowrap">
                        {doc.totalAmountIrr.toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ثبت قطعی
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      سندی مطابق جستجو یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: WAREHOUSES MANAGEMENT */}
      {subTab === 'WAREHOUSES' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">فهرست و مشخصات انبارهای سیستم</h2>
              <p className="text-xs text-slate-500 mt-0.5">تفکیک فیزیکی کالاهای موجود و انبارداران مسئول</p>
            </div>
            <button
              type="button"
              onClick={() => setIsWarehouseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>افزودن انبار جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map((wh) => (
              <div key={wh.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {wh.warehouseCode}
                  </span>
                  {wh.isDefault && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      انبار پیش‌فرض
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-black text-slate-900 text-sm">{wh.titleFa}</h3>
                  <div className="text-xs text-slate-500 mt-1">انباردار: {wh.keeperNameFa}</div>
                  {wh.phone && <div className="text-xs text-slate-500">تلفن: {wh.phone}</div>}
                  {wh.addressFa && <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{wh.addressFa}</div>}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">کل اقلام: </span>
                    <span className="font-mono font-bold text-slate-900">{wh.totalItemsCount ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ارزش موجودی: </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {(wh.totalValuationIrr ?? 0).toLocaleString('fa-IR')} ریال
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE OR EDIT ITEM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingItem ? 'ویرایش مشخصات فنی و تجاری کالا' : 'تعریف کالای جدید در سیستم'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">عنوان فارسی کالا *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.titleFa}
                    onChange={(e) => setItemFormData({ ...itemFormData, titleFa: e.target.value })}
                    placeholder="مثال: دوربین مداربسته دام داهوا 4MP استارلایت"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">مدل سخت‌افزاری (Model Number) *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.model}
                    onChange={(e) => setItemFormData({ ...itemFormData, model: e.target.value })}
                    placeholder="مثال: IPC-HDW2431T-AS-S2"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">دسته‌بندی کالا *</label>
                  <select
                    value={itemFormData.categoryId}
                    onChange={(e) => setItemFormData({ ...itemFormData, categoryId: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameFa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">برند سازنده *</label>
                  <select
                    value={itemFormData.brandId}
                    onChange={(e) => setItemFormData({ ...itemFormData, brandId: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameFa} ({b.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">واحد سنجش *</label>
                  <select
                    value={itemFormData.unitId}
                    onChange={(e) => setItemFormData({ ...itemFormData, unitId: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nameFa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">بارکد تجاری (EAN / UPC / داخلی)</label>
                  <input
                    type="text"
                    value={itemFormData.barcode}
                    onChange={(e) => setItemFormData({ ...itemFormData, barcode: e.target.value })}
                    placeholder="مثال: 6939555811011"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">قیمت خرید برآورد شده (ریال)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.purchasePriceIrr}
                    onChange={(e) => setItemFormData({ ...itemFormData, purchasePriceIrr: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">قیمت فروش پیش‌فرض (ریال)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.salePriceIrr}
                    onChange={(e) => setItemFormData({ ...itemFormData, salePriceIrr: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">حداقل موجودی هشدار (نقطه سفارش)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.minStockAlert}
                    onChange={(e) => setItemFormData({ ...itemFormData, minStockAlert: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">حداکثر سقف مجاز انبار</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.maxStockLevel}
                    onChange={(e) => setItemFormData({ ...itemFormData, maxStockLevel: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Serial / MAC Options */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                <div className="font-bold text-purple-900">سیاست رهگیری فیزیکی اقلام</div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemFormData.isSerialized}
                      onChange={(e) => setItemFormData({ ...itemFormData, isSerialized: e.target.checked })}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-purple-900">کالای سریال‌دار است (ردیابی شماره سریال یونیک)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemFormData.hasMacAddress}
                      onChange={(e) => setItemFormData({ ...itemFormData, hasMacAddress: e.target.checked })}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-purple-900">دارای MAC آدرس شبکه است (تجهیزات IP / سوییچ / NVR)</span>
                  </label>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">مشخصات فنی دوربین و تجهیزات نظارتی</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-600">رزولوشن تصویر</label>
                    <input
                      type="text"
                      value={itemFormData.specResolution}
                      onChange={(e) => setItemFormData({ ...itemFormData, specResolution: e.target.value })}
                      placeholder="4MP / 8MP 4K"
                      className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">نوع لنز</label>
                    <input
                      type="text"
                      value={itemFormData.specLens}
                      onChange={(e) => setItemFormData({ ...itemFormData, specLens: e.target.value })}
                      placeholder="2.8mm / وریفوکال"
                      className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">برد دید در شب</label>
                    <input
                      type="text"
                      value={itemFormData.specNightVision}
                      onChange={(e) => setItemFormData({ ...itemFormData, specNightVision: e.target.value })}
                      placeholder="30m Smart IR / ColorVu"
                      className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">استاندارد بدنه</label>
                    <input
                      type="text"
                      value={itemFormData.specCasing}
                      onChange={(e) => setItemFormData({ ...itemFormData, specCasing: e.target.value })}
                      placeholder="IP67 فلزی ضدآب"
                      className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">فشرده‌سازی</label>
                    <input
                      type="text"
                      value={itemFormData.specCompression}
                      onChange={(e) => setItemFormData({ ...itemFormData, specCompression: e.target.value })}
                      placeholder="H.265+ / AcuSense"
                      className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">پشتیبانی PoE</label>
                    <select
                      value={itemFormData.specPoe}
                      onChange={(e) => setItemFormData({ ...itemFormData, specPoe: e.target.value })}
                      className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                    >
                      <option value="true">دارد (PoE)</option>
                      <option value="false">ندارد</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  {editingItem ? 'ذخیره تغییرات کالا' : 'ثبت قطعی کالا'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE INVENTORY DOCUMENT */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900">ثبت سند عملیاتی انبارداری</h3>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">نوع سند انبار *</label>
                  <select
                    value={docFormData.docType}
                    onChange={(e) =>
                      setDocFormData({ ...docFormData, docType: e.target.value as InventoryDocType })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="INBOUND_PURCHASE">رسید ورود خرید (ورود به انبار)</option>
                    <option value="OUTBOUND_SALE">حواله خروج فروش (خروج از انبار)</option>
                    <option value="TRANSFER">انتقال بین انبارها</option>
                    <option value="INBOUND_RETURN">برگشت از فروش مشتری (مرجوعی به انبار)</option>
                    <option value="OUTBOUND_RETURN">برگشت به تأمین‌کننده</option>
                    <option value="ADJUSTMENT_IN">تعدیل مثبت انبارگردانی</option>
                    <option value="ADJUSTMENT_OUT">تعدیل منفی انبارگردانی</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">تاریخ شمسی سند *</label>
                  <input
                    type="text"
                    required
                    value={docFormData.dateJalali}
                    onChange={(e) => setDocFormData({ ...docFormData, dateJalali: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                {(docFormData.docType === 'OUTBOUND_SALE' ||
                  docFormData.docType === 'TRANSFER' ||
                  docFormData.docType === 'OUTBOUND_RETURN' ||
                  docFormData.docType === 'ADJUSTMENT_OUT') && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>انبار مبدأ (خروج کالا) *</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMasterWarehouseTarget('SOURCE');
                          setQuickMasterType('WAREHOUSE');
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        title="افزودن سریع انبار جدید"
                      >
                        <Plus className="w-3 h-3" />
                        <span>انبار جدید</span>
                      </button>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={docFormData.sourceWarehouseId}
                        onChange={(e) =>
                          setDocFormData({ ...docFormData, sourceWarehouseId: Number(e.target.value) })
                        }
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-rose-800 focus:outline-none"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.titleFa}
                          </option>
                        ))}
                      </select>
                      <QuickAddButton
                        onClick={() => {
                          setQuickMasterWarehouseTarget('SOURCE');
                          setQuickMasterType('WAREHOUSE');
                        }}
                        title="افزودن سریع انبار جدید"
                      />
                    </div>
                  </div>
                )}

                {(docFormData.docType === 'INBOUND_PURCHASE' ||
                  docFormData.docType === 'TRANSFER' ||
                  docFormData.docType === 'INBOUND_RETURN' ||
                  docFormData.docType === 'ADJUSTMENT_IN') && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>انبار مقصد (ورود کالا) *</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMasterWarehouseTarget('TARGET');
                          setQuickMasterType('WAREHOUSE');
                        }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        title="افزودن سریع انبار جدید"
                      >
                        <Plus className="w-3 h-3" />
                        <span>انبار جدید</span>
                      </button>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={docFormData.targetWarehouseId}
                        onChange={(e) =>
                          setDocFormData({ ...docFormData, targetWarehouseId: Number(e.target.value) })
                        }
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-emerald-800 focus:outline-none"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.titleFa}
                          </option>
                        ))}
                      </select>
                      <QuickAddButton
                        onClick={() => {
                          setQuickMasterWarehouseTarget('TARGET');
                          setQuickMasterType('WAREHOUSE');
                        }}
                        title="افزودن سریع انبار جدید"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>طرف تجاری / مشتری / تأمین‌کننده</span>
                    <button
                      type="button"
                      onClick={() => setQuickMasterType('PARTY')}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="افزودن شخص جدید"
                    >
                      <Plus className="w-3 h-3" />
                      <span>شخص جدید</span>
                    </button>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={docFormData.partyId}
                      onChange={(e) => setDocFormData({ ...docFormData, partyId: Number(e.target.value) })}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      {(foundationData.parties || []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.partyCode})
                        </option>
                      ))}
                    </select>
                    <QuickAddButton
                      onClick={() => setQuickMasterType('PARTY')}
                      title="افزودن سریع شخص جدید"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">کالای مورد نظر *</label>
                  <select
                    value={docFormData.itemId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const itm = items.find((i) => i.id === id);
                      setDocFormData({
                        ...docFormData,
                        itemId: id,
                        unitCostIrr: itm ? itm.purchasePriceIrr : 0,
                      });
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.titleFa} ({i.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">تعداد کالا *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={docFormData.quantity}
                    onChange={(e) => setDocFormData({ ...docFormData, quantity: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">فی واحد (ریال)</label>
                  <input
                    type="number"
                    min="0"
                    value={docFormData.unitCostIrr}
                    onChange={(e) => setDocFormData({ ...docFormData, unitCostIrr: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Serial & MAC Entry */}
              <div className="space-y-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-900">
                    شماره‌های سریال برای این ردیف (هر سریال در یک خط):
                  </label>
                  <span className="text-[11px] text-purple-700 font-mono">
                    باید دقیقاً {docFormData.quantity} سریال وارد شود
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={docFormData.serialNumbersText}
                  onChange={(e) => setDocFormData({ ...docFormData, serialNumbersText: e.target.value })}
                  placeholder={`SN-DH-2026-001\nSN-DH-2026-002`}
                  className="w-full p-2 bg-white border border-purple-200 rounded-lg font-mono text-xs focus:outline-none"
                />

                <label className="font-semibold text-purple-900 block mt-1">
                  MAC آدرس‌ها (اختیاری جهت تجهیزات تحت شبکه، هر خط یک MAC):
                </label>
                <textarea
                  rows={2}
                  value={docFormData.macAddressesText}
                  onChange={(e) => setDocFormData({ ...docFormData, macAddressesText: e.target.value })}
                  placeholder={`3C:EF:8C:01:02:03`}
                  className="w-full p-2 bg-white border border-purple-200 rounded-lg font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">توضیحات سند</label>
                <input
                  type="text"
                  value={docFormData.notesFa}
                  onChange={(e) => setDocFormData({ ...docFormData, notesFa: e.target.value })}
                  placeholder="علت صدور سند، شماره بارنامه یا فاکتور مرتبط..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  ثبت قطعی سند و اعمال در کاردکس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE WAREHOUSE */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900">تعریف انبار جدید</h3>
              <button
                type="button"
                onClick={() => setIsWarehouseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">کد انبار (مثال: WH-04) *</label>
                <input
                  type="text"
                  required
                  value={whFormData.warehouseCode}
                  onChange={(e) => setWhFormData({ ...whFormData, warehouseCode: e.target.value })}
                  placeholder="WH-04"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">نام / عنوان انبار *</label>
                <input
                  type="text"
                  required
                  value={whFormData.titleFa}
                  onChange={(e) => setWhFormData({ ...whFormData, titleFa: e.target.value })}
                  placeholder="مثال: انبار قطعات الکترونیک و برد"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">نام انباردار مسئول *</label>
                <input
                  type="text"
                  required
                  value={whFormData.keeperNameFa}
                  onChange={(e) => setWhFormData({ ...whFormData, keeperNameFa: e.target.value })}
                  placeholder="نام و نام خانوادگی انباردار"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">شماره تماس انبار</label>
                <input
                  type="text"
                  value={whFormData.phone}
                  onChange={(e) => setWhFormData({ ...whFormData, phone: e.target.value })}
                  placeholder="021-..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">نشانی فیزیکی انبار</label>
                <textarea
                  rows={2}
                  value={whFormData.addressFa}
                  onChange={(e) => setWhFormData({ ...whFormData, addressFa: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  ثبت انبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MASTER MODAL FOR INSTANT WAREHOUSE / PARTY CREATION */}
      {quickMasterType && (
        <QuickMasterModal
          isOpen={true}
          onClose={() => setQuickMasterType(null)}
          type={quickMasterType}
          onSuccess={async (result) => {
            if (result.type === 'WAREHOUSE') {
              if (quickMasterWarehouseTarget === 'SOURCE') {
                setDocFormData((prev) => ({ ...prev, sourceWarehouseId: result.id }));
              } else {
                setDocFormData((prev) => ({ ...prev, targetWarehouseId: result.id }));
              }
            } else if (result.type === 'PARTY') {
              setDocFormData((prev) => ({ ...prev, partyId: result.id }));
            }
            if (onRefresh) await onRefresh();
            setQuickMasterType(null);
          }}
          onRefresh={onRefresh}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={itemToDelete !== null}
        title="تایید حذف کالا"
        message={`آیا از حذف کامل کالای «${itemToDelete?.titleFa}» با کد ${itemToDelete?.itemCode} اطمینان دارید؟`}
        details={`کد کالا: ${itemToDelete?.itemCode}\nواحد سنجش: ${itemToDelete?.unitNameFa || '-'}`}
        errorMessage={deleteError}
        confirmText="حذف کالا"
        cancelText="انصراف"
        isLoading={isDeletingItem}
        isDestructive={true}
        onConfirm={handleConfirmDeleteItem}
        onClose={() => {
          setItemToDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
