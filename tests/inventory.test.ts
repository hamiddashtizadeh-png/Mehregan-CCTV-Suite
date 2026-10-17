import assert from 'assert';
import { foundationStore } from '../src/server/foundationStore';

console.log('--- شروع آزمون‌های ماژول کالاها، انبار، سریال/MAC و کاردکس (مرحله ۴: Inventory & Kardex) ---');

// 1. Check Master Catalog Seeding
console.log('۱. بررسی داده‌های پایه کاتالوگ (دسته‌بندی، برند، واحد، انبار و کالاها)...');
const categories = foundationStore.getItemCategories();
const brands = foundationStore.getItemBrands();
const units = foundationStore.getItemUnits();
const warehouses = foundationStore.getWarehouses();
const items = foundationStore.getItems();

assert(categories.length >= 6, 'حداقل ۶ دسته‌بندی تخصصی باید در سیستم موجود باشد.');
assert(brands.length >= 6, 'حداقل ۶ برند معتبر تجهیزات نظارتی باید ثبت شده باشد.');
assert(units.length >= 5, 'واحدهای سنجش عدد، دستگاه، متر، حلقه و کارتن باید تعریف شده باشند.');
assert(warehouses.length >= 3, 'انبار مرکزی، انبار گارانتی و انبار پروژه‌ها باید در سیستم وجود داشته باشند.');
assert(items.length >= 6, 'حداقل ۶ کالای نمونه دوربین و NVR و تجهیزات شبکه باید ثبت شده باشند.');

console.log('   ✅ اطلاعات پایه کاتالوگ و انبارها با موفقیت بارگذاری شدند.');

// 2. Test Dynamic Authoritative Live Stock Calculation (Zero Mock)
console.log('۲. آزمون محاسبه موجودی زنده بر اساس اسناد قطعی (Authoritative Dynamic Stock)...');
const item1 = items.find((i) => i.itemCode === 'ITM-10001'); // Dahua IPC-HDW2431T
assert(item1, 'کالای ITM-10001 باید در سیستم وجود داشته باشد.');

// Document History for ITM-10001:
// - WH-IN-1405-1001: Inbound 5 units in WH-01
// - WH-TRF-1405-1001: Transfer 2 units from WH-01 to WH-03
// - WH-OUT-1405-1001: Outbound sale 1 unit from WH-03 to customer
// Expected Stock: WH-01 = 3, WH-03 = 1, WH-02 = 0, Total = 4
const item1Stock = foundationStore.getItemStock(item1.id);
assert.strictEqual(item1Stock.warehouseStocks[1], 3, 'موجودی انبار مرکزی برای ITM-10001 باید دقیقاً ۳ عدد باشد.');
assert.strictEqual(item1Stock.warehouseStocks[3], 1, 'موجودی انبار پروژه‌ها برای ITM-10001 باید دقیقاً ۱ عدد باشد.');
assert.strictEqual(item1Stock.totalStock, 4, 'موجودی کل شرکت برای ITM-10001 باید دقیقاً ۴ عدد باشد.');
console.log('   ✅ محاسبه دقیق موجودی واقعی کالا در انبارها تایید شد (بدون Mock یا عدد ثابت).');

// 3. Test Physical Unit Serial & MAC Tracking
console.log('۳. آزمون رهگیری وضعیت و موقعیت فیزیکی شماره‌های سریال و MAC آدرس...');
const serialDispatched = foundationStore.getSerialByNumber('SN-DH-261011');
assert(serialDispatched, 'سریال SN-DH-261011 باید در سیستم ثبت شده باشد.');
assert.strictEqual(serialDispatched.status, 'DISPATCHED', 'وضعیت سریال تحویل‌شده باید DISPATCHED باشد.');
assert.strictEqual(serialDispatched.lastDocNumber, 'WH-OUT-1405-1001');

