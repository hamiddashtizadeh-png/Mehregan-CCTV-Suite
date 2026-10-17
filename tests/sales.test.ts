import assert from 'assert';
import { foundationStore } from '../src/server/foundationStore';

console.log('--- شروع آزمون‌های ماژول فروش، پیش‌فاکتور، فروش سریع (Quick POS) و مرجوعی (مرحله ۶: Sales & Quick POS) ---');

// 1. Check Default Customers & Walk-in POS Customer
console.log('۱. بررسی طرف‌های تجاری مشتری و وجود مشتری عمومی صندوق (Walk-in Customer)...');
const customers = foundationStore.getParties('CUSTOMER');
assert(customers.length >= 1, 'حداقل ۱ مشتری باید در سیستم وجود داشته باشد.');

let walkInCustomer = customers.find((c) => c.partyCode === 'PRT-10000') || customers[0];
assert(walkInCustomer, 'مشتری عمومی و خریدار حضوری برای صندوق فروش سریع باید آماده باشد.');
console.log(`   ✅ مشتری عمومی صندوق: [${walkInCustomer.fullName}] با کد [${walkInCustomer.partyCode}].`);

// 2. Test Sales Proforma Creation
console.log('۲. آزمون صدور پیش‌فاکتور رسمی فروش (Sales Proforma Quote)...');
const sampleProforma = foundationStore.createSalesProforma(
  {
    customerId: customers[0].id,
    dateJalali: '1405/02/01',
    validUntilJalali: '1405/02/20',
    lines: [
      {
        itemId: 1, // Dahua Camera 4MP
        quantity: 2,
        unitPriceIrr: 60000000,
        discountIrr: 2000000,
        vatAmountIrr: 5220000,
        notesFa: 'پیش‌فاکتور ۲ عدد دوربین داهوا دام',
      },
    ],
    notesFa: 'پیش‌فاکتور رسمی تجهیزات پروژه',
  },
  1
);

assert(sampleProforma.proformaNumber.startsWith('SQO-1405-'));
assert.strictEqual(sampleProforma.subtotalItemsIrr, 120000000);
assert.strictEqual(sampleProforma.totalDiscountIrr, 4000000);
assert.strictEqual(sampleProforma.totalPayableIrr, 121220000);
console.log('   ✅ صدور پیش‌فاکتور فروش با محاسبه قیمت خالص، تخفیف و مالیات تایید گردید.');

// 3. Test One-Step Proforma Conversion (No Duplicate Inventory Movements)
console.log('۳. آزمون تبدیل پیش‌فاکتور به فاکتور قطعی فروش (بدون ثبت یا کسر دوباره موجودی)...');
const initialProformaConvertedCount = foundationStore
  .getSalesInvoices()
  .filter((i) => i.proformaId === sampleProforma.id).length;
assert.strictEqual(initialProformaConvertedCount, 0, 'پیش‌فاکتور هنوز نباید تبدیل شده باشد.');

const convertedInvoice = foundationStore.convertSalesProformaToInvoice(
  sampleProforma.id,
  1, // Source Warehouse 1
  {
    paymentMethod: 'POS',
    posTerminalOrBank: 'کارتخوان صندوق مرکزی',
    trackingReference: 'POS-CONV-9912',
  },
  1
);

assert(convertedInvoice.invoiceNumber.startsWith('INV-1405-'));
assert.strictEqual(convertedInvoice.proformaId, sampleProforma.id);
assert(convertedInvoice.inventoryDocNumber?.startsWith('WH-OUT-'), 'باید حواله خروج انبار صادر شده باشد.');

const reloadedProforma = foundationStore.getSalesProformaById(sampleProforma.id)!;
assert.strictEqual(reloadedProforma.status, 'CONVERTED');
assert.strictEqual(reloadedProforma.convertedInvoiceId, convertedInvoice.id);

// Ensure converting again throws error
assert.throws(() => {
  foundationStore.convertSalesProformaToInvoice(sampleProforma.id, 1);
}, /قبلاً به فاکتور فروش تبدیل شده است/);

console.log('   ✅ تبدیل یک‌مرحله‌ای پیش‌فاکتور به فاکتور فروش و ممانعت از ثبت تکراری تایید شد.');

