import assert from 'assert';
import { foundationStore } from '../src/server/foundationStore';

console.log('--- شروع آزمون‌های ماژول اشخاص (مرحله ۳: Parties & Counterparties) ---');

// 1. Test Seed Parties and authoritativeness
console.log('۱. بررسی وجود طرف‌های تجاری پایه و عدم وجود جدول تکراری...');
const initialParties = foundationStore.getParties();
assert(initialParties.length >= 4, 'باید حداقل ۴ طرف تجاری پایه در دیتابیس وجود داشته باشد.');
const customer = initialParties.find((p) => p.primaryType === 'CUSTOMER');
const supplier = initialParties.find((p) => p.primaryType === 'SUPPLIER');
const installer = initialParties.find((p) => p.primaryType === 'INSTALLER');

assert(customer, 'مشتری پایه باید در سیستم موجود باشد.');
assert(supplier, 'تأمین‌کننده پایه باید در سیستم موجود باشد.');
assert(installer, 'نصاب پایه باید در سیستم موجود باشد.');
console.log('   ✅ طرف‌های تجاری پایه با موفقیت بارگذاری شدند.');

// 2. Test Smart Duplicate Detection
console.log('۲. آزمون موتور شناسایی اشخاص تکراری (Duplicate Detection)...');

// 2.1 Test exact National ID duplicate (Blocking)
const dupByNationalId = foundationStore.checkDuplicateParty({
  fullName: 'شخص با کد ملی تکراری',
  nationalId: customer?.nationalId, // Exactly same as Negine Alborz
  mobile: '09199998877',
});
assert.strictEqual(dupByNationalId.hasDuplicate, true, 'باید تکراری تشخیص داده شود.');
assert.strictEqual(dupByNationalId.isBlocking, true, 'تکرار کد ملی باید مسدودکننده (Blocking) باشد.');
console.log('   ✅ مسدودسازی ثبت شخص با کد ملی تکراری تایید شد.');

// 2.2 Test Mobile duplicate (Warning)
const dupByMobile = foundationStore.checkDuplicateParty({
  fullName: 'شخص جدید با شماره تماس مشابه',
  nationalId: '0012345678',
  mobile: customer?.mobile || '09121112233',
});
assert.strictEqual(dupByMobile.hasDuplicate, true, 'باید تکرار شماره موبایل شناسایی شود.');
assert.strictEqual(dupByMobile.isBlocking, false, 'تکرار شماره موبایل غیرمسدودکننده با هشدار است.');
console.log('   ✅ هشدار هوشمند برای شماره همراه مشابه تایید شد.');

// 2.3 Attempting to create with duplicate nationalId should throw error
let threwNationalIdErr = false;
try {
  foundationStore.createParty(
    {
      fullName: 'تست خطای کد ملی',
      mobile: '09351112233',
      nationalId: customer?.nationalId,
    },
    1
  );
} catch (e: any) {
  threwNationalIdErr = true;
  assert(e.message.includes('کد ملی'), 'پیام خطا باید به کد ملی اشاره کند.');
}
assert.strictEqual(threwNationalIdErr, true, 'ثبت با کد ملی تکراری باید با خطا متوقف شود.');
console.log('   ✅ ممانعت از ثبت شخص با شناسه ملی تکراری در لایه Backend تایید شد.');

// 3. Test Creation of a new Party with auto code generation
console.log('۳. آزمون ایجاد شخص جدید و صدور خودکار کد PRT...');
const randomId = Math.floor(1000000 + Math.random() * 9000000);
const newParty = foundationStore.createParty(
  {
    fullName: `فروشگاه الکترونیک ایمن‌سازان پایتخت ${randomId}`,
    companyTitle: 'ایمن‌سازان',
    primaryType: 'CUSTOMER',
    roles: ['CUSTOMER', 'INSTALLER'],
    personType: 'LEGAL',
    nationalId: `1400${randomId}`,
    mobile: `0919${randomId}`,
    province: 'تهران',
    city: 'تهران',
    creditLimitIrr: 5000000000,
    installerSkills: 'نصب دوربین‌های مداربسته تحت شبکه و فیبر نوری',
  },
  1
);