const serialInWh3 = foundationStore.getSerialByNumber('SN-DH-261012');
assert(serialInWh3, 'سریال SN-DH-261012 باید موجود باشد.');
assert.strictEqual(serialInWh3.status, 'IN_STOCK');
assert.strictEqual(serialInWh3.currentWarehouseId, 3, 'سریال انتقال‌یافته باید در انبار پروژه‌ها (WH-03) قرار داشته باشد.');

const serialInWh1 = foundationStore.getSerialByNumber('SN-DH-261013');
assert(serialInWh1, 'سریال SN-DH-261013 باید موجود باشد.');
assert.strictEqual(serialInWh1.status, 'IN_STOCK');
assert.strictEqual(serialInWh1.currentWarehouseId, 1, 'سریال باید در انبار مرکزی (WH-01) باشد.');
console.log('   ✅ ردیابی محل و وضعیت تک‌تک واحدهای سریال‌دار و MAC آدرس تایید شد.');

// 4. Test Inbound Purchase Receipt with New Serials
console.log('۴. آزمون ثبت سند رسید خرید (INBOUND_PURCHASE) و صدور سریال‌های جدید...');
const item2 = items.find((i) => i.itemCode === 'ITM-10002')!; // Hikvision ColorVu
const initialStockItem2Wh1 = foundationStore.getItemStockInWarehouse(item2.id, 1);
const testBatch = Math.floor(1000 + Math.random() * 9000);
const sn1 = `SN-HK-TEST-${testBatch}-01`;
const sn2 = `SN-HK-TEST-${testBatch}-02`;
const sn3 = `SN-HK-TEST-${testBatch}-03`;

const inboundDoc = foundationStore.createInventoryDocument(
  {
    docType: 'INBOUND_PURCHASE',
    dateJalali: '1405/01/26',
    targetWarehouseId: 1, // انبار مرکزی
    partyId: 2, // بازرگانی پارس پویا
    lines: [
      {
        itemId: item2.id,
        quantity: 3,
        unitCostIrr: 52000000,
        serialNumbers: [sn1, sn2, sn3],
        macAddresses: ['44:A8:42:01:01:01', '44:A8:42:01:01:02', '44:A8:42:01:01:03'],
        notesFa: 'ورود ۳ عدد دوربین کالرویو تستی',
      },
    ],
    notesFa: 'رسید انبار محموله تکمیلی برای تست',
  },
  1
);

assert(inboundDoc.docNumber.startsWith('WH-IN-'), 'شماره سند ورود باید با پیشوند WH-IN- آغاز شود.');
const newStockItem2Wh1 = foundationStore.getItemStockInWarehouse(item2.id, 1);
assert.strictEqual(newStockItem2Wh1, initialStockItem2Wh1 + 3, 'موجودی انبار ۱ باید دقیقاً ۳ واحد افزایش یافته باشد.');

const testSerial1 = foundationStore.getSerialByNumber(sn1);
assert(testSerial1, 'سریال جدید باید بلافاصله ثبت شده باشد.');
assert.strictEqual(testSerial1.status, 'IN_STOCK');
assert.strictEqual(testSerial1.currentWarehouseId, 1);
assert.strictEqual(testSerial1.macAddress, '44:A8:42:01:01:01');
console.log('   ✅ ثبت رسید خرید و تولید واحدهای سریال‌دار در انبار مقصد با موفقیت تایید شد.');

// 5. Test Inter-Warehouse Transfer
console.log('۵. آزمون سند انتقال بین انبارها (TRANSFER) و تغییر موقعیت فیزیکی واحدها...');
const initialStockItem2Wh2 = foundationStore.getItemStockInWarehouse(item2.id, 2);
const transferDoc = foundationStore.createInventoryDocument(
  {
    docType: 'TRANSFER',
    dateJalali: '1405/01/27',
    sourceWarehouseId: 1, // انبار مرکزی
    targetWarehouseId: 2, // انبار گارانتی و خدمات
    lines: [
      {
        itemId: item2.id,
        quantity: 2,
        serialNumbers: [sn1, sn2],
        notesFa: 'انتقال جهت دپوی انبار خدمات',
      },
    ],
    notesFa: 'برگه انتقال بین انبار ۱ و ۲',
  },
  1
);

