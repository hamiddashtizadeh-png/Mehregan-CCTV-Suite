import assert from 'assert';
import { foundationStore } from '../src/server/foundationStore';

console.log('--- شروع آزمون‌های ماژول خرید، ارز، بهای تمام‌شده و بدهی تأمین‌کننده (مرحله ۵: Purchases & Landed Cost) ---');

// 1. Check Master Suppliers & Initial Purchase Records
console.log('۱. بررسی بارگذاری تأمین‌کنندگان و اسناد پیش‌فرض خرید...');
let suppliers = foundationStore.getParties('SUPPLIER');
if (suppliers.length < 2) {
  foundationStore.createParty(
    {
      primaryType: 'SUPPLIER',
      fullName: 'شرکت ارتباطات امن پیشرو (تأمین‌کننده تجهیزات شبکه و PoE)',
      mobile: '09128889900',
      province: 'تهران',
      city: 'تهران',
      creditLimitIrr: 20000000000,
    },
    1
  );
  suppliers = foundationStore.getParties('SUPPLIER');
}
assert(suppliers.length >= 2, 'حداقل ۲ تأمین‌کننده فعال باید در سیستم ثبت شده باشد.');

const proformas = foundationStore.getPurchaseProformas();
assert(proformas.length >= 2, 'پیش‌فاکتورهای اولیه خرید باید بارگذاری شده باشند.');

const invoices = foundationStore.getPurchaseInvoices();
assert(invoices.length >= 1, 'فاکتور قطعی خرید اولیه باید ثبت شده باشد.');
const inv1 = invoices.find((i) => i.invoiceNumber === 'PI-1405-1001') || invoices[invoices.length - 1];
assert(inv1, 'فاکتور خرید اولیه باید پیدا شود.');
assert.strictEqual(inv1.invoiceNumber, 'PI-1405-1001');
assert.strictEqual(inv1.currency, 'AED');
assert.strictEqual(inv1.landedCosts.totalLandedCostsIrr, 70000000, 'مجموع هزینه‌های سربار فاکتور ۱ باید ۷۰ میلیون ریال باشد.');
console.log('   ✅ اطلاعات پایه خرید و پیش‌فاکتورهای ارزی با موفقیت بارگذاری شدند.');

// 2. Test Authoritative Landed Cost Allocation Engine Formula
console.log('۲. آزمون موتور تخصیص هزینه‌های سربار (Landed Cost Engine - BY_VALUE vs BY_QUANTITY)...');
const sampleCalculationByValue = foundationStore.calculateLandedCostAllocation({
  currency: 'USD',
  exchangeRateToIrr: 900000, // 900,000 IRR / USD
  costAllocationMethod: 'BY_VALUE',
  landedCosts: {
    freightCostIrr: 20000000,
    insuranceCostIrr: 5000000,
    packagingCostIrr: 3000000,
    customsCostIrr: 50000000,
    nonRefundableTaxIrr: 22000000,
    otherLandedCostIrr: 0,
    totalLandedCostsIrr: 100000000, // 100M IRR Total Landed Costs
  },
  lines: [
    {
      itemId: 1, // Dahua Camera
      quantity: 10,
      unitPriceForeign: 50, // 50 USD = 45,000,000 IRR. Total Line = 450,000,000 IRR (45%)
      discountIrr: 0,
      vatAmountIrr: 0,
    },
    {
      itemId: 3, // NVR 16ch
      quantity: 5,
      unitPriceForeign: 120, // 120 USD = 108,000,000 IRR. Total Line = 540,000,000 IRR (55%)
      discountIrr: 0,
      vatAmountIrr: 0,
    },
  ],
});

assert.strictEqual(sampleCalculationByValue.subtotalNetItemsIrr, 990000000, 'مجموع پایه خرید ریالی باید ۹۹۰ میلیون ریال باشد.');
assert(
  Math.abs(sampleCalculationByValue.totalInventoryValuationIrr - 1090000000) <= 10,
  'ارزش کل ورود به انبار باید برابر با مجموع خرید + ۱۰۰ میلیون سربار باشد (با رواداری گردکردن ریالی).'
);

// Verify exact line allocations BY_VALUE
const line1Allocated = sampleCalculationByValue.lines[0];
const line2Allocated = sampleCalculationByValue.lines[1];
// Line 1 Share = 450M / 990M = 45.4545% -> 45,454,545 IRR extra / 10 = ~4,545,455 IRR per unit
assert(line1Allocated.allocatedLandedCostPerUnitIrr > 4500000, 'سهم سربار هر واحد دوربین بر اساس ارزش ریالی باید محاسبه شود.');
assert.strictEqual(
  line1Allocated.finalLandedCostPerUnitIrr,
  45000000 + line1Allocated.allocatedLandedCostPerUnitIrr,
  'بهای تمام‌شده نهایی واحد = بهای پایه + سهم سربار'
);
console.log('   ✅ فرمول تخصیص هزینه‌های حمل، بیمه، گمرک و مالیات بر اساس ارزش ریالی تایید شد.');

