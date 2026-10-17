import test from 'node:test';
import assert from 'node:assert/strict';
import { foundationStore } from '../src/server/foundationStore';

test('مرحله ۱۰: سال مالی، دوره‌های حسابداری، کنترل تاریخ اسناد، بستن دوره، مراکز هزینه و گزارش سودآوری چندبعدی', async (t) => {
  await t.test('۱. بررسی سال‌های مالی و دوره‌های حسابداری ماهانه تعریف‌شده اولیه', () => {
    const fiscalYears = foundationStore.getFiscalYears();
    assert.ok(fiscalYears.length >= 2, 'حداقل ۲ سال مالی (۱۴۰۴ بسته و ۱۴۰۵ جاری) باید وجود داشته باشد.');

    const fy1405 = fiscalYears.find((y) => y.yearCode === '1405');
    assert.ok(fy1405, 'سال مالی ۱۴۰۵ باید در سیستم ثبت شده باشد.');
    assert.equal(fy1405.status, 'OPEN', 'سال مالی ۱۴۰۵ باید در وضعیت باز (OPEN) باشد.');
    assert.equal(fy1405.isDefault, true, 'سال مالی ۱۴۰۵ باید سال پیش‌فرض سامانه باشد.');

    const periods1405 = foundationStore.getAccountingPeriods(fy1405.id);
    assert.equal(periods1405.length, 12, 'سال مالی ۱۴۰۵ باید دقیقاً شامل ۱۲ دوره حسابداری ماهانه باشد.');
    assert.equal(periods1405[0].titleFa, 'فروردین‌ماه ۱۴۰۵');
    assert.equal(periods1405[11].titleFa, 'اسفندماه ۱۴۰۵');
  });

  await t.test('۲. اعتبارسنجی کنترل تاریخ اسناد حسابداری بر اساس تقویم مالی', () => {
    // A. Valid date within open 1405 year
    const validCheck = foundationStore.validateDocumentDateForPosting('1405/02/15');
    assert.equal(validCheck.valid, true, 'تاریخ ۱۵ اردیبهشت ۱۴۰۵ باید معتبر باشد.');
    assert.equal(validCheck.fiscalYear?.yearCode, '1405');
    assert.equal(validCheck.period?.periodNumber, 2);

    // B. Date with invalid format
    const formatCheck = foundationStore.validateDocumentDateForPosting('1405-02-15');
    assert.equal(formatCheck.valid, false, 'فرمت تاریخ بدون اسلش باید رد شود.');
    assert.ok(formatCheck.errorFa?.includes('معتبر نمی‌باشد'));

    // C. Date outside any defined fiscal year
    const futureCheck = foundationStore.validateDocumentDateForPosting('1410/05/01');
    assert.equal(futureCheck.valid, false, 'تاریخ سال‌های خارج از محدوده باید نامعتبر شناخته شود.');
    assert.ok(futureCheck.errorFa?.includes('هیچ سال مالی'));

    // D. Date within closed fiscal year 1404
    const closedYearCheck = foundationStore.validateDocumentDateForPosting('1404/06/10');
    assert.equal(closedYearCheck.valid, false, 'تاریخ سال مالی بسته شده ۱۴۰۴ باید رد شود.');
    assert.ok(closedYearCheck.errorFa?.includes('بسته شده است') || closedYearCheck.errorFa?.includes('CLOSED'));
  });

  await t.test('۳. ممانعت از ثبت سند دوبل با تاریخ خارج از دوره یا سال بسته', () => {
    // Attempting to post document to closed year 1404
    assert.throws(() => {
      foundationStore.createAccountingDocument({
        dateJalali: '1404/10/01',
        descriptionFa: 'تست سند در سال بسته شده',
        lines: [
          { accountCode: '10101', accountTitleFa: 'صندوق', debitIrr: 1000000, creditIrr: 0, descriptionFa: 'بدهکار' },
          { accountCode: '10301', accountTitleFa: 'مشتریان', debitIrr: 0, creditIrr: 1000000, descriptionFa: 'بستانکار' },
        ],
      });
    }, /بسته|CLOSED|محدوده/);
  });

  await t.test('۴. آزمون بستن امن و غیرمخرب دوره حسابداری (بدون حذف یا تغییر سوابق قبلی)', () => {
    const fy1405 = foundationStore.getFiscalYears().find((y) => y.yearCode === '1405')!;
    const periods = foundationStore.getAccountingPeriods(fy1405.id);
    const p1 = periods.find((p) => p.periodNumber === 1)!;
    assert.equal(p1.status, 'OPEN');

    const docsCountBefore = foundationStore.getAccountingDocuments().length;

    // Close Period 1 (Farvardin 1405)
    const closeResult = foundationStore.closeAccountingPeriod(p1.id, {
      notesFa: 'بستن ماه فروردین جهت ارسال صورت‌های مالی ماهانه',
      closeDateJalali: '1405/01/31',
    });

    assert.equal(closeResult.ok, true, 'بستن دوره باید با موفقیت انجام شود.');
    assert.ok(closeResult.messageFa.includes('موفقیت'));

    // Check period is now CLOSED
    const updatedP1 = foundationStore.getAccountingPeriodById(p1.id)!;
    assert.equal(updatedP1.status, 'CLOSED');
    assert.ok(updatedP1.closedAt);
    assert.ok(updatedP1.closingDocNumber);

    // Verify non-destructive invariant: historical count NOT reduced
    const docsAfter = foundationStore.getAccountingDocuments();
    assert.ok(docsAfter.length >= docsCountBefore, 'بستن دوره نباید هیچ سندی را حذف یا پنهان کند.');

    // Check closing document double-entry balance
    if (closeResult.closingDoc) {
      assert.equal(closeResult.closingDoc.docType, 'CLOSING');
      assert.equal(closeResult.closingDoc.status, 'PERMANENT');
      assert.equal(closeResult.closingDoc.totalDebitIrr, closeResult.closingDoc.totalCreditIrr, 'سند بستن دوره باید کاملاً تراز دوبل باشد.');
    }

    // Now verify that posting to the closed period Farvardin is blocked
    const dateInP1Check = foundationStore.validateDocumentDateForPosting('1405/01/15');
    assert.equal(dateInP1Check.valid, false, 'ثبت سند در فروردین پس از بستن باید مسدود شود.');
    assert.ok(dateInP1Check.errorFa?.includes('بسته'));
  });

  await t.test('۵. بازگشایی مجوزمحور و مستند دوره حسابداری با ثبت در لاگ ممیزی', () => {
    const fy1405 = foundationStore.getFiscalYears().find((y) => y.yearCode === '1405')!;
    const p1 = foundationStore.getAccountingPeriods(fy1405.id).find((p) => p.periodNumber === 1)!;

    // Reason less than 5 characters should fail
    assert.throws(() => {
      foundationStore.reopenAccountingPeriod(p1.id, 'کمی');
    }, /حداقل ۵ کاراکتر/);

    // Reopen with valid justification
    const reopenResult = foundationStore.reopenAccountingPeriod(
      p1.id,
      'درخواست هیئت مدیره برای تعدیل ممیزی فاکتورهای ترخیص اول دوره'
    );
    assert.equal(reopenResult.ok, true);

    const recheckP1 = foundationStore.getAccountingPeriodById(p1.id)!;
    assert.equal(recheckP1.status, 'OPEN', 'دوره باید مجدداً در وضعیت OPEN قرار گیرد.');

    // Verify audit log captured the event
    const auditLogs = foundationStore.getAuditLogs();
    const reopenAudit = auditLogs.find((l) => l.action === 'PERIOD_REOPEN');
    assert.ok(reopenAudit, 'رویداد بازگشایی دوره باید در جدول لاگ ممیزی غیرقابل تغییر ثبت شده باشد.');
  });

  await t.test('۶. بررسی مدیریت و تفکیک مراکز هزینه (Cost Centers)', () => {
    const costCenters = foundationStore.getCostCenters();
    assert.ok(costCenters.length >= 4, 'حداقل ۴ مرکز هزینه پیش‌فرض (فروشگاه، پروژه‌ها، گارانتی، عمومی) باید وجود داشته باشد.');

    const showroom = costCenters.find((c) => c.code === 'CC-101');
    assert.ok(showroom);
    assert.equal(showroom.isActive, true);

    // Create a new cost center for large infrastructure contracts
    const testCode = `CC-T${Date.now().toString().slice(-4)}`;
    const newCC = foundationStore.createCostCenter({
      code: testCode,
      titleFa: 'پروژه‌های فیبر نوری و دکل‌های نظارتی شهری',
      managerNameFa: 'مهندس مرادی',
      budgetIrr: 12000000000,
      descriptionFa: 'پروژه‌های کلان زیرساختی دوربین و فیبر نوری',
    });

    assert.equal(newCC.code, testCode);
    assert.equal(newCC.budgetIrr, 12000000000);

    const allCCs = foundationStore.getCostCenters();
    assert.ok(allCCs.some((c) => c.code === testCode));
  });

  await t.test('۷. آزمون محاسبات مستقل گزارش جامع و چندبعدی سودآوری (Profitability Analytics)', () => {
    const report = foundationStore.getComprehensiveProfitabilityReport({
      fiscalYearCode: '1405',
    });

    assert.ok(report, 'گزارش سودآوری باید ایجاد شود.');
    assert.ok(report.summary, 'خلاصه سودآوری باید محاسبه گردد.');

    const s = report.summary;

    // Independent Formula Verification:
    // Net Sales = Gross Sales - Discounts - Returns
    const computedNetSales = Math.max(0, s.totalGrossSalesIrr - s.totalDiscountsIrr - s.totalReturnsIrr);
    assert.equal(s.totalNetSalesIrr, computedNetSales, 'فرمول فروش خالص باید دقیقاً مطابقت داشته باشد.');

    // Gross Profit = Net Sales - COGS
    const computedGrossProfit = s.totalNetSalesIrr - s.totalCogsIrr;
    assert.equal(s.totalGrossProfitIrr, computedGrossProfit, 'فرمول سود ناخالص باید کاملاً معتبر باشد.');

    // Net Profit = Gross Profit - (Operating Expenses + Installer Wages)
    const computedNetProfit = s.totalGrossProfitIrr - (s.totalOperatingExpensesIrr + s.totalInstallerWagesIrr);
    assert.equal(s.totalNetProfitIrr, computedNetProfit, 'فرمول سود خالص پس از کسر هزینه‌های تخصیص‌یافته باید تطابق داشته باشد.');

    // Multi-Dimensional Checks:
    assert.ok(Array.isArray(report.byItem), 'تحلیل بر اساس کالا باید آرایه معتبر باشد.');
    assert.ok(Array.isArray(report.byCategory), 'تحلیل بر اساس گروه کالا باید آرایه معتبر باشد.');
    assert.ok(Array.isArray(report.byCustomer), 'تحلیل بر اساس مشتری باید آرایه معتبر باشد.');
    assert.ok(Array.isArray(report.byInstaller), 'تحلیل بر اساس نصاب باید آرایه معتبر باشد.');
    assert.ok(Array.isArray(report.byProject), 'تحلیل بر اساس پروژه باید آرایه معتبر باشد.');

    // Verification of dimension calculations consistency:
    for (const itemRow of report.byItem) {
      assert.ok(itemRow.netSalesIrr <= itemRow.grossSalesIrr, 'فروش خالص کالا نباید بیشتر از فروش ناخالص باشد.');
      const itemNet = Math.max(0, itemRow.grossSalesIrr - itemRow.discountsIrr - itemRow.returnsIrr);
      assert.equal(itemRow.netSalesIrr, itemNet, `فروش خالص کالا ${itemRow.dimensionCode} محاسبه اشتباه دارد.`);
      assert.equal(itemRow.grossProfitIrr, itemRow.netSalesIrr - itemRow.cogsIrr, `سود ناخالص کالا ${itemRow.dimensionCode} خطا دارد.`);
    }

    for (const catRow of report.byCategory) {
      assert.equal(catRow.grossProfitIrr, catRow.netSalesIrr - catRow.cogsIrr, `سود گروه کالا ${catRow.dimensionCode} خطا دارد.`);
    }

    for (const custRow of report.byCustomer) {
      assert.equal(custRow.grossProfitIrr, custRow.netSalesIrr - custRow.cogsIrr, `سود مشتری ${custRow.dimensionCode} خطا دارد.`);
    }
  });
});