assert(newParty.id > 0, 'شناسه شخص جدید باید معتبر باشد.');
assert(newParty.partyCode.startsWith('PRT-'), 'کد شخص باید با پیشوند PRT- شروع شود.');
assert(newParty.fullName.startsWith('فروشگاه الکترونیک ایمن‌سازان پایتخت'));
console.log(`   ✅ شخص جدید با کد [${newParty.partyCode}] با موفقیت ایجاد گردید.`);

// 4. Test Status Toggle (Active / Inactive)
console.log('۴. آزمون تغییر وضعیت طرف تجاری (فعال/غیرفعال)...');
const toggled = foundationStore.togglePartyStatus(newParty.id, 1);
assert.strictEqual(toggled.status, 'INACTIVE', 'وضعیت باید به INACTIVE تغییر کند.');
const toggledBack = foundationStore.togglePartyStatus(newParty.id, 1);
assert.strictEqual(toggledBack.status, 'ACTIVE', 'وضعیت باید مجدداً به ACTIVE تغییر کند.');
console.log('   ✅ تغییر وضعیت طرف تجاری با موفقیت تایید شد.');

// 5. Test Ledger Integrity: Prevent deletion when transactions exist
console.log('۵. آزمون جامعیت حسابداری و ممانعت از حذف اشخاص دارای گردش مالی...');
// Attach a transaction to newParty
const attachedTx = foundationStore.addPartyTransaction(
  newParty.id,
  {
    recordType: 'SALE_INVOICE',
    referenceNumber: 'INV-TEST-9001',
    titleFa: 'فاکتور فروش تستی دوربین',
    amountIrr: 750000000,
    dateJalali: '1405/01/26',
    status: 'COMPLETED',
  },
  1
);
assert.strictEqual(attachedTx.referenceNumber, 'INV-TEST-9001');

let threwDeleteWithTxErr = false;
try {
  foundationStore.deleteParty(newParty.id, 1);
} catch (e: any) {
  threwDeleteWithTxErr = true;
  assert(e.message.includes('امکان حذف این شخص وجود ندارد'), 'باید خطای ممانعت از حذف صادر شود.');
}
assert.strictEqual(
  threwDeleteWithTxErr,
  true,
  'حذف شخص دارای سند مالی باید به دلیل حفظ جامعیت دیتابیس مسدود گردد.'
);
console.log('   ✅ ممانعت از حذف اشخاص دارای سند مالی تایید شد.');

// 6. Test RBAC Permissions for Parties
console.log('۶. آزمون کنترل دسترسی RBAC برای ماژول اشخاص...');
// Admin (OWNER) has full access
const ownerEval = foundationStore.evaluatePermission(1, 'parties.create');
assert.strictEqual(ownerEval.allowed, true, 'کاربر OWNER باید مجوز parties.create داشته باشد.');

// Accountant has parties.view and parties.edit
const accountantEval = foundationStore.evaluatePermission(2, 'parties.view');
assert.strictEqual(accountantEval.allowed, true, 'سرپرست حسابداری باید به parties.view دسترسی داشته باشد.');

// Auditor has view only, not delete
const auditorDeleteEval = foundationStore.evaluatePermission(3, 'parties.delete');
assert.strictEqual(
  auditorDeleteEval.allowed,
  false,
  'حسابرس نباید به حذف اشخاص (parties.delete) دسترسی داشته باشد.'
);
console.log('   ✅ تفکیک مجوزهای RBAC ماژول اشخاص با موفقیت تایید شد.');

// 7. Verify Audit Log was populated for party operations
console.log('۷. بررسی ثبت رویدادها در جدول تغییرناپذیر Audit Log...');
const auditLogs = foundationStore.getFoundationData().auditLogs;
const partyLogs = auditLogs.filter(
  (l) => l.action.startsWith('PARTY_') || l.targetEntity === 'parties'
);
assert(partyLogs.length > 0, 'باید رویدادهای ماژول اشخاص در Audit Log ثبت شده باشند.');
console.log(`   ✅ تعداد ${partyLogs.length} لاگ امنیتی برای عملیات اشخاص ثبت گردید.`);

console.log('--- تمام آزمون‌های ماژول اشخاص با موفقیت ۱۰۰٪ پاس شدند! ---');
