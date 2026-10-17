export type ConnectionMode = 'LOCAL' | 'LAN' | 'ONLINE';
export type TlsMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';

export interface PublicUser {
  id: number;
  username: string;
  fullName: string;
  jobTitle: string;
  email: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  isInitialAdmin: boolean;
  assignedRoles?: string[];
  installerPartyId?: number | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface RoleRecord {
  code: string;
  titleFa: string;
  descriptionFa: string;
  isSystemRole: boolean;
}

export interface PermissionRecord {
  code: string;
  moduleNumber: number;
  moduleNameFa: string;
  titleFa: string;
  descriptionFa: string;
  isCritical: boolean;
}

export interface RolePermissionRecord {
  id: number;
  roleCode: string;
  permissionCode: string;
  grantedBy: string;
  grantedAt: string;
}

export interface UserRoleAssignmentRecord {
  id: number;
  userId: number;
  roleCode: string;
  assignedAt: string;
  assignedBy: string;
}

export interface UserPermissionOverrideRecord {
  id: number;
  userId: number;
  permissionCode: string;
  effect: 'DENY' | 'ALLOW';
  reasonFa: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  traceId: string;
  timestamp: string;
  actorUserId: number | null;
  actorUsername: string;
  actorRoleSummary: string;
  action: string;
  category: 'SECURITY' | 'AUTH' | 'RBAC' | 'SETTINGS' | 'MIGRATION' | 'CONNECTION' | 'BUSINESS' | 'PURCHASES' | 'INVENTORY';
  targetEntity: string;
  targetId: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  detailsFa: string;
  sanitizedMetadata: Record<string, unknown>;
}

export interface DocumentNumberingConfig {
  salesInvoicePrefix: string;
  salesProformaPrefix: string;
  purchaseInvoicePrefix: string;
  purchaseProformaPrefix: string;
  treasuryReceiptPrefix: string;
  treasuryPaymentPrefix: string;
  accountingDocPrefix: string;
  projectPrefix: string;
  installationPrefix: string;
  expensePrefix: string;
  incomePrefix: string;
}

export interface SystemSettingsRecord {
  companyName: string;
  economicCode: string;
  nationalId: string;
  phone: string;
  addressFa: string;
  baseCurrencyCode: 'IRR';
  displayCurrencyCode: 'IRT' | 'IRR';
  inventoryCostingMethod: 'SPECIFIC_OR_FIFO' | 'WEIGHTED_AVERAGE';
  landedCostAllocationDefault: 'BY_VALUE' | 'BY_WEIGHT' | 'BY_QUANTITY';
  activeFiscalYearCode: string;
  allowNegativeInventory: boolean;
  documentNumbering?: DocumentNumberingConfig;
  defaultWarehouseId?: number;
  defaultCashBoxId?: number;
  defaultBankAccountId?: number;
  receiptFooterMessageFa?: string;
  logoUrl?: string;
  updatedAt: string;
}

export interface SchemaMigrationRecord {
  version: string;
  name: string;
  descriptionFa: string;
  checksum: string;
  isDestructive: boolean;
  status: 'APPLIED' | 'PENDING';
  executionMs: number;
  appliedAt: string;
}

export interface RbacEvaluationResult {
  userId: number;
  username: string;
  permissionCode: string;
  allowed: boolean;
  matchedRule: 'EXPLICIT_DENY' | 'EXPLICIT_GRANT' | 'ROLE_PERMISSION' | 'DEFAULT_DENY';
  explanationFa: string;
  assignedRoles: string[];
  explicitOverridesForPermission: Array<{ effect: 'DENY' | 'ALLOW'; reasonFa: string }>;
  rolesGrantingPermission: string[];
}

export interface HealthStage {
  stageId: string;
  titleFa: string;
  ok: boolean;
  detailFa: string;
  remediationFa: string;
}

export interface HealthCheckResponse {
  ok: boolean;
  timestamp: string;
  overallStatus: 'HEALTHY_READY' | 'DEGRADED_OR_FAILED';
  failedStage: HealthStage | null;
  stages: HealthStage[];
}

export interface EnvDocItem {
  key: string;
  defaultValue: string;
  required: boolean;
  descriptionFa: string;
}

export interface FoundationDataResponse {
  activeUser: PublicUser;
  settings: SystemSettingsRecord;
  users: PublicUser[];
  roles: RoleRecord[];
  permissions: PermissionRecord[];
  rolePermissions: RolePermissionRecord[];
  userRoleAssignments: UserRoleAssignmentRecord[];
  userPermissionOverrides: UserPermissionOverrideRecord[];
  migrations: SchemaMigrationRecord[];
  auditLogs: AuditLogRecord[];
  connection: {
    setupWizardCompleted: boolean;
    connectionStatus: string;
    activeProfile: {
      mode: string;
      host: string;
      port: number;
      database: string;
      username: string;
      passwordMasked: string;
      tlsEnabled: boolean;
    };
  };
  parties?: PartyRecord[];
  items?: ItemRecord[];
  warehouses?: WarehouseRecord[];
  itemCategories?: ItemCategoryRecord[];
  itemBrands?: ItemBrandRecord[];
  itemUnits?: ItemUnitRecord[];
  purchaseInvoices?: PurchaseInvoiceRecord[];
  purchaseProformas?: PurchaseProformaRecord[];
  purchasePayments?: PurchasePaymentRecord[];
  purchaseReturns?: PurchaseReturnRecord[];
  salesInvoices?: SalesInvoiceRecord[];
  salesProformas?: SalesProformaRecord[];
  salesReceipts?: SalesReceiptRecord[];
  salesReturns?: SalesReturnRecord[];
  installationJobs?: InstallationJobRecord[];
  cashBoxes?: CashBoxRecord[];
  bankAccounts?: BankAccountRecord[];
  cheques?: ChequeRecord[];
  treasuryTransactions?: TreasuryTransactionRecord[];
  installments?: InstallmentRecord[];
  operationalExpenses?: OperationalExpenseRecord[];
  operationalIncomes?: OperationalIncomeRecord[];
  itemSerials?: ItemSerialRecord[];
  accountsChart?: AccountRecord[];
  accountingDocuments?: AccountingDocumentRecord[];
  fiscalYears?: FiscalYearRecord[];
  accountingPeriods?: AccountingPeriodRecord[];
  costCenters?: CostCenterRecord[];
  projects?: ProjectRecord[];
  projectRequisitions?: ProjectMaterialRequisitionRecord[];
  fixedAssets?: FixedAssetRecord[];
  depreciationEntries?: DepreciationEntryRecord[];
  openingBalanceDoc?: AccountingDocumentRecord | null;
}

export type PartyPrimaryType = 'CUSTOMER' | 'SUPPLIER' | 'INSTALLER' | 'PARTNER_OTHER';
export type PersonType = 'NATURAL' | 'LEGAL';
export type PartyStatus = 'ACTIVE' | 'INACTIVE';
export type PartyTransactionType =
  | 'SALE_INVOICE'
  | 'PURCHASE_INVOICE'
  | 'PAYMENT'
  | 'RECEIPT'
  | 'CCTV_PROJECT';

export interface PartyRecord {
  id: number;
  partyCode: string;
  primaryType: PartyPrimaryType;
  roles: PartyPrimaryType[];
  personType: PersonType;
  fullName: string;
  companyTitle?: string | null;
  nationalId?: string | null;
  economicCode?: string | null;
  registrationNumber?: string | null;
  mobile: string;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  province: string;
  city: string;
  postalCode?: string | null;
  addressFa?: string | null;
  status: PartyStatus;
  creditLimitIrr: number;
  installerSkills?: string | null;
  notes?: string | null;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  transactionsSummary?: {
    totalSalesCount: number;
    totalSalesIrr: number;
    totalPurchasesCount: number;
    totalPurchasesIrr: number;
    totalPaymentsIrr: number;
    totalReceiptsIrr: number;
    activeProjectsCount: number;
    netBalanceIrr: number; // positive = creditor (بستانکار), negative = debtor (بدهکار)
    lastTransactionDateJalali?: string;
  };
}

export interface PartyTransactionRecord {
  id: number;
  partyId: number;
  recordType: PartyTransactionType;
  referenceNumber: string;
  titleFa: string;
  amountIrr: number;
  dateJalali: string;
  status: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS' | 'SETTLED';
  notesFa?: string | null;
  isDemo?: boolean;
  createdAt: string;
}

export interface DuplicateCandidate {
  partyId: number;
  partyCode: string;
  fullName: string;
  matchReasons: Array<{
    field: 'nationalId' | 'mobile' | 'economicCode' | 'fullName';
    fieldTitleFa: string;
    matchedValue: string;
    isExact: boolean;
  }>;
  existingRecord: {
    primaryType: PartyPrimaryType;
    status: PartyStatus;
    mobile: string;
    nationalId?: string | null;
  };
}

export interface DuplicateCheckResponse {
  hasDuplicate: boolean;
  isBlocking: boolean;
  messageFa: string;
  duplicates: DuplicateCandidate[];
}

// ============================================================================
// STAGE 4: INVENTORY, ITEMS, BRANDS, SPECS, SERIAL/MAC & KARDEX
// ============================================================================

export interface ItemCategoryRecord {
  id: number;
  code: string;
  categoryCode?: string;
  nameFa: string;
  titleFa?: string;
  prefix?: string;
  descriptionFa?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ItemBrandRecord {
  id: number;
  code: string;
  nameEn: string;
  nameFa: string;
  originCountryFa?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ItemUnitRecord {
  id: number;
  code: string;
  nameFa: string;
  allowDecimals: boolean;
  createdAt: string;
}

export interface ItemRecord {
  id: number;
  itemCode: string; // e.g. ITM-10001
  barcode?: string | null;
  titleFa: string;
  model: string;
  categoryId: number;
  categoryNameFa?: string;
  brandId: number;
  brandName?: string;
  unitId: number;
  unitNameFa?: string;
  isSerialized: boolean;
  hasMacAddress: boolean;
  technicalSpecs: Record<string, string | number | boolean>;
  minStockAlert: number;
  maxStockLevel?: number | null;
  purchasePriceIrr: number;
  salePriceIrr: number;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  // Dynamic calculated inventory fields:
  totalStock?: number;
  warehouseStocks?: Record<number, number>;
  activeSerialsCount?: number;
  isLowStock?: boolean;
}

export interface WarehouseRecord {
  id: number;
  warehouseCode: string; // e.g. WH-01
  code?: string;
  titleFa: string;
  keeperNameFa: string;
  managerNameFa?: string;
  phone?: string | null;
  addressFa?: string | null;
  locationAddressFa?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  totalItemsCount?: number;
  totalValuationIrr?: number;
}

export type SerialStatus = 'IN_STOCK' | 'DISPATCHED' | 'RESERVED' | 'RETURNED' | 'RETURNED_TO_SUPPLIER' | 'DEFECTIVE';

export interface ItemSerialRecord {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  serialNumber: string;
  macAddress?: string | null;
  currentWarehouseId: number;
  warehouseTitleFa?: string;
  status: SerialStatus;
  initialDocNumber?: string | null;
  lastDocNumber?: string | null;
  purchaseInvoiceId?: number | null;
  unitCostIrr?: number | null; // بهای تمام‌شده خرید اختصاصی این واحد فیزیکی (Landed Cost per unit)
  lastPartyId?: number | null;
  lastPartyNameFa?: string | null;
  notesFa?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InventoryDocType =
  | 'INBOUND_PURCHASE' // رسید ورود از خرید (افزایش موجودی)
  | 'OUTBOUND_SALE' // حواله خروج فروش (کاهش موجودی)
  | 'TRANSFER' // انتقال بین انبارها
  | 'INBOUND_RETURN' // برگشت از فروش (افزایش موجودی)
  | 'OUTBOUND_RETURN' // برگشت به تأمین‌کننده (کاهش موجودی)
  | 'ADJUSTMENT_IN' // افزایش موجودی (انبارگردانی مثبت)
  | 'ADJUSTMENT_OUT'; // کاهش موجودی (انبارگردانی منفی)

export interface InventoryDocumentLine {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  unitNameFa?: string;
  quantity: number;
  unitCostIrr: number;
  totalCostIrr: number;
  serialNumbers?: string[];
  notesFa?: string;
}

export interface InventoryDocumentRecord {
  id: number;
  docNumber: string; // e.g. WH-IN-1405-1001
  docType: InventoryDocType;
  dateJalali: string;
  sourceWarehouseId?: number | null;
  sourceWarehouseTitleFa?: string | null;
  targetWarehouseId?: number | null;
  targetWarehouseTitleFa?: string | null;
  partyId?: number | null;
  partyNameFa?: string | null;
  lines: InventoryDocumentLine[];
  totalAmountIrr: number;
  status: 'CONFIRMED' | 'DRAFT' | 'CANCELLED';
  notesFa?: string | null;
  actorUserId: number;
  actorUsername?: string;
  createdAt: string;
}

export interface ItemKardexEntry {
  id: number;
  itemId: number;
  timestamp: string;
  dateJalali: string;
  docId: number;
  docNumber: string;
  docType: InventoryDocType;
  docTypeTitleFa: string;
  warehouseId: number;
  warehouseTitleFa: string;
  partyNameFa?: string;
  qtyIn: number;
  qtyOut: number;
  runningBalance: number;
  unitCostIrr: number;
  totalCostIrr: number;
  serialNumbers?: string[];
  notesFa?: string;
}

// ============================================================================
// STAGE 5: PURCHASES, LANDED COST & SUPPLIER DEBT (خرید، بهای تمام‌شده و بدهی تأمین‌کننده)
// ============================================================================

export type ForeignCurrencyCode = 'IRR' | 'IRT' | 'USD' | 'AED' | 'EUR' | 'CNY';

export type CostAllocationMethod = 'BY_VALUE' | 'BY_QUANTITY';

export type PurchaseProformaStatus = 'DRAFT' | 'APPROVED' | 'CONVERTED' | 'REJECTED';

export type PurchaseInvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';

export type PurchasePaymentMethod = 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'POS' | 'SATNA_PAYA';

export interface PurchaseLandedCosts {
  freightCostIrr: number; // هزینه حمل و نقل
  insuranceCostIrr: number; // بیمه محموله
  packagingCostIrr: number; // بسته‌بندی
  customsCostIrr: number; // حقوق و عوارض گمرکی
  nonRefundableTaxIrr: number; // مالیات و عوارض غیرقابل استرداد
  otherLandedCostIrr: number; // سایر هزینه‌های مستقیم خرید
  totalLandedCostsIrr: number; // مجموع هزینه‌های سربار
}

export interface PurchaseInvoiceLine {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  unitNameFa?: string;
  quantity: number;
  unitPriceForeign: number;
  unitPriceIrr: number;
  discountIrr: number;
  vatAmountIrr: number;
  netPriceIrr: number; // (unitPriceIrr - discountIrr) * quantity + vatAmountIrr
  allocatedLandedCostPerUnitIrr: number; // سهم سربار به ازای هر واحد کالا
  finalLandedCostPerUnitIrr: number; // بهای تمام‌شده نهایی هر واحد (پایه + سربار)
  totalLandedCostIrr: number; // quantity * finalLandedCostPerUnitIrr
  serialNumbers?: string[];
  macAddresses?: string[];
  notesFa?: string;
}

export interface PurchaseProformaLine {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  unitNameFa?: string;
  quantity: number;
  unitPriceForeign: number;
  unitPriceIrr: number;
  totalPriceIrr: number;
  notesFa?: string;
}

export interface PurchaseProformaRecord {
  id: number;
  proformaNumber: string; // e.g. PO-1405-1001
  supplierId: number;
  supplierTitleFa: string;
  dateJalali: string;
  validUntilJalali: string;
  currency: ForeignCurrencyCode;
  exchangeRateToIrr: number;
  lines: PurchaseProformaLine[];
  subtotalIrr: number;
  status: PurchaseProformaStatus;
  convertedInvoiceId?: number | null;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoiceRecord {
  id: number;
  invoiceNumber: string; // e.g. PI-1405-1001
  supplierInvoiceNumber?: string | null;
  supplierId: number;
  supplierTitleFa: string;
  targetWarehouseId: number;
  targetWarehouseTitleFa: string;
  proformaId?: number | null;
  proformaNumber?: string | null;
  dateJalali: string;
  dueDateJalali: string;
  currency: ForeignCurrencyCode;
  exchangeRateToIrr: number;
  costAllocationMethod: CostAllocationMethod;
  landedCosts: PurchaseLandedCosts;
  lines: PurchaseInvoiceLine[];
  subtotalNetItemsIrr: number;
  totalDiscountIrr: number;
  totalVatIrr: number;
  totalInvoicePayableToSupplierIrr: number; // مبلغ تعهد پرداختی به تأمین‌کننده
  totalInventoryValuationIrr: number; // بهای تمام‌شده کل ورود به انبار (خرید + سربار)
  paidAmountIrr: number;
  remainingDebtIrr: number;
  status: PurchaseInvoiceStatus;
  inventoryDocId?: number | null;
  inventoryDocNumber?: string | null;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePaymentRecord {
  id: number;
  paymentNumber: string; // e.g. PAY-1405-1001
  supplierId: number;
  supplierTitleFa: string;
  purchaseInvoiceId?: number | null;
  invoiceNumber?: string | null;
  paymentDateJalali: string;
  amountIrr: number;
  paymentMethod: PurchasePaymentMethod;
  sourceAccountOrBank: string;
  trackingReference: string;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
}

export interface PurchaseReturnLine {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  quantity: number;
  unitCreditIrr: number;
  totalCreditIrr: number;
  serialNumbers?: string[];
  reasonFa?: string;
}

export interface PurchaseReturnRecord {
  id: number;
  returnNumber: string; // e.g. PRET-1405-1001
  purchaseInvoiceId: number;
  invoiceNumber: string;
  supplierId: number;
  supplierTitleFa: string;
  sourceWarehouseId: number;
  sourceWarehouseTitleFa: string;
  dateJalali: string;
  lines: PurchaseReturnLine[];
  totalReturnCreditIrr: number;
  inventoryDocId: number;
  inventoryDocNumber: string;
  status: 'CONFIRMED' | 'DRAFT';
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
}

// ============================================================================
// STAGE 6: SALES, PROFORMA, QUICK SALE (POS) & SALES RETURNS (فروش، پیش‌فاکتور و فروش سریع)
// ============================================================================

export type SalesProformaStatus = 'DRAFT' | 'APPROVED' | 'CONVERTED' | 'EXPIRED' | 'REJECTED';

export type SalesInvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';

export type SalesPaymentMethod = 'CASH' | 'POS' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'WALK_IN_QUICK_PAY';

export type SalesInvoiceType = 'STANDARD_SALE' | 'QUICK_POS_SALE' | 'PROFORMA_CONVERTED';

export interface SalesProformaLine {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  unitNameFa?: string;
  quantity: number;
  unitPriceIrr: number;
  discountIrr: number;
  vatAmountIrr: number;
  totalPriceIrr: number;
  notesFa?: string;
}

export interface SalesProformaRecord {
  id: number;
  proformaNumber: string; // e.g. SQO-1405-1001
  customerId: number;
  customerTitleFa: string;
  dateJalali: string;
  validUntilJalali: string;
  lines: SalesProformaLine[];
  subtotalItemsIrr: number;
  totalDiscountIrr: number;
  totalVatIrr: number;
  totalPayableIrr: number;
  status: SalesProformaStatus;
  convertedInvoiceId?: number | null;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoiceLine {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  unitNameFa?: string;
  quantity: number;
  unitPriceIrr: number;
  discountIrr: number;
  vatAmountIrr: number;
  netPriceIrr: number; // (unitPriceIrr - discountIrr) * quantity + vatAmountIrr
  unitCogsIrr: number; // بهای تمام‌شده واحد (از سربار خرید / سریال / FIFO)
  totalCogsIrr: number; // quantity * unitCogsIrr
  serialNumbers?: string[];
  macAddresses?: string[];
  notesFa?: string;
}

export interface SalesInvoiceRecord {
  id: number;
  invoiceNumber: string; // e.g. INV-1405-1001 or POS-1405-1001
  saleType: SalesInvoiceType;
  customerId: number;
  customerTitleFa: string;
  sourceWarehouseId: number;
  sourceWarehouseTitleFa: string;
  proformaId?: number | null;
  proformaNumber?: string | null;
  dateJalali: string;
  dueDateJalali: string;
  lines: SalesInvoiceLine[];
  subtotalNetItemsIrr: number;
  totalDiscountIrr: number;
  totalVatIrr: number;
  totalInvoiceAmountIrr: number; // مبلغ نهایی قابل دریافت از مشتری
  totalCogsIrr: number; // مجموع بهای تمام‌شده کالای فروش‌رفته (COGS)
  paidAmountIrr: number;
  remainingBalanceIrr: number;
  status: SalesInvoiceStatus;
  inventoryDocId?: number | null;
  inventoryDocNumber?: string | null;
  paymentDetails?: {
    paymentMethod: SalesPaymentMethod;
    trackingReference?: string;
    posTerminalOrBank?: string;
  };
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesReceiptRecord {
  id: number;
  receiptNumber: string; // e.g. REC-1405-1001
  customerId: number;
  customerTitleFa: string;
  salesInvoiceId?: number | null;
  invoiceNumber?: string | null;
  paymentDateJalali: string;
  amountIrr: number;
  paymentMethod: SalesPaymentMethod;
  destinationBankOrCash: string;
  trackingReference: string;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
}

export interface SalesReturnLine {
  id: number;
  itemId: number;
  itemCode?: string;
  itemTitleFa?: string;
  quantity: number;
  unitRefundIrr: number;
  totalRefundIrr: number;
  serialNumbers?: string[];
  reasonFa?: string;
}

export interface SalesReturnRecord {
  id: number;
  returnNumber: string; // e.g. SRET-1405-1001
  salesInvoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerTitleFa: string;
  targetWarehouseId: number;
  targetWarehouseTitleFa: string;
  dateJalali: string;
  lines: SalesReturnLine[];
  totalRefundAmountIrr: number;
  inventoryDocId: number;
  inventoryDocNumber: string;
  status: 'CONFIRMED' | 'DRAFT';
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
}

// ============================================================================
// STAGE 7: INSTALLATION SERVICES & ENHANCED SALES RETURNS
// ============================================================================

export type InstallationJobStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface InstallationJobRecord {
  id: number;
  jobCode: string; // e.g. INS-1405-1001
  titleFa: string;
  customerId: number;
  customerTitleFa: string;
  salesInvoiceId?: number | null;
  invoiceNumber?: string | null;
  installerId?: number | null;
  installerTitleFa?: string | null;
  serviceFeeIrr: number;
  additionalExpensesIrr: number;
  totalCostIrr: number;
  paidAmountIrr: number;
  remainingBalanceIrr: number;
  locationAddressFa: string;
  scheduledDateJalali: string;
  completedDateJalali?: string | null;
  status: InstallationJobStatus;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// STAGE 8: TREASURY, CASH/BANK, CHEQUES, INSTALLMENTS & OPERATIONAL EXPENSES
// ============================================================================

export interface CashBoxRecord {
  id: number;
  boxCode: string; // e.g. CB-1001
  titleFa: string;
  cashierUserId?: number | null;
  balanceIrr: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface BankAccountRecord {
  id: number;
  accountCode: string; // e.g. BA-1001
  bankNameFa: string;
  accountNumber: string;
  shabaNumber?: string | null;
  balanceIrr: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export type ChequeType = 'INBOUND' | 'OUTBOUND';
export type ChequeStatus = 'IN_HAND' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED';

export interface ChequeRecord {
  id: number;
  chequeNumber: string;
  chequeType: ChequeType;
  partyId: number;
  partyNameFa: string;
  bankNameFa: string;
  branchNameFa?: string | null;
  amountIrr: number;
  issueDateJalali: string;
  dueDateJalali: string;
  status: ChequeStatus;
  depositBankAccountId?: number | null;
  clearedDateJalali?: string | null;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryTransactionRecord {
  id: number;
  txNumber: string; // e.g. TRN-1405-1001
  txType: 'RECEIPT' | 'PAYMENT' | 'TRANSFER' | 'EXPENSE' | 'INCOME';
  dateJalali: string;
  partyId?: number | null;
  partyNameFa?: string | null;
  amountIrr: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'POS' | 'CHEQUE';
  sourceCashBoxId?: number | null;
  sourceBankAccountId?: number | null;
  targetCashBoxId?: number | null;
  targetBankAccountId?: number | null;
  chequeId?: number | null;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
}

export interface InstallmentRecord {
  id: number;
  installmentCode: string; // e.g. INS-SCH-1001
  titleFa: string;
  partyId: number;
  partyNameFa: string;
  salesInvoiceId?: number | null;
  purchaseInvoiceId?: number | null;
  installmentNumber: number;
  totalInstallments: number;
  amountIrr: number;
  dueDateJalali: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDateJalali?: string | null;
  treasuryTxId?: number | null;
  notesFa?: string | null;
  createdAt: string;
}

export interface OperationalExpenseRecord {
  id: number;
  expenseCode: string; // e.g. EXP-1405-1001
  categoryFa: string; // اجاره، قبوض، حقوق و دستمزد، بازاریابی، ملزومات، سایر
  titleFa: string;
  amountIrr: number;
  dateJalali: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'POS';
  sourceBankOrCash: string;
  notesFa?: string | null;
  actorUserId?: number;
  createdAt?: string;
}

export interface OperationalIncomeRecord {
  id: number;
  incomeCode: string; // e.g. INC-1405-1001
  categoryFa: string; // درآمدهای عملیاتی، خدمات مشاوره، فروش ضایعات، سود بانکی، سایر
  titleFa: string;
  amountIrr: number;
  dateJalali: string;
  receiptMethod: 'CASH' | 'BANK_TRANSFER' | 'POS';
  targetBankOrCash: string;
  notesFa?: string | null;
  actorUserId: number;
  createdAt: string;
}

export interface SimpleOpeningBalancePayload {
  dateJalali: string;
  bankBalances: Array<{ id: number; titleFa: string; balanceIrr: number }>;
  cashBalances: Array<{ id: number; titleFa: string; balanceIrr: number }>;
  partyBalances: Array<{ partyId: number; partyTitleFa: string; type: 'DEBTOR' | 'CREDITOR'; amountIrr: number }>;
  inventoryBalances: Array<{ itemId: number; itemTitleFa: string; warehouseId: number; qty: number; unitCostIrr: number }>;
  notesFa?: string;
}

// ============================================================================
// STAGE 9: DOUBLE-ENTRY ACCOUNTING, CHART OF ACCOUNTS, DOCUMENTS & GENERAL LEDGER
// ============================================================================

export type AccountLevel = 'GROUP' | 'GENERAL' | 'SUBSIDIARY';
export type AccountNature = 'DEBIT' | 'CREDIT';
export type AccountGroupCode = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export interface AccountRecord {
  id: number;
  code: string; // e.g. '101', '10101'
  titleFa: string;
  level: AccountLevel;
  parentCode: string | null;
  nature: AccountNature;
  groupCode: AccountGroupCode;
  groupTitleFa: string;
  descriptionFa?: string;
  isSystem: boolean;
  createdAt: string;
}

export type AccountingDocumentStatus = 'DRAFT' | 'APPROVED' | 'PERMANENT';

export type AccountingSourceDocType =
  | 'MANUAL'
  | 'SALES_INVOICE'
  | 'PURCHASE_INVOICE'
  | 'TREASURY_RECEIPT'
  | 'TREASURY_PAYMENT'
  | 'CHEQUE_CLEARANCE'
  | 'CHEQUE_BOUNCE'
  | 'OPERATIONAL_EXPENSE'
  | 'INSTALLATION_JOB'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'PROJECT_CONSUMPTION'
  | 'CLOSING_PERIOD';

export interface AccountingDocumentLine {
  id: number;
  rowNumber: number;
  accountCode: string;
  accountTitleFa: string;
  detailId?: number | null;
  detailType?: 'PARTY' | 'CASH_BOX' | 'BANK_ACCOUNT' | 'COST_CENTER' | null;
  detailTitleFa?: string | null;
  debitIrr: number;
  creditIrr: number;
  descriptionFa: string;
}

export interface AccountingDocumentRecord {
  id: number;
  docNumber: string; // e.g. DOC-1405-0001
  referenceNumber?: string | null;
  dateJalali: string;
  dateIso: string;
  docType: 'MANUAL' | 'AUTO' | 'CLOSING';
  sourceDocType?: AccountingSourceDocType | null;
  sourceDocId?: string | number | null;
  descriptionFa: string;
  status: AccountingDocumentStatus;
  totalDebitIrr: number;
  totalCreditIrr: number;
  lines: AccountingDocumentLine[];
  createdByUserId: number;
  createdByName: string;
  approvedByUserId?: number | null;
  approvedByName?: string | null;
  permanentByUserId?: number | null;
  permanentByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLedgerEntry {
  id: string;
  docId: number;
  docNumber: string;
  dateJalali: string;
  rowNumber: number;
  accountCode: string;
  accountTitleFa: string;
  detailTitleFa?: string;
  descriptionFa: string;
  debitIrr: number;
  creditIrr: number;
}

export interface GeneralLedgerEntry {
  docId: number;
  docNumber: string;
  dateJalali: string;
  descriptionFa: string;
  debitIrr: number;
  creditIrr: number;
  runningBalanceIrr: number;
  balanceSide: 'بدهکار' | 'بستانکار' | 'تسویه';
}

export interface GeneralLedgerAccountSummary {
  accountCode: string;
  accountTitleFa: string;
  level: AccountLevel;
  nature: AccountNature;
  totalDebitIrr: number;
  totalCreditIrr: number;
  netBalanceIrr: number;
  balanceSide: 'DEBIT' | 'CREDIT' | 'ZERO';
  entries: GeneralLedgerEntry[];
}

export interface TrialBalanceRow {
  accountCode: string;
  accountTitleFa: string;
  level: AccountLevel;
  groupTitleFa: string;
  nature: AccountNature;
  totalDebitIrr: number;
  totalCreditIrr: number;
  remainingDebitIrr: number;
  remainingCreditIrr: number;
}

// ============================================================================
// STAGE 10: FISCAL YEARS, ACCOUNTING PERIODS, PERIOD CLOSING,
// COST CENTERS & MULTI-DIMENSIONAL PROFITABILITY ANALYTICS
// ============================================================================

export type FiscalPeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export interface FiscalYearRecord {
  id: number;
  yearCode: string; // e.g. '1405'
  titleFa: string; // e.g. 'سال مالی ۱۴۰۵'
  startDateJalali: string; // '1405/01/01'
  endDateJalali: string; // '1405/12/29'
  status: FiscalPeriodStatus;
  isDefault: boolean;
  closingDocId?: number | null;
  closingDocNumber?: string | null;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closedByNameFa?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingPeriodRecord {
  id: number;
  fiscalYearId: number;
  fiscalYearCode: string;
  periodNumber: number; // 1 to 12
  titleFa: string; // e.g. 'فروردین‌ماه ۱۴۰۵' or 'بهار ۱۴۰۵'
  startDateJalali: string;
  endDateJalali: string;
  status: FiscalPeriodStatus;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closingDocId?: number | null;
  closingDocNumber?: string | null;
  notesFa?: string | null;
}

export interface CostCenterRecord {
  id: number;
  code: string; // e.g. 'CC-101'
  titleFa: string;
  managerNameFa?: string | null;
  budgetIrr?: number;
  isActive: boolean;
  descriptionFa?: string | null;
  createdAt: string;
}

export interface ProfitabilityDimensionRow {
  keyId: string | number;
  dimensionCode: string;
  dimensionTitleFa: string;
  subTitleFa?: string;
  quantitySold: number;
  grossSalesIrr: number;
  discountsIrr: number;
  returnsIrr: number;
  netSalesIrr: number;
  cogsIrr: number;
  grossProfitIrr: number;
  grossMarginPct: number;
  allocatedExpensesIrr: number;
  netProfitIrr: number;
  netMarginPct: number;
}

export interface ProfitabilitySummary {
  totalGrossSalesIrr: number;
  totalDiscountsIrr: number;
  totalReturnsIrr: number;
  totalNetSalesIrr: number;
  totalCogsIrr: number;
  totalGrossProfitIrr: number;
  overallGrossMarginPct: number;
  totalOperatingExpensesIrr: number;
  totalInstallerWagesIrr: number;
  totalNetProfitIrr: number;
  overallNetMarginPct: number;
  invoicesCount: number;
  returnsCount: number;
}

export interface ComprehensiveProfitabilityReport {
  summary: ProfitabilitySummary;
  byItem: ProfitabilityDimensionRow[];
  byCategory: ProfitabilityDimensionRow[];
  byCustomer: ProfitabilityDimensionRow[];
  byInstaller: ProfitabilityDimensionRow[];
  byProject: ProfitabilityDimensionRow[];
  fiscalYearCode?: string;
  fromDateJalali?: string;
  toDateJalali?: string;
  generatedAt: string;
}

export interface PeriodCloseResult {
  ok: boolean;
  messageFa: string;
  closingDoc?: AccountingDocumentRecord;
  closingDateJalali: string;
  netProfitIrr: number;
  retainedEarningsDocNumber?: string;
}

// ============================================================================
// STAGE 11: PROJECTS + INSTALLERS + MATERIAL CONSUMPTION + END-TO-END PROFITABILITY
// ============================================================================

export type ProjectStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ProjectVisitReport {
  visitDateJalali: string;
  notesFa: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedByUserId: number;
  submittedByNameFa: string;
  reviewedByUserId?: number | null;
  reviewedByNameFa?: string | null;
  reviewNotesFa?: string | null;
  updatedProjectStatus?: ProjectStatus;
}

export interface ProjectRecord {
  id: number;
  projectCode: string; // e.g. PRJ-1405-101
  titleFa: string;
  customerId: number;
  customerTitleFa: string;
  installerId?: number | null;
  installerTitleFa?: string | null;
  salesInvoiceId?: number | null;
  invoiceNumber?: string | null;
  costCenterId?: number | null;
  costCenterCode?: string | null;
  status: ProjectStatus;
  locationAddressFa: string;
  startDateJalali: string;
  targetCompletionDateJalali?: string | null;
  actualCompletionDateJalali?: string | null;
  contractAmountIrr: number; // مبلغ کل قرارداد پروژه
  consumedMaterialsCostIrr: number; // بهای تمام‌شده کالای مصرف‌شده در پروژه
  installerLaborCostIrr: number; // دستمزد نصاب
  allocatedExpensesIrr: number; // هزینه‌های سربار و ترابری
  netProfitIrr: number; // سود خالص
  netMarginPct: number; // حاشیه سود
  notesFa?: string | null;
  lastVisitReport?: ProjectVisitReport | null;
  actorUserId: number;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMaterialRequisitionStatus =
  | 'REQUESTED' // ثبت درخواست کالا توسط نصاب
  | 'APPROVED' // تأیید مدیر فنی
  | 'ISSUED' // تحویل انباردار به نصاب
  | 'CONSUMED' // مصرف قطعی در محل پروژه
  | 'RETURNED' // برگشت اقلام مازاد به انبار
  | 'REJECTED'; // رد درخواست

export interface ProjectMaterialRequisitionRecord {
  id: number;
  requestCode: string; // e.g. REQ-1405-101
  projectId: number;
  projectCode: string;
  projectTitleFa: string;
  itemId: number;
  itemCode: string;
  itemTitleFa: string;
  sourceWarehouseId: number;
  sourceWarehouseTitleFa: string;
  requestedQty: number;
  approvedQty: number;
  issuedQty: number;
  consumedQty: number;
  returnedQty: number;
  unitCostIrr: number; // بر اساس خرید و ارزش انبار
  totalCostIrr: number; // ارزش نهایی مصرف‌شده
  serials?: string[];
  status: ProjectMaterialRequisitionStatus;
  requestedByUserId: number;
  requestedByNameFa: string;
  approvedByUserId?: number | null;
  approvedByNameFa?: string | null;
  issuedByUserId?: number | null;
  issuedByNameFa?: string | null;
  consumedAtJalali?: string | null;
  returnedAtJalali?: string | null;
  notesFa?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProfitabilityDetail {
  projectId: number;
  projectCode: string;
  projectTitleFa: string;
  customerTitleFa: string;
  installerTitleFa: string;
  contractAmountIrr: number;
  invoicedRevenueIrr: number;
  totalMaterialCostIrr: number;
  installerWagesIrr: number;
  allocatedExpensesIrr: number;
  totalCostsIrr: number;
  grossProfitIrr: number;
  grossMarginPct: number;
  netProfitIrr: number;
  netMarginPct: number;
  requisitions: ProjectMaterialRequisitionRecord[];
  materialsBreakdown: Array<{
    itemId: number;
    itemTitleFa: string;
    consumedQty: number;
    unitCostIrr: number;
    totalCostIrr: number;
  }>;
}

export interface QuickSettlementPayload {
  partyId: number;
  txType: 'RECEIPT' | 'PAYMENT';
  amountIrr: number;
  dateJalali: string;
  paymentMethod: 'POS' | 'CHEQUE' | 'BANK_TRANSFER' | 'CASH' | 'INSTALLMENT';
  bankAccountId?: number;
  cashBoxId?: number;
  chequeNumber?: string;
  chequeDueDateJalali?: string;
  bankNameFa?: string;
  referenceNumber?: string;
  installmentCount?: number;
  descriptionFa?: string;
}

// Stage 12: Fixed Assets & Depreciation Interfaces
export interface FixedAssetRecord {
  id: number;
  assetCode: string;
  titleFa: string;
  purchaseDateJalali: string;
  purchaseCostIrr: number;
  salvageValueIrr: number;
  usefulLifeYears: number;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  status: 'ACTIVE' | 'DISPOSED' | 'FULLY_DEPRECIATED';
  custodianPartyId?: number | null;
  custodianTitleFa?: string | null;
  locationAddressFa: string;
  accumulatedDepreciationIrr: number;
  bookValueIrr: number;
  lastDepreciationDateJalali?: string | null;
  createdAt: string;
}

export interface DepreciationEntryRecord {
  id: number;
  assetId: number;
  assetTitleFa: string;
  periodJalali: string;
  depreciationAmountIrr: number;
  accountingDocId?: number | null;
  postedAt: string;
}

// Opening Balance Voucher & Excel Import Interfaces
export interface OpeningBalanceImportItem {
  type: 'PARTY' | 'INVENTORY' | 'BANK_CASH' | 'GENERAL_ACCOUNT';
  refId?: number;
  code?: string;
  titleFa: string;
  accountCode: string;
  debitIrr: number;
  creditIrr: number;
  qty?: number;
  unitCostIrr?: number;
  warehouseId?: number;
  notesFa?: string;
}

export interface OpeningBalanceBatchPayload {
  dateJalali: string;
  descriptionFa: string;
  items: OpeningBalanceImportItem[];
}