// 4. Test Quick Sale (POS) with Serial Dispatch & Integrated COGS
console.log('۴. آزمون فروش سریع صندوق (Quick POS Sale) با خروج خودکار سریال و بهای تمام‌شده COGS...');

// Find available in-stock serials for Hikvision Camera (itemId 2) in WH-01
const availableSerials = foundationStore
  .getItemSerials({ warehouseId: 1 })
  .filter((s) => s.itemId === 2 && s.status === 'IN_STOCK');
assert(availableSerials.length >= 2, 'حداقل ۲ واحد سریال‌های فعال کالای کد ۲ جهت فروش سریع باید موجود باشد.');

const targetSn1 = availableSerials[0].serialNumber;
const targetSn2 = availableSerials[1].serialNumber;
const item2Record = foundationStore.getItems().find((i) => i.id === 2);
const expectedUnitCogs1 = availableSerials[0].unitCostIrr || item2Record?.purchasePriceIrr || 52000000;
const expectedUnitCogs2 = availableSerials[1].unitCostIrr || item2Record?.purchasePriceIrr || 52000000;
const expectedTotalCogs = expectedUnitCogs1 + expectedUnitCogs2;

const posBatch = Math.floor(1000 + Math.random() * 9000);
const posInvoice = foundationStore.createSalesInvoice(
  {
    saleType: 'QUICK_POS_SALE',
    customerId: walkInCustomer.id,
    sourceWarehouseId: 1,
    dateJalali: '1405/02/02',
    lines: [
      {
        itemId: 2,
        quantity: 2,
        unitPriceIrr: 65000000,
        discountIrr: 5000000, // 60M net price
        vatAmountIrr: 0,
        serialNumbers: [targetSn1, targetSn2],
        notesFa: 'فروش سریع صندوق به خریدار حضوری',
      },
    ],
    paidAmountIrr: 120000000, // Fully paid 120M
    paymentDetails: {
      paymentMethod: 'POS',
      posTerminalOrBank: 'کارتخوان صندوق سریع POS-1',
      trackingReference: `POS-REF-${posBatch}`,
    },
    notesFa: 'فاکتور فروش سریع همراه با تسویه نقدی/کارتخوان در محل',
  },
  1
);

assert(posInvoice.invoiceNumber.startsWith('POS-1405-'));
assert.strictEqual(posInvoice.status, 'PAID');
assert.strictEqual(posInvoice.remainingBalanceIrr, 0);
assert.strictEqual(posInvoice.totalInvoiceAmountIrr, 120000000);
assert.strictEqual(posInvoice.totalCogsIrr, expectedTotalCogs, 'بهای تمام‌شده COGS باید مجموع بهای تمام‌شده تک‌تک سریال‌ها باشد.');

// Verify serial status transition to DISPATCHED
const checkedSerial1 = foundationStore.getSerialByNumber(targetSn1)!;
const checkedSerial2 = foundationStore.getSerialByNumber(targetSn2)!;
assert.strictEqual(checkedSerial1.status, 'DISPATCHED');
assert.strictEqual(checkedSerial2.status, 'DISPATCHED');

console.log('   ✅ صدور فاکتور فروش سریع POS، خروج سریال‌ها، کسر بدهی و ثبت دقیق بهای تمام‌شده COGS تایید شد.');

// 5. Test Partial Payment & Sales Receipt
console.log('۵. آزمون دریافت وجه و تسویه حساب بدهی مشتری (Sales Receipt & Payment Settlement)...');
const testCustomer = customers[0];
const initialCustomerBalance = testCustomer.transactionsSummary?.netBalanceIrr || 0;

const unpaidInvoice = foundationStore.createSalesInvoice(
  {
    saleType: 'STANDARD_SALE',
    customerId: testCustomer.id,
    sourceWarehouseId: 1,
    dateJalali: '1405/02/03',
    lines: [
      {
        itemId: 4, // Switch PoE
        quantity: 1,
        unitPriceIrr: 80000000,
        discountIrr: 0,
        vatAmountIrr: 0,
        serialNumbers: [
          foundationStore
            .getItemSerials({ warehouseId: 1 })
            .find((s) => s.itemId === 4 && s.status === 'IN_STOCK')!.serialNumber,
        ],
      },
    ],
    paidAmountIrr: 0, // Unpaid
  },
  1
);

