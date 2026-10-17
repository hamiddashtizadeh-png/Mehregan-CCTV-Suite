import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// STAGE 1: FOUNDATION, SETTINGS, AUTH, RBAC, AUDIT & SYSTEM GOVERNANCE
// ============================================================================

export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull().default('فروشگاه دوربین مداربسته و سیستم‌های امنیتی مهرگان'),
  economicCode: text('economic_code').notNull().default('411-8920-3314'),
  nationalId: text('national_id').notNull().default('14009871230'),
  phone: text('phone').notNull().default('021-66748920'),
  addressFa: text('address_fa').notNull().default('تهران، خیابان جمهوری، تقاطع حافظ، مجتمع تجاری تخصصی مهرگان، طبقه ۲'),
  baseCurrencyCode: text('base_currency_code').notNull().default('IRR'), // IRR (ریال) as immutable accounting ledger base
  displayCurrencyCode: text('display_currency_code').notNull().default('IRT'), // IRT (تومان) or IRR for UI display
  inventoryCostingMethod: text('inventory_costing_method').notNull().default('SPECIFIC_OR_FIFO'),
  landedCostAllocationDefault: text('landed_cost_allocation_default').notNull().default('BY_VALUE'),
  setupCompleted: boolean('setup_completed').notNull().default(true),
  activeFiscalYearCode: text('active_fiscal_year_code').notNull().default('1405'),
  allowNegativeInventory: boolean('allow_negative_inventory').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: text('username').notNull(),
    fullName: text('full_name').notNull(),
    jobTitle: text('job_title').notNull(),
    email: text('email'),
    passwordHash: text('password_hash').notNull(), // Salted PBKDF2 hash (Never exposed)
    passwordSalt: text('password_salt').notNull(),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE | SUSPENDED
    isInitialAdmin: boolean('is_initial_admin').notNull().default(false),
    isDemo: boolean('is_demo').notNull().default(false),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_username_idx').on(table.username)]
);

export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(), // e.g. OWNER, CHIEF_ACCOUNTANT, WAREHOUSE_KEEPER
    titleFa: text('title_fa').notNull(),
    descriptionFa: text('description_fa').notNull(),
    isSystemRole: boolean('is_system_role').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('roles_code_idx').on(table.code)]
);

export const permissions = pgTable(
  'permissions',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(), // e.g. foundation.users.manage
    moduleNumber: integer('module_number').notNull(),
    moduleNameFa: text('module_name_fa').notNull(),
    titleFa: text('title_fa').notNull(),
    descriptionFa: text('description_fa').notNull(),
    isCritical: boolean('is_critical').notNull().default(false),
  },
  (table) => [uniqueIndex('permissions_code_idx').on(table.code)]
);

// Note: Even the OWNER role receives permissions exclusively through rows in role_permissions table
export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  roleCode: text('role_code').notNull(),
  permissionCode: text('permission_code').notNull(),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
  grantedBy: text('granted_by').notNull().default('SYSTEM_SEED'),
});

export const userRoleAssignments = pgTable('user_role_assignments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  roleCode: text('role_code').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: text('assigned_by').notNull().default('SYSTEM'),
});

// Explicit Precedence Rule: Explicit Deny > Explicit Grant > Role Permission > Default Deny
export const userPermissionOverrides = pgTable('user_permission_overrides', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  permissionCode: text('permission_code').notNull(),
  effect: text('effect').notNull(), // 'DENY' | 'ALLOW'
  reasonFa: text('reason_fa').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  traceId: text('trace_id').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  actorUserId: integer('actor_user_id'),
  actorUsername: text('actor_username').notNull(),
  actorRoleSummary: text('actor_role_summary').notNull(),
  action: text('action').notNull(),
  category: text('category').notNull(), // SECURITY | AUTH | RBAC | SETTINGS | MIGRATION | CONNECTION
  targetEntity: text('target_entity').notNull(),
  targetId: text('target_id').notNull(),
  status: text('status').notNull(), // SUCCESS | DENIED | FAILED
  detailsFa: text('details_fa').notNull(),
  sanitizedMetadata: jsonb('sanitized_metadata').notNull(),
});