// 3. Test Creation of Purchase Proforma
console.log('۳. آزمون ثبت پیش‌فاکتور جدید خرید (Purchase Proforma)...');
const supplier1 = suppliers[0]; // بازرگانی پارس پویا
const newProforma = foundationStore.createPurchaseProforma(
  {
    supplierId: supplier1.id,
    dateJalali: '1405/01/25',
    validUntilJalali: '1405/02/15',
    currency: 'USD',
    exchangeRateToIrr: 920000,
    lines: [
      {
        itemId: 2, // Hikvision ColorVu
        quantity: 10,
        unitPriceForeign: 60, // 60 * 920,000 = 55,200,000 IRR
        notesFa: 'پیش‌فاکتور تستی ۱۰ عدد دوربین هایک‌ویژن',
      },
    ],
    notesFa: 'پیش‌فاکتور خرید ارزی دلار',
  },
  1
);

assert(newProforma.proformaNumber.startsWith('PO-1405-'));
assert.strictEqual(newProforma.subtotalIrr, 552000000, 'مجموع ریالی پیش‌فاکتور باید ۵۵۲ میلیون ریال باشد.');
console.log('   ✅ ثبت پیش‌فاکتور خرید ارزی با موفقیت تایید شد.');

// 4. Test Purchase Invoice Creation (Transactional Warehouse Receipt & Serial Landed Cost Tagging)
console.log('۴. آزمون ثبت فاکتور قطعی خرید (صدور خودکار رسید انبار و درج بهای تمام‌شده روی سریال‌ها)...');
const testBatch = Math.floor(1000 + Math.random() * 9000);
const snA = `SN-PURCH-TEST-${testBatch}-01`;
const snB = `SN-PURCH-TEST-${testBatch}-02`;

const initialSupplierBalance = supplier1.transactionsSummary?.netBalanceIrr || 0;
const initialWh1Stock = foundationStore.getItemStockInWarehouse(2, 1); // ITM-10002 in WH-01

const newInvoice = foundationStore.createPurchaseInvoice(
  {
    supplierInvoiceNumber: `PARS-INV-${testBatch}`,
    supplierId: supplier1.id,
    targetWarehouseId: 1, // انبار مرکزی
    dateJalali: '1405/01/26',
    dueDateJalali: '1405/02/26',
    currency: 'IRR',
    exchangeRateToIrr: 1,
    costAllocationMethod: 'BY_QUANTITY',
    landedCosts: {
      freightCostIrr: 4000000,
      customsCostIrr: 6000000, // Total Landed = 10,000,000 IRR for 2 units -> 5,000,000 IRR per unit
    },
    lines: [
      {
        itemId: 2, // Hikvision ColorVu (isSerialized: true)
        quantity: 2,
        unitPriceForeign: 50000000, // 50M IRR base
        discountIrr: 0,
        vatAmountIrr: 0,
        serialNumbers: [snA, snB],
        macAddresses: ['50:B7:C3:01:01:01', '50:B7:C3:01:01:02'],
        notesFa: 'ورود ۲ عدد دوربین کالرویو با ۵ میلیون ریال هزینه سربار برای هر واحد',
      },
    ],
    notesFa: 'فاکتور خرید تستی با صدور همزمان رسید انبار',
  },
  1
);

assert(newInvoice.invoiceNumber.startsWith('PI-1405-'));
assert(newInvoice.inventoryDocNumber?.startsWith('WH-IN-'), 'باید رسید انبار ورود به صورت خودکار صادر شده باشد.');
assert.strictEqual(newInvoice.totalInvoicePayableToSupplierIrr, 100000000, 'مبلغ بدهی به تامین‌کننده باید ۱۰۰ میلیون ریال باشد.');
assert.strictEqual(newInvoice.totalInventoryValuationIrr, 110000000, 'ارزش کالا در انبار با اضافه شدن سربار باید ۱۱۰ میلیون ریال باشد.');

// Check Warehouse Stock Increase
const newWh1Stock = foundationStore.getItemStockInWarehouse(2, 1);
assert.strictEqual(newWh1Stock, initialWh1Stock + 2, 'موجودی انبار مرکزی باید دقیقا ۲ واحد افزایش یافته باشد.');

// Check Serial Record Landed Cost Tagging
const serialA = foundationStore.getSerialByNumber(snA)!;
assert(serialA, 'سریال جدید باید در سیستم ثبت شده باشد.');
assert.strictEqual(serialA.status, 'IN_STOCK');
assert.strictEqual(serialA.currentWarehouseId, 1);
assert.strictEqual(serialA.unitCostIrr, 55000000, 'بهای تمام‌شده اختصاصی واحد سریال باید ۵۵ میلیون ریال (۵۰M پایه + ۵M سربار) باشد.');
assert.strictEqual(serialA.purchaseInvoiceId, newInvoice.id);