assert(transferDoc.docNumber.startsWith('WH-TRF-'));
const stockWh1AfterTransfer = foundationStore.getItemStockInWarehouse(item2.id, 1);
const stockWh2AfterTransfer = foundationStore.getItemStockInWarehouse(item2.id, 2);
assert.strictEqual(stockWh1AfterTransfer, newStockItem2Wh1 - 2, 'موجودی انبار مبدا باید ۲ واحد کسر شده باشد.');
assert.strictEqual(stockWh2AfterTransfer, initialStockItem2Wh2 + 2, 'موجودی انبار مقصد باید ۲ واحد افزایش یافته باشد.');

// Check serial location update
const transferredSerial = foundationStore.getSerialByNumber(sn1)!;
assert.strictEqual(transferredSerial.currentWarehouseId, 2, 'محل فیزیکی سریال باید به انبار ۲ تغییر یافته باشد.');
assert.strictEqual(transferredSerial.status, 'IN_STOCK');
console.log('   ✅ انتقال بین انبارها و به‌روزرسانی محل استقرار سریال‌ها با موفقیت تایید شد.');

// 6. Test Negative Inventory Prevention (Strict Blocking)
console.log('۶. آزمون مسدودسازی هوشمند موجودی منفی (Negative Inventory Prevention)...');
// Attempting to dispatch more units than available in WH-02 must fail!
let negativeStockBlocked = false;
try {
  foundationStore.createInventoryDocument(
    {
      docType: 'OUTBOUND_SALE',
      dateJalali: '1405/01/28',
      sourceWarehouseId: 2,
      partyId: 1,
      lines: [
        {
          itemId: item2.id,
          quantity: stockWh2AfterTransfer + 5, // Exceeds available stock!
          serialNumbers: Array.from({ length: stockWh2AfterTransfer + 5 }, (_, i) => `SN-FAKE-${i}`),
        },
      ],
    },
    2 // Accountant user (without negative inventory override)
  );
} catch (e: any) {
  negativeStockBlocked = true;
  assert(e.message.includes('کافی نیست') || e.message.includes('موجودی منفی'), 'پیام خطا باید به کمبود موجودی اشاره کند.');
}
assert.strictEqual(negativeStockBlocked, true, 'عملیات خروج با موجودی ناکافی باید مسدود شود.');
console.log('   ✅ ممانعت از ایجاد موجودی منفی طبق تنظیمات سیستم با موفقیت تایید شد.');

// 7. Test Outbound Sale Dispatch
console.log('۷. آزمون حواله خروج فروش (OUTBOUND_SALE) و خروج سریال از انبار...');
const outboundDoc = foundationStore.createInventoryDocument(
  {
    docType: 'OUTBOUND_SALE',
    dateJalali: '1405/01/28',
    sourceWarehouseId: 2,
    partyId: 1,
    lines: [
      {
        itemId: item2.id,
        quantity: 1,
        serialNumbers: [sn1],
        notesFa: 'فروش به مشتری',
      },
    ],
  },
  1
);

assert(outboundDoc.docNumber.startsWith('WH-OUT-'));
const stockWh2AfterSale = foundationStore.getItemStockInWarehouse(item2.id, 2);
assert.strictEqual(stockWh2AfterSale, stockWh2AfterTransfer - 1, 'موجودی انبار ۲ باید پس از فروش ۱ واحد کمتر شود.');

const soldSerial = foundationStore.getSerialByNumber(sn1)!;
assert.strictEqual(soldSerial.status, 'DISPATCHED', 'وضعیت سریال فروخته شده باید به DISPATCHED تغییر کند.');
assert.strictEqual(soldSerial.lastPartyId, 1);
console.log('   ✅ خروج کالا و ثبت وضعیت تحویل سریال با موفقیت تایید شد.');

