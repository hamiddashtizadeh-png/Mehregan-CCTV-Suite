import test from 'node:test';
import assert from 'node:assert/strict';
import { foundationStore } from '../src/server/foundationStore';

test('ماژول حسابداری دوطرفه، کدینگ حساب‌ها، اسناد دوبل، دفاتر مالی و تراز آزمایشی (مرحله ۹)', async (t) => {
  await t.test('۱. بررسی ساختار درختواره سرفصل‌های پیش‌فرض حساب‌ها (گروه، کل و معین)', () => {
    const chart = foundationStore.getAccountsChart();
    assert.ok(chart.length >= 20, 'کدینگ حساب‌ها باید شامل حداقل ۲۰ سرفصل اولیه استاندارد باشد.');

    const groups = chart.filter((a) => a.level === 'GROUP');
    assert.ok(groups.length >= 5, 'گروه‌های اصلی دارایی‌ها، بدهی‌ها، حقوق صاحبان سهام، درآمدها و هزینه‌ها باید وجود داشته باشند.');

    const cashAcc = chart.find((a) => a.code === '10101');
    assert.ok(cashAcc, 'حساب معین صندوق باید در سرفصل‌ها موجود باشد.');
    assert.equal(cashAcc?.nature, 'DEBIT', 'ماهیت حساب صندوق باید بدهکار باشد.');

    const salesAcc = chart.find((a) => a.code === '60101');
    assert.ok(salesAcc, 'حساب معین درآمد فروش باید در سرفصل‌ها موجود باشد.');
    assert.equal(salesAcc?.nature, 'CREDIT', 'ماهیت حساب فروش باید بستانکار باشد.');
  });

  await t.test('۲. آزمون تعریف سرفصل معین جدید با کنترل یکتایی کد حساب', () => {
    const newAcc = foundationStore.createAccount({
      code: '10104',
      titleFa: 'صندوق ارزی و تنخواه اختصاصی',
      level: 'SUBSIDIARY',
      parentCode: '101',
      nature: 'DEBIT',
      groupCode: '1',
      groupTitleFa: 'دارایی‌های جاری',
    }, 1);

    assert.equal(newAcc.code, '10104');
    assert.equal(newAcc.titleFa, 'صندوق ارزی و تنخواه اختصاصی');

    // جلوگیری از ثبت کد تکراری
    assert.throws(
      () => {
        foundationStore.createAccount({
          code: '10104',
          titleFa: 'حساب تکراری غیرمجاز',
          level: 'SUBSIDIARY',
          parentCode: '101',
          nature: 'DEBIT',
          groupCode: '1',
          groupTitleFa: 'دارایی‌های جاری',
        }, 1);
      },
      /قبلاً در سیستم ثبت شده است/,
      'باید از تعریف کد حساب تکراری جلوگیری کند.'
    );
  });

  await t.test('۳. آزمون ثبت سند حسابداری دستی و اعتبارسنجی تراز بدهکار و بستانکار (کنترل دوبل)', () => {
    // سند نامتراز باید رد شود
    assert.throws(
      () => {
        foundationStore.createAccountingDocument({
          referenceNumber: 'REF-ERR-001',
          dateJalali: '1405/01/20',
          docType: 'MANUAL',
          descriptionFa: 'سند تست نامتراز',
          lines: [
            {
              accountCode: '10101',
              accountTitleFa: 'صندوق اصلی',
              debitIrr: 10000000,
              creditIrr: 0,
              descriptionFa: 'ردیف ۱',
            },
            {
              accountCode: '10301',
              accountTitleFa: 'بدهکاران تجاری',
              debitIrr: 0,
              creditIrr: 9000000, // ۱ میلیون ریال اختلاف تراز
              descriptionFa: 'ردیف ۲',
            },
          ],
        }, 1);
      },
      /سند حسابداری تراز نیست/,
      'سند حسابداری با بدهکار و بستانکار نابرابر باید بلافاصله رد شود.'
    );

    // سند متراز باید با موفقیت ثبت شود
    const validDoc = foundationStore.createAccountingDocument({
      referenceNumber: 'REF-TEST-002',
      dateJalali: '1405/01/20',
      docType: 'MANUAL',
      descriptionFa: 'سند تسویه حساب دستی مشتری',
      lines: [
        {
          accountCode: '10101',
          accountTitleFa: 'صندوق اصلی',
          debitIrr: 50000000,
          creditIrr: 0,
          descriptionFa: 'دریافت نقدی',
        },
        {
          accountCode: '10301',
          accountTitleFa: 'بدهکاران تجاری - خریداران حقیقی و پروژه‌ای',
          debitIrr: 0,
          creditIrr: 50000000,
          descriptionFa: 'کاهش طلب از مشتری',
        },
      ],
    }, 1);

    assert.ok(validDoc.docNumber.startsWith('DOC-1405-'));
    assert.equal(validDoc.totalDebitIrr, 50000000);
    assert.equal(validDoc.totalCreditIrr, 50000000);
    assert.equal(validDoc.status, 'APPROVED');
  });

  await t.test('۴. آزمون تولید خودکار سند حسابداری از فاکتور فروش و بررسی عدم ثبت تکراری (Idempotency)', () => {
    const invoices = foundationStore.getSalesInvoices();
    assert.ok(invoices.length > 0, 'فاکتور فروش برای تست باید موجود باشد.');
    const invoice = invoices[0];

    const autoDoc = foundationStore.generateAccountingDocFromSalesInvoice(invoice.id, 1);
    assert.ok(autoDoc, 'سند حسابداری اتوماتیک باید تولید شود.');
    assert.equal(autoDoc.docType, 'AUTO');
    assert.equal(autoDoc.sourceDocType, 'SALES_INVOICE');
    assert.equal(autoDoc.totalDebitIrr, autoDoc.totalCreditIrr, 'سند اتوماتیک فروش باید کاملاً تراز باشد.');

    // فراخوانی مجدد نباید سند تکراری تولید کند
    const duplicateCheck = foundationStore.generateAccountingDocFromSalesInvoice(invoice.id, 1);
    assert.equal(duplicateCheck.id, autoDoc.id, 'فراخوانی مجدد باید همان سند قبلی را برگرداند و سند تکراری تولید نکند.');
  });

  await t.test('۵. آزمون تولید خودکار سند از هزینه عملیاتی و خدمات نصب', () => {
    const expenses = foundationStore.getOperationalExpenses();
    assert.ok(expenses.length > 0, 'هزینه عملیاتی باید در دیتابیس وجود داشته باشد.');
    const exp = expenses[0];

    const expDoc = foundationStore.generateAccountingDocFromExpense(exp.id, 1);
    assert.ok(expDoc, 'سند هزینه عملیاتی باید با موفقیت تولید شود.');
    assert.equal(expDoc.totalDebitIrr, expDoc.totalCreditIrr);
    assert.equal(expDoc.sourceDocType, 'OPERATIONAL_EXPENSE');

    const jobs = foundationStore.getInstallationJobs();
    assert.ok(jobs.length > 0, 'پرونده نصب باید وجود داشته باشد.');
    const job = jobs[0];

    const jobDoc = foundationStore.generateAccountingDocFromInstallationJob(job.id, 1);
    assert.ok(jobDoc, 'سند خدمات نصب باید با موفقیت تولید شود.');
    assert.equal(jobDoc.totalDebitIrr, jobDoc.totalCreditIrr);
    assert.equal(jobDoc.sourceDocType, 'INSTALLATION_JOB');
  });

  await t.test('۶. آزمون قفل سند دائمی (Permanent) و ممانعت از حذف اسناد تاییدشده', () => {
    const docs = foundationStore.getAccountingDocuments();
    const targetDoc = docs.find((d) => d.status === 'APPROVED');
    assert.ok(targetDoc, 'باید سند با وضعیت APPROVED برای تست وجود داشته باشد.');

    const permDoc = foundationStore.makeAccountingDocumentPermanent(targetDoc.id, 1);
    assert.equal(permDoc.status, 'PERMANENT', 'وضعیت سند باید قطعی (PERMANENT) شود.');

    // حذف سند قطعی باید با خطا مواجه شود
    assert.throws(
      () => {
        foundationStore.deleteAccountingDocument(permDoc.id, 1);
      },
      /غیرقابل حذف هستند/,
      'اسناد تاییدشده یا دائمی نباید قابل حذف باشند.'
    );
  });

  await t.test('۷. آزمون دفتر روزنامه، دفتر کل و گزارش تراز آزمایشی (Trial Balance)', () => {
    const journal = foundationStore.getJournalLedger();
    assert.ok(journal.length > 0, 'دفتر روزنامه باید حاوی ردیف‌های گردش اسناد باشد.');

    const cashLedgerSummaries = foundationStore.getGeneralLedger('10101');
    const cashLedger = cashLedgerSummaries.find((l) => l.accountCode === '10101');
    assert.ok(cashLedger, 'دفتر کل حساب صندوق باید محاسبه شود.');
    assert.ok(cashLedger.totalDebitIrr >= 0);
    assert.ok(cashLedger.entries.length > 0, 'دفتر کل صندوق باید دارای گردش بدهکار/بستانکار باشد.');

    const trialBalance = foundationStore.getTrialBalance();
    assert.ok(trialBalance.rows.length > 0, 'تراز آزمایشی باید شامل ردیف‌های حساب‌های معین باشد.');
    assert.equal(
      trialBalance.totalDebitTurnoverIrr,
      trialBalance.totalCreditTurnoverIrr,
      'گردش بدهکار و بستانکار در تراز آزمایشی باید دقیقاً با یکدیگر برابر باشند.'
    );
    assert.equal(
      trialBalance.totalRemainingDebitIrr,
      trialBalance.totalRemainingCreditIrr,
      'مانده بدهکار و مانده بستانکار در تراز آزمایشی باید دقیقاً با یکدیگر برابر باشند.'
    );
    assert.equal(trialBalance.isBalanced, true, 'تراز آزمایشی باید در حالت تراز (Balanced) قرار داشته باشد.');
  });
});