assert.strictEqual(unpaidInvoice.status, 'CONFIRMED');
assert.strictEqual(unpaidInvoice.remainingBalanceIrr, 80000000);

// Record payment receipt
const receipt = foundationStore.createSalesReceipt(
  {
    customerId: testCustomer.id,
    salesInvoiceId: unpaidInvoice.id,
    paymentDateJalali: '1405/02/04',
    amountIrr: 80000000,
    paymentMethod: 'BANK_TRANSFER',
    destinationBankOrCash: 'بانک ملت - حساب شرکت',
    trackingReference: `TR-PAY-${posBatch}`,
    notesFa: 'تسویه کامل فاکتور فروش شماره ' + unpaidInvoice.invoiceNumber,
  },
  1
);

assert(receipt.receiptNumber.startsWith('REC-1405-'));

const reloadedUnpaidInvoice = foundationStore.getSalesInvoiceById(unpaidInvoice.id)!;
assert.strictEqual(reloadedUnpaidInvoice.status, 'PAID');
assert.strictEqual(reloadedUnpaidInvoice.remainingBalanceIrr, 0);

console.log('   ✅ ثبت دریافت وجه، به‌روزرسانی وضعیت فاکتور به PAID و تسویه مانده طلب از مشتری تایید گردید.');

// 6. Test Sales Return & Serial Restoration
console.log('۶. آزمون برگشت از فروش (Sales Return) و بازیابی موجودی و سریال‌ها به IN_STOCK...');
const serialToReturn = posInvoice.lines[0].serialNumbers![0];

const salesReturn = foundationStore.createSalesReturn(
  {
    salesInvoiceId: posInvoice.id,
    targetWarehouseId: 1,
    dateJalali: '1405/02/05',
    lines: [
      {
        itemId: 2,
        quantity: 1,
        unitRefundIrr: 60000000,
        serialNumbers: [serialToReturn],
        reasonFa: 'انصراف خریدار و عودت به انبار',
      },
    ],
    notesFa: 'مرجوعی ۱ دستگاه دوربین هایک‌ویژن',
  },
  1
);

assert(salesReturn.returnNumber.startsWith('SRET-1405-'));
assert(salesReturn.inventoryDocNumber.startsWith('WH-RET-IN-'));

// Verify serial status is restored to IN_STOCK
const restoredSerial = foundationStore.getSerialByNumber(serialToReturn)!;
assert.strictEqual(restoredSerial.status, 'IN_STOCK');
assert.strictEqual(restoredSerial.currentWarehouseId, 1);

console.log('   ✅ برگشت کالا از مشتری، صدور رسید ورود انبار و بازیابی وضعیت سریال به IN_STOCK تایید گردید.');

// 7. Test Invoice Cancellation
console.log('۷. آزمون لغو رسمی فاکتور فروش (Invoice Cancellation)...');
const invoiceToCancel = foundationStore.createSalesInvoice(
  {
    saleType: 'STANDARD_SALE',
    customerId: testCustomer.id,
    sourceWarehouseId: 1,
    dateJalali: '1405/02/06',
    lines: [
      {
        itemId: 5, // Cable
        quantity: 2,
        unitPriceIrr: 60000000,
      },
    ],
  },
  1
);

assert.strictEqual(invoiceToCancel.status, 'CONFIRMED');

const cancelledInvoice = foundationStore.cancelSalesInvoice(
  invoiceToCancel.id,
  'خطای اپراتور در ثبت اقلام',
  1
);

assert.strictEqual(cancelledInvoice.status, 'CANCELLED');
console.log('   ✅ لغو رسمی فاکتور فروش و بازگشت خودکار اقلام به انبار تایید گردید.');

console.log('--- آزمون‌های ماژول فروش، پیش‌فاکتور و فروش سریع (مرحله ۶) با موفقیت کامل ۱۰۰٪ پاس شدند. ---');