// 8. Test Inbound Return (مرجوعی کالا به انبار)
console.log('۸. آزمون مرجوعی کالا از مشتری به انبار (INBOUND_RETURN)...');
const returnDoc = foundationStore.createInventoryDocument(
  {
    docType: 'INBOUND_RETURN',
    dateJalali: '1405/01/29',
    targetWarehouseId: 2,
    partyId: 1,
    lines: [
      {
        itemId: item2.id,
        quantity: 1,
        serialNumbers: [sn1],
        notesFa: 'مرجوعی دوربین به انبار خدمات',
      },
    ],
  },
  1
);

assert(returnDoc.docNumber.startsWith('WH-RET-IN-'));
const stockWh2AfterReturn = foundationStore.getItemStockInWarehouse(item2.id, 2);
assert.strictEqual(stockWh2AfterReturn, stockWh2AfterSale + 1, 'موجودی انبار ۲ پس از مرجوعی باید مجدداً ۱ واحد افزایش یابد.');

const returnedSerial = foundationStore.getSerialByNumber(sn1)!;
assert.strictEqual(returnedSerial.status, 'IN_STOCK', 'سریال مرجوع‌شده باید مجدداً فعال و IN_STOCK شود.');
console.log('   ✅ برگشت کالا به انبار و بازیابی وضعیت سریال با موفقیت تایید شد.');

// 9. Comprehensive Mathematical Kardex Audit & Verification
console.log('۹. آزمون جامع سازگاری ریاضی کاردکس (Kardex Running Balance Audit)...');
const kardexGlobal = foundationStore.getItemKardex(item2.id);
assert(kardexGlobal.length >= 4, 'حداقل ۴ ردیف گردش برای کالای آزمایشی باید ثبت شده باشد.');

// Audit chronological balance flow:
// Balance[i] MUST strictly equal Balance[i-1] + QtyIn[i] - QtyOut[i]
let auditedBalance = 0;
for (const entry of kardexGlobal) {
  auditedBalance = auditedBalance + entry.qtyIn - entry.qtyOut;
  assert.strictEqual(
    entry.runningBalance,
    auditedBalance,
    `تراز کاردکس در سند ${entry.docNumber} با فرمول گردش همخوانی ندارد.`
  );
}

// Global stock of item2 MUST equal the final runningBalance in Kardex!
const finalStockItem2 = foundationStore.getItemStock(item2.id).totalStock;
const lastKardexBalance = kardexGlobal[kardexGlobal.length - 1].runningBalance;
assert.strictEqual(
  finalStockItem2,
  lastKardexBalance,
  'موجودی کل انبارداری باید دقیقاً برابر با آخرین تراز لحظه‌ای کاردکس باشد.'
);

// Also audit Warehouse 2 specific Kardex
const kardexWh2 = foundationStore.getItemKardex(item2.id, 2);
let wh2AuditedBalance = 0;
for (const entry of kardexWh2) {
  wh2AuditedBalance = wh2AuditedBalance + entry.qtyIn - entry.qtyOut;
  assert.strictEqual(entry.runningBalance, wh2AuditedBalance);
}
assert.strictEqual(
  foundationStore.getItemStockInWarehouse(item2.id, 2),
  wh2AuditedBalance,
  'موجودی انبار ۲ باید دقیقاً با کاردکس اختصاصی انبار ۲ منطبق باشد.'
);

console.log(`   ✅ تراز کاردکس ۱۰۰٪ منطبق با موجودی محاسباتی است: [موجودی: ${finalStockItem2} = تراز کاردکس: ${lastKardexBalance}].`);

console.log('--- آزمون‌های ماژول کالاها، انبارداری و کاردکس (مرحله ۴) با موفقیت کامل ۱۰۰٪ پاس شدند. ---');