// Check Supplier Debt Increase in Parties
const updatedSupplier = foundationStore.getParties().find((p) => p.id === supplier1.id)!;
const updatedSupplierBalance = updatedSupplier.transactionsSummary?.netBalanceIrr || 0;
assert.strictEqual(
  updatedSupplierBalance,
  initialSupplierBalance + 100000000,
  'بدهی به تأمین‌کننده (بستانکاری وی) باید دقیقا ۱۰۰ میلیون ریال افزایش یافته باشد.'
);
console.log('   ✅ صدور خودکار رسید انبار، درج بهای تمام‌شده واحد روی سریال‌ها و افزایش بدهی تأمین‌کننده تایید گردید.');

// 5. Test Payment Settlement & Supplier Debt Reduction
console.log('۵. آزمون ثبت پرداخت وجه و تسویه بدهی تأمین‌کننده (Payment & Debt Settlement)...');
const newPayment = foundationStore.createPurchasePayment(
  {
    supplierId: supplier1.id,
    purchaseInvoiceId: newInvoice.id,
    paymentDateJalali: '1405/01/27',
    amountIrr: 60000000, // Partial payment 60M IRR out of 100M IRR
    paymentMethod: 'SATNA_PAYA',
    sourceAccountOrBank: 'بانک ملت - حساب شرکت',
    trackingReference: `PAYA-TEST-${testBatch}`,
    notesFa: 'پرداخت ۶۰ میلیون ریال بابت فاکتور خرید تستی',
  },
  1
);

assert(newPayment.paymentNumber.startsWith('PAY-1405-'));

// Verify Invoice Remaining Debt
const reloadedInvoice = foundationStore.getPurchaseInvoiceById(newInvoice.id)!;
assert.strictEqual(reloadedInvoice.paidAmountIrr, 60000000);
assert.strictEqual(reloadedInvoice.remainingDebtIrr, 40000000, 'مانده بدهی فاکتور باید ۴۰ میلیون ریال باقی مانده باشد.');
assert.strictEqual(reloadedInvoice.status, 'PARTIALLY_PAID');

// Verify Supplier Balance in Parties
const supplierAfterPayment = foundationStore.getParties().find((p) => p.id === supplier1.id)!;
assert.strictEqual(
  supplierAfterPayment.transactionsSummary?.netBalanceIrr,
  updatedSupplierBalance - 60000000,
  'مانده بدهی به تأمین‌کننده پس از پرداخت باید ۶۰ میلیون ریال کاهش یابد.'
);
console.log('   ✅ کسر مانده بدهی فاکتور و مانده کل حساب بستانکاری تأمین‌کننده با موفقیت تایید شد.');

// 6. Test Purchase Return (OUTBOUND_RETURN)
console.log('۶. آزمون برگشت از خرید به تأمین‌کننده (Purchase Return)...');
const purchaseReturn = foundationStore.createPurchaseReturn(
  {
    purchaseInvoiceId: newInvoice.id,
    sourceWarehouseId: 1,
    dateJalali: '1405/01/28',
    lines: [
      {
        itemId: 2,
        quantity: 1,
        unitCreditIrr: 50000000, // Return credit 50M
        serialNumbers: [snB],
        reasonFa: 'نقص فنی در لنز و مرجوعی به تامین‌کننده',
      },
    ],
    notesFa: 'برگشت ۱ دستگاه دوربین مرجوعی',
  },
  1
);

assert(purchaseReturn.returnNumber.startsWith('PRET-1405-'));
assert(purchaseReturn.inventoryDocNumber.startsWith('WH-RET-OUT-'));

// Check Serial Status Update to RETURNED_TO_SUPPLIER
const returnedSerialB = foundationStore.getSerialByNumber(snB)!;
assert.strictEqual(returnedSerialB.status, 'RETURNED_TO_SUPPLIER', 'وضعیت سریال مرجوع‌شده باید RETURNED_TO_SUPPLIER شود.');

// Check Stock Decrease in WH-01
const stockWh1AfterReturn = foundationStore.getItemStockInWarehouse(2, 1);
assert.strictEqual(stockWh1AfterReturn, newWh1Stock - 1, 'موجودی انبار مرکزی پس از برگشت از خرید باید ۱ واحد کسر شده باشد.');

console.log('   ✅ برگشت کالا به تأمین‌کننده، کسر موجودی انبار و تغییر وضعیت سریال به RETURNED_TO_SUPPLIER تایید گردید.');

console.log('--- آزمون‌های ماژول خرید، بهای تمام‌شده و بدهی تأمین‌کنندگان (مرحله ۵) با موفقیت کامل ۱۰۰٪ پاس شدند. ---');
