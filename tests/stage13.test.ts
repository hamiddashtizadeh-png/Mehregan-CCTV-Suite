import { describe, it } from 'node:test';
import assert from 'node:assert';
import { foundationStore } from '../src/server/foundationStore';
import { numberToWordsPersian } from '../src/utils/numberToWords';

describe('مرحله ۱۳: مدیریت هزینه‌ها/درآمدها، فرم ساده سند افتتاحیه، شماره‌گذاری اسناد و تنظیمات تجاری', () => {
  it('۱. آزمون ثبت درآمد عملیاتی متفرقه و تأثیر خودکار در خزانه و لاگ ممیزی', () => {
    const income = foundationStore.createOperationalIncome({
      categoryFa: 'خدمات مشاوره',
      titleFa: 'درآمد مشاوره تخصصی شبکه و دوربین مداربسته',
      amountIrr: 120000000,
      dateJalali: '1405/02/01',
      receiptMethod: 'BANK_TRANSFER',
      targetBankOrCash: 'بانک ملت - حساب جاری اصلی',
      notesFa: 'آزمون ثبت درآمد متفرقه',
    });

    assert.ok(income);
    assert.strictEqual(income.amountIrr, 120000000);
    assert.ok(income.incomeCode.startsWith('INC-1405-'));

    const allIncomes = foundationStore.getOperationalIncomes();
    const found = allIncomes.find((i) => i.id === income.id);
    assert.ok(found);

    // Verify treasury receipt transaction created
    const treasuryTxs = foundationStore.getTreasuryTransactions();
    const receiptTx = treasuryTxs.find((t) => t.notesFa?.includes('درآمد متفرقه'));
    assert.ok(receiptTx);
    assert.strictEqual(receiptTx.amountIrr, 120000000);
  });

  it('۲. آزمون فرم ساده سند افتتاحیه (Simple Wizard) و موازنه خودکار با حساب سرمایه ۳۰۱۰۱', () => {
    const result = foundationStore.importSimpleOpeningBalance({
      dateJalali: '1405/01/01',
      notesFa: 'آزمون سند افتتاحیه فرم ساده',
      bankBalances: [
        { id: 1, titleFa: 'بانک ملت', balanceIrr: 500000000 },
        { id: 2, titleFa: 'بانک سامان', balanceIrr: 300000000 },
      ],
      cashBalances: [{ id: 1, titleFa: 'صندوق مرکزی', balanceIrr: 50000000 }],
      partyBalances: [
        { partyId: 1, partyTitleFa: 'مشتری بدهکار', type: 'DEBTOR', amountIrr: 150000000 },
        { partyId: 2, partyTitleFa: 'تأمین‌کننده بستانکار', type: 'CREDITOR', amountIrr: 200000000 },
      ],
      inventoryBalances: [
        { itemId: 1, itemTitleFa: 'دوربین IP', warehouseId: 1, qty: 10, unitCostIrr: 20000000 },
      ],
    });

    assert.strictEqual(result.ok, true);
    assert.ok(result.document);
    assert.strictEqual(result.document.docNumber, 'DOC-OPENING-101');

    // Total Debit = 500m (Mellat) + 300m (Saman) + 50m (Cash) + 150m (Debtor) + 200m (Stock 10x20m) = 1,200,000,000
    // Total Credit = 200m (Creditor) + 1,000,000,000 (Auto-balanced Capital 30101) = 1,200,000,000
    assert.strictEqual(result.document.totalDebitIrr, 1200000000);
    assert.strictEqual(result.document.totalCreditIrr, 1200000000);
  });

  it('۳. آزمون تولید شماره سند یکتا با پیشوندهای تجاری قابل تنظیم', () => {
    const salesNum = foundationStore.generateNextDocumentNumber('SALES_INVOICE');
    const purNum = foundationStore.generateNextDocumentNumber('PURCHASE_INVOICE');
    const docNum = foundationStore.generateNextDocumentNumber('ACCOUNTING_DOC');

    assert.ok(salesNum.startsWith('INV-1405-'));
    assert.ok(purNum.startsWith('PI-1405-'));
    assert.ok(docNum.startsWith('DOC-1405-'));
  });

  it('۴. آزمون به‌روزرسانی تنظیمات مشخصات فروشگاه و پیشوندهای شماره‌گذاری اسناد', () => {
    const updatedSettings = foundationStore.updateSettings({
      companyName: 'فروشگاه سیستم‌های حفاظتی و نظارت تصویری مهرگان کامل',
      economicCode: '411-9999-0000',
      receiptFooterMessageFa: 'گارانتی ۳۶ ماهه تعویض قطعات مهرگان',
      documentNumbering: {
        salesInvoicePrefix: 'FAKTOR-1405-',
        salesProformaPrefix: 'SQO-1405-',
        purchaseInvoicePrefix: 'PI-1405-',
        purchaseProformaPrefix: 'PO-1405-',
        treasuryReceiptPrefix: 'REC-1405-',
        treasuryPaymentPrefix: 'PAY-1405-',
        accountingDocPrefix: 'SANAD-1405-',
        projectPrefix: 'PRJ-1405-',
        installationPrefix: 'INS-1405-',
        expensePrefix: 'EXP-1405-',
        incomePrefix: 'INC-1405-',
      },
    });

    assert.strictEqual(updatedSettings.companyName, 'فروشگاه سیستم‌های حفاظتی و نظارت تصویری مهرگان کامل');
    assert.strictEqual(updatedSettings.documentNumbering?.salesInvoicePrefix, 'FAKTOR-1405-');

    const nextSalesNum = foundationStore.generateNextDocumentNumber('SALES_INVOICE');
    assert.ok(nextSalesNum.startsWith('FAKTOR-1405-'));
  });

  it('۵. آزمون تبدیل دقیق اعداد ریالی به حروف فارسی برای فاکتورها و قبض‌ها', () => {
    assert.strictEqual(numberToWordsPersian(0), 'صفر');
    assert.strictEqual(numberToWordsPersian(1000), 'یک هزار');
    assert.strictEqual(numberToWordsPersian(45000000), 'چهل و پنج میلیون');
    assert.strictEqual(
      numberToWordsPersian(1250500000),
      'یک میلیارد و دویست و پنجاه میلیون و پانصد هزار'
    );
  });
});