export const schemaMigrations = pgTable(
  'schema_migrations',
  {
    id: serial('id').primaryKey(),
    version: text('version').notNull(),
    name: text('name').notNull(),
    descriptionFa: text('description_fa').notNull(),
    checksum: text('checksum').notNull(),
    isDestructive: boolean('is_destructive').notNull().default(false),
    status: text('status').notNull().default('APPLIED'), // APPLIED | PENDING
    executionMs: integer('execution_ms').notNull().default(12),
    appliedAt: timestamp('applied_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('schema_migrations_version_idx').on(table.version)]
);

export const currencies = pgTable(
  'currencies',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(), // IRR, IRT, USD, CNY, AED
    nameFa: text('name_fa').notNull(),
    symbol: text('symbol').notNull(),
    decimals: integer('decimals').notNull().default(0),
    isBaseLedger: boolean('is_base_ledger').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('currencies_code_idx').on(table.code)]
);

export const exchangeRates = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  fromCurrencyCode: text('from_currency_code').notNull(),
  toCurrencyCode: text('to_currency_code').notNull().default('IRR'),
  rateToIrr: numeric('rate_to_irr', { precision: 18, scale: 2 }).notNull(),
  effectiveDateJalali: text('effective_date_jalali').notNull(),
  recordedBy: text('recorded_by').notNull(),
  sourceNoteFa: text('source_note_fa').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const fiscalYears = pgTable('fiscal_years', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(), // e.g. 1405
  titleFa: text('title_fa').notNull(),
  startDateJalali: text('start_date_jalali').notNull(),
  endDateJalali: text('end_date_jalali').notNull(),
  status: text('status').notNull().default('OPEN'),
  isCurrent: boolean('is_current').notNull().default(true),
});

export const documentNumberingRules = pgTable('document_numbering_rules', {
  id: serial('id').primaryKey(),
  docType: text('doc_type').notNull(),
  titleFa: text('title_fa').notNull(),
  prefix: text('prefix').notNull(),
  fiscalYearCode: text('fiscal_year_code').notNull().default('1405'),
  paddingDigits: integer('padding_digits').notNull().default(5),
  startNumber: integer('start_number').notNull().default(10001),
  currentNumber: integer('current_number').notNull().default(10001),
  immutableHistoryPolicy: text('immutable_history_policy').notNull().default('REVERSAL_ONLY'),
});

// ============================================================================
// STAGE 3: PARTIES & BUSINESS COUNTERPARTIES MODULE (اشخاص و طرف‌های تجاری)
// Single authoritative table for Customers, Suppliers, Installers & Partners
// ============================================================================

export const parties = pgTable(
  'parties',
  {
    id: serial('id').primaryKey(),
    partyCode: text('party_code').notNull(), // e.g. PRT-10001
    primaryType: text('primary_type').notNull().default('CUSTOMER'), // CUSTOMER | SUPPLIER | INSTALLER | PARTNER_OTHER
    roles: jsonb('roles').notNull().default(['CUSTOMER']), // Array of roles: ['CUSTOMER', 'INSTALLER', 'SUPPLIER']
    personType: text('person_type').notNull().default('NATURAL'), // NATURAL (حقیقی) | LEGAL (حقوقی)
    fullName: text('full_name').notNull(),
    companyTitle: text('company_title'),
    nationalId: text('national_id'), // کد ملی ۱۰ رقمی یا شناسه ملی ۱۱ رقمی
    economicCode: text('economic_code'), // کد اقتصادی ۱۲ رقمی
    registrationNumber: text('registration_number'), // شماره ثبت شرکت
    mobile: text('mobile').notNull(),
    phone: text('phone'),
    fax: text('fax'),
    email: text('email'),
    province: text('province').notNull().default('تهران'),
    city: text('city').notNull().default('تهران'),
    postalCode: text('postal_code'),
    addressFa: text('address_fa'),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE | INACTIVE
    creditLimitIrr: numeric('credit_limit_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    installerSkills: text('installer_skills'), // مهارت‌های تخصصی نصاب: دوربین‌های IP، داهوا، هایک‌ویژن، NVR، دزدگیر
    notes: text('notes'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('parties_party_code_idx').on(table.partyCode),
    uniqueIndex('parties_national_id_idx').on(table.nationalId),
  ]
);

export const partyTransactions = pgTable('party_transactions', {
  id: serial('id').primaryKey(),
  partyId: integer('party_id').notNull(),
  recordType: text('record_type').notNull(), // SALE_INVOICE | PURCHASE_INVOICE | PAYMENT | RECEIPT | CCTV_PROJECT
  referenceNumber: text('reference_number').notNull(), // e.g. INV-1405-1002
  titleFa: text('title_fa').notNull(),
  amountIrr: numeric('amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
  dateJalali: text('date_jalali').notNull(),
  status: text('status').notNull().default('COMPLETED'), // COMPLETED | PENDING | IN_PROGRESS | SETTLED
  notesFa: text('notes_fa'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// STAGE 4: INVENTORY, ITEMS, BRANDS, SPECS, SERIAL/MAC & WAREHOUSES
// ============================================================================

export const itemCategories = pgTable(
  'item_categories',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(), // e.g. CAT-CCTV-IP
    nameFa: text('name_fa').notNull(),
    descriptionFa: text('description_fa'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('item_categories_code_idx').on(table.code)]
);

export const itemBrands = pgTable(
  'item_brands',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(), // e.g. BRD-DAHUA
    nameEn: text('name_en').notNull(),
    nameFa: text('name_fa').notNull(),
    originCountryFa: text('origin_country_fa'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('item_brands_code_idx').on(table.code)]
);

export const itemUnits = pgTable(
  'item_units',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(), // e.g. UNIT-PCS
    nameFa: text('name_fa').notNull(),
    allowDecimals: boolean('allow_decimals').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('item_units_code_idx').on(table.code)]
);

export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    itemCode: text('item_code').notNull(), // e.g. ITM-10001
    barcode: text('barcode'),
    titleFa: text('title_fa').notNull(),
    model: text('model').notNull(),
    categoryId: integer('category_id').notNull().references(() => itemCategories.id),
    brandId: integer('brand_id').notNull().references(() => itemBrands.id),
    unitId: integer('unit_id').notNull().references(() => itemUnits.id),
    isSerialized: boolean('is_serialized').notNull().default(false),
    hasMacAddress: boolean('has_mac_address').notNull().default(false),
    technicalSpecs: jsonb('technical_specs').notNull().default({}),
    minStockAlert: numeric('min_stock_alert', { precision: 12, scale: 2 }).notNull().default('5'),
    maxStockLevel: numeric('max_stock_level', { precision: 12, scale: 2 }),
    purchasePriceIrr: numeric('purchase_price_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    salePriceIrr: numeric('sale_price_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE | INACTIVE
    notes: text('notes'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('items_item_code_idx').on(table.itemCode),
    uniqueIndex('items_barcode_idx').on(table.barcode),
  ]
);

export const warehouses = pgTable(
  'warehouses',
  {
    id: serial('id').primaryKey(),
    warehouseCode: text('warehouse_code').notNull(), // e.g. WH-01
    titleFa: text('title_fa').notNull(),
    keeperNameFa: text('keeper_name_fa').notNull(),
    phone: text('phone'),
    addressFa: text('address_fa'),
    status: text('status').notNull().default('ACTIVE'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('warehouses_code_idx').on(table.warehouseCode)]
);

export const itemSerials = pgTable(
  'item_serials',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id').notNull().references(() => items.id),
    serialNumber: text('serial_number').notNull(),
    macAddress: text('mac_address'),
    currentWarehouseId: integer('current_warehouse_id').notNull().references(() => warehouses.id),
    status: text('status').notNull().default('IN_STOCK'), // IN_STOCK | DISPATCHED | RESERVED | RETURNED | RETURNED_TO_SUPPLIER | DEFECTIVE
    initialDocNumber: text('initial_doc_number'),
    lastDocNumber: text('last_doc_number'),
    purchaseInvoiceId: integer('purchase_invoice_id'),
    unitCostIrr: numeric('unit_cost_irr', { precision: 18, scale: 2 }),
    lastPartyId: integer('last_party_id'),
    notesFa: text('notes_fa'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('item_serials_serial_number_idx').on(table.serialNumber)]
);

export const inventoryDocuments = pgTable(
  'inventory_documents',
  {
    id: serial('id').primaryKey(),
    docNumber: text('doc_number').notNull(), // e.g. WH-IN-1405-1001
    docType: text('doc_type').notNull(), // INBOUND_PURCHASE | OUTBOUND_SALE | TRANSFER | INBOUND_RETURN | OUTBOUND_RETURN | ADJUSTMENT_IN | ADJUSTMENT_OUT
    dateJalali: text('date_jalali').notNull(),
    sourceWarehouseId: integer('source_warehouse_id'),
    targetWarehouseId: integer('target_warehouse_id'),
    partyId: integer('party_id'),
    lines: jsonb('lines').notNull().default([]),
    totalAmountIrr: numeric('total_amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('CONFIRMED'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('inventory_documents_doc_number_idx').on(table.docNumber)]
);

// ============================================================================
// STAGE 5 TABLES: PURCHASES, LANDED COST & SUPPLIER DEBT
// ============================================================================

export const purchaseProformas = pgTable(
  'purchase_proformas',
  {
    id: serial('id').primaryKey(),
    proformaNumber: text('proforma_number').notNull(),
    supplierId: integer('supplier_id').notNull().references(() => parties.id),
    dateJalali: text('date_jalali').notNull(),
    validUntilJalali: text('valid_until_jalali').notNull(),
    currency: text('currency').notNull().default('IRR'),
    exchangeRateToIrr: numeric('exchange_rate_to_irr', { precision: 18, scale: 4 }).notNull().default('1'),
    lines: jsonb('lines').notNull().default([]),
    subtotalIrr: numeric('subtotal_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('DRAFT'), // DRAFT | APPROVED | CONVERTED | REJECTED
    convertedInvoiceId: integer('converted_invoice_id'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('purchase_proformas_number_idx').on(table.proformaNumber)]
);

export const purchaseInvoices = pgTable(
  'purchase_invoices',
  {
    id: serial('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull(), // PI-1405-1001
    supplierInvoiceNumber: text('supplier_invoice_number'),
    supplierId: integer('supplier_id').notNull().references(() => parties.id),
    targetWarehouseId: integer('target_warehouse_id').notNull().references(() => warehouses.id),
    proformaId: integer('proforma_id').references(() => purchaseProformas.id),
    dateJalali: text('date_jalali').notNull(),
    dueDateJalali: text('due_date_jalali').notNull(),
    currency: text('currency').notNull().default('IRR'),
    exchangeRateToIrr: numeric('exchange_rate_to_irr', { precision: 18, scale: 4 }).notNull().default('1'),
    costAllocationMethod: text('cost_allocation_method').notNull().default('BY_VALUE'), // BY_VALUE | BY_QUANTITY
    freightCostIrr: numeric('freight_cost_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    insuranceCostIrr: numeric('insurance_cost_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    packagingCostIrr: numeric('packaging_cost_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    customsCostIrr: numeric('customs_cost_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    nonRefundableTaxIrr: numeric('non_refundable_tax_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    otherLandedCostIrr: numeric('other_landed_cost_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalLandedCostsIrr: numeric('total_landed_costs_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    lines: jsonb('lines').notNull().default([]),
    subtotalNetItemsIrr: numeric('subtotal_net_items_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalDiscountIrr: numeric('total_discount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalVatIrr: numeric('total_vat_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalInvoicePayableToSupplierIrr: numeric('total_invoice_payable_to_supplier_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalInventoryValuationIrr: numeric('total_inventory_valuation_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    paidAmountIrr: numeric('paid_amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    remainingDebtIrr: numeric('remaining_debt_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('CONFIRMED'), // DRAFT | CONFIRMED | PAID | PARTIALLY_PAID | CANCELLED
    inventoryDocId: integer('inventory_doc_id').references(() => inventoryDocuments.id),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('purchase_invoices_number_idx').on(table.invoiceNumber)]
);

export const purchasePayments = pgTable(
  'purchase_payments',
  {
    id: serial('id').primaryKey(),
    paymentNumber: text('payment_number').notNull(),
    supplierId: integer('supplier_id').notNull().references(() => parties.id),
    purchaseInvoiceId: integer('purchase_invoice_id').references(() => purchaseInvoices.id),
    paymentDateJalali: text('payment_date_jalali').notNull(),
    amountIrr: numeric('amount_irr', { precision: 18, scale: 2 }).notNull(),
    paymentMethod: text('payment_method').notNull().default('BANK_TRANSFER'),
    sourceAccountOrBank: text('source_account_or_bank').notNull(),
    trackingReference: text('tracking_reference').notNull(),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('purchase_payments_number_idx').on(table.paymentNumber)]
);

export const purchaseReturns = pgTable(
  'purchase_returns',
  {
    id: serial('id').primaryKey(),
    returnNumber: text('return_number').notNull(),
    purchaseInvoiceId: integer('purchase_invoice_id').notNull().references(() => purchaseInvoices.id),
    supplierId: integer('supplier_id').notNull().references(() => parties.id),
    sourceWarehouseId: integer('source_warehouse_id').notNull().references(() => warehouses.id),
    dateJalali: text('date_jalali').notNull(),
    lines: jsonb('lines').notNull().default([]),
    totalReturnCreditIrr: numeric('total_return_credit_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    inventoryDocId: integer('inventory_doc_id').references(() => inventoryDocuments.id),
    status: text('status').notNull().default('CONFIRMED'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('purchase_returns_number_idx').on(table.returnNumber)]
);

// ============================================================================
// STAGE 6: SALES, PROFORMA, QUICK POS & SALES RETURNS
// ============================================================================

export const salesProformas = pgTable(
  'sales_proformas',
  {
    id: serial('id').primaryKey(),
    proformaNumber: text('proforma_number').notNull(),
    customerId: integer('customer_id').notNull().references(() => parties.id),
    dateJalali: text('date_jalali').notNull(),
    validUntilJalali: text('valid_until_jalali').notNull(),
    lines: jsonb('lines').notNull().default([]),
    subtotalItemsIrr: numeric('subtotal_items_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalDiscountIrr: numeric('total_discount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalVatIrr: numeric('total_vat_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalPayableIrr: numeric('total_payable_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('DRAFT'), // DRAFT | APPROVED | CONVERTED | EXPIRED | REJECTED
    convertedInvoiceId: integer('converted_invoice_id'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('sales_proformas_number_idx').on(table.proformaNumber)]
);

export const salesInvoices = pgTable(
  'sales_invoices',
  {
    id: serial('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull(), // INV-1405-1001 or POS-1405-1001
    saleType: text('sale_type').notNull().default('STANDARD_SALE'), // STANDARD_SALE | QUICK_POS_SALE | PROFORMA_CONVERTED
    customerId: integer('customer_id').notNull().references(() => parties.id),
    sourceWarehouseId: integer('source_warehouse_id').notNull().references(() => warehouses.id),
    proformaId: integer('proforma_id').references(() => salesProformas.id),
    dateJalali: text('date_jalali').notNull(),
    dueDateJalali: text('due_date_jalali').notNull(),
    lines: jsonb('lines').notNull().default([]),
    subtotalNetItemsIrr: numeric('subtotal_net_items_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalDiscountIrr: numeric('total_discount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalVatIrr: numeric('total_vat_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalInvoiceAmountIrr: numeric('total_invoice_amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalCogsIrr: numeric('total_cogs_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    paidAmountIrr: numeric('paid_amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    remainingBalanceIrr: numeric('remaining_balance_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('CONFIRMED'), // DRAFT | CONFIRMED | PAID | PARTIALLY_PAID | CANCELLED
    inventoryDocId: integer('inventory_doc_id').references(() => inventoryDocuments.id),
    paymentDetails: jsonb('payment_details'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('sales_invoices_number_idx').on(table.invoiceNumber)]
);

export const salesReceipts = pgTable(
  'sales_receipts',
  {
    id: serial('id').primaryKey(),
    receiptNumber: text('receipt_number').notNull(),
    customerId: integer('customer_id').notNull().references(() => parties.id),
    salesInvoiceId: integer('sales_invoice_id').references(() => salesInvoices.id),
    paymentDateJalali: text('payment_date_jalali').notNull(),
    amountIrr: numeric('amount_irr', { precision: 18, scale: 2 }).notNull(),
    paymentMethod: text('payment_method').notNull().default('POS'),
    destinationBankOrCash: text('destination_bank_or_cash').notNull(),
    trackingReference: text('tracking_reference').notNull(),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('sales_receipts_number_idx').on(table.receiptNumber)]
);

export const salesReturns = pgTable(
  'sales_returns',
  {
    id: serial('id').primaryKey(),
    returnNumber: text('return_number').notNull(),
    salesInvoiceId: integer('sales_invoice_id').notNull().references(() => salesInvoices.id),
    customerId: integer('customer_id').notNull().references(() => parties.id),
    targetWarehouseId: integer('target_warehouse_id').notNull().references(() => warehouses.id),
    dateJalali: text('date_jalali').notNull(),
    lines: jsonb('lines').notNull().default([]),
    totalRefundAmountIrr: numeric('total_refund_amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    inventoryDocId: integer('inventory_doc_id').references(() => inventoryDocuments.id),
    status: text('status').notNull().default('CONFIRMED'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('sales_returns_number_idx').on(table.returnNumber)]
);

// ============================================================================
// STAGE 7: INSTALLATION SERVICES & ENHANCED SALES RETURNS
// ============================================================================

export const installationJobs = pgTable(
  'installation_jobs',
  {
    id: serial('id').primaryKey(),
    jobCode: text('job_code').notNull(),
    titleFa: text('title_fa').notNull(),
    customerId: integer('customer_id').notNull().references(() => parties.id),
    salesInvoiceId: integer('sales_invoice_id').references(() => salesInvoices.id),
    installerId: integer('installer_id').references(() => parties.id),
    serviceFeeIrr: numeric('service_fee_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    additionalExpensesIrr: numeric('additional_expenses_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    totalCostIrr: numeric('total_cost_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    paidAmountIrr: numeric('paid_amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    remainingBalanceIrr: numeric('remaining_balance_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    locationAddressFa: text('location_address_fa').notNull(),
    scheduledDateJalali: text('scheduled_date_jalali').notNull(),
    completedDateJalali: text('completed_date_jalali'),
    status: text('status').notNull().default('PENDING_ASSIGNMENT'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('installation_jobs_code_idx').on(table.jobCode)]
);

// ============================================================================
// STAGE 8: TREASURY, CASH/BANK, CHEQUES, INSTALLMENTS & OPERATIONAL EXPENSES
// ============================================================================

export const cashBoxes = pgTable(
  'cash_boxes',
  {
    id: serial('id').primaryKey(),
    boxCode: text('box_code').notNull(),
    titleFa: text('title_fa').notNull(),
    cashierUserId: integer('cashier_user_id').references(() => users.id),
    balanceIrr: numeric('balance_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('cash_boxes_code_idx').on(table.boxCode)]
);

export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: serial('id').primaryKey(),
    accountCode: text('account_code').notNull(),
    bankNameFa: text('bank_name_fa').notNull(),
    accountNumber: text('account_number').notNull(),
    shabaNumber: text('shaba_number'),
    balanceIrr: numeric('balance_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('bank_accounts_code_idx').on(table.accountCode)]
);

export const cheques = pgTable(
  'cheques',
  {
    id: serial('id').primaryKey(),
    chequeNumber: text('cheque_number').notNull(),
    chequeType: text('cheque_type').notNull().default('INBOUND'), // INBOUND | OUTBOUND
    partyId: integer('party_id').notNull().references(() => parties.id),
    bankNameFa: text('bank_name_fa').notNull(),
    branchNameFa: text('branch_name_fa'),
    amountIrr: numeric('amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    issueDateJalali: text('issue_date_jalali').notNull(),
    dueDateJalali: text('due_date_jalali').notNull(),
    status: text('status').notNull().default('IN_HAND'), // IN_HAND | DEPOSITED | CLEARED | BOUNCED | CANCELLED
    depositBankAccountId: integer('deposit_bank_account_id').references(() => bankAccounts.id),
    clearedDateJalali: text('cleared_date_jalali'),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const treasuryTransactions = pgTable(
  'treasury_transactions',
  {
    id: serial('id').primaryKey(),
    txNumber: text('tx_number').notNull(),
    txType: text('tx_type').notNull(), // RECEIPT | PAYMENT | TRANSFER | EXPENSE | INCOME
    dateJalali: text('date_jalali').notNull(),
    partyId: integer('party_id').references(() => parties.id),
    amountIrr: numeric('amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    paymentMethod: text('payment_method').notNull().default('CASH'), // CASH | BANK_TRANSFER | POS | CHEQUE
    sourceCashBoxId: integer('source_cash_box_id').references(() => cashBoxes.id),
    sourceBankAccountId: integer('source_bank_account_id').references(() => bankAccounts.id),
    targetCashBoxId: integer('target_cash_box_id').references(() => cashBoxes.id),
    targetBankAccountId: integer('target_bank_account_id').references(() => bankAccounts.id),
    chequeId: integer('cheque_id').references(() => cheques.id),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('treasury_transactions_number_idx').on(table.txNumber)]
);

export const installments = pgTable(
  'installments',
  {
    id: serial('id').primaryKey(),
    installmentCode: text('installment_code').notNull(),
    titleFa: text('title_fa').notNull(),
    partyId: integer('party_id').notNull().references(() => parties.id),
    salesInvoiceId: integer('sales_invoice_id').references(() => salesInvoices.id),
    purchaseInvoiceId: integer('purchase_invoice_id').references(() => purchaseInvoices.id),
    installmentNumber: integer('installment_number').notNull(),
    totalInstallments: integer('total_installments').notNull(),
    amountIrr: numeric('amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    dueDateJalali: text('due_date_jalali').notNull(),
    status: text('status').notNull().default('PENDING'), // PENDING | PAID | OVERDUE
    paidDateJalali: text('paid_date_jalali'),
    notesFa: text('notes_fa'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
);

export const operationalExpenses = pgTable(
  'operational_expenses',
  {
    id: serial('id').primaryKey(),
    expenseCode: text('expense_code').notNull(),
    categoryFa: text('category_fa').notNull(),
    titleFa: text('title_fa').notNull(),
    amountIrr: numeric('amount_irr', { precision: 18, scale: 2 }).notNull().default('0'),
    dateJalali: text('date_jalali').notNull(),
    paymentMethod: text('payment_method').notNull().default('CASH'),
    sourceBankOrCash: text('source_bank_or_cash').notNull(),
    notesFa: text('notes_fa'),
    actorUserId: integer('actor_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('operational_expenses_code_idx').on(table.expenseCode)]
);




