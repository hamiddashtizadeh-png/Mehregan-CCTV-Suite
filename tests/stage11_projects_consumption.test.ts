import test from 'node:test';
import assert from 'node:assert/strict';
import { foundationStore } from '../src/server/foundationStore';

test('مرحله ۱۱: ماژول یکپارچه پروژه‌ها، نصابان، چرخه مصرف کالا، خدمات نصب، تسویه اشخاص و سودآوری واقعی', async (t) => {
  await t.test('۱. بررسی پروژه‌های اولیه و تعریف پروژه جدید نظارتی مداربسته', () => {
    const projects = foundationStore.getProjects();
    assert.ok(projects.length >= 2, 'حداقل ۲ پروژه پیش‌فرض باید ثبت شده باشد.');

    const prj1 = projects.find((p) => p.projectCode === 'PRJ-1405-101');
    assert.ok(prj1, 'پروژه ۱۰۱ نگین پایتخت باید وجود داشته باشد.');
    assert.equal(prj1.status, 'IN_PROGRESS');
    assert.ok(prj1.installerTitleFa?.includes('بهرامی'));

    // Create a new project
    const newPrj = foundationStore.createProject({
      titleFa: 'پروژه تجهیز دکل‌ها و دوربین‌های ۴K پتروشیمی زاگرس',
      customerId: 1,
      installerId: 3,
      contractAmountIrr: 980000000,
      locationAddressFa: 'منطقه ویژه عسلویه، فاز ۲ پتروشیمی',
      startDateJalali: '1405/01/25',
      targetCompletionDateJalali: '1405/03/10',
      notesFa: 'نصب ۸ دوربین اسپیددام، کابل‌کشی فیبر نوری و سرور رک‌مونت',
    });

    assert.ok(newPrj.projectCode.startsWith('PRJ-1405-'));
    assert.equal(newPrj.contractAmountIrr, 980000000);
    assert.equal(newPrj.status, 'APPROVED');

    const fetched = foundationStore.getProjectById(newPrj.id);
    assert.ok(fetched);
    assert.equal(fetched.titleFa, 'پروژه تجهیز دکل‌ها و دوربین‌های ۴K پتروشیمی زاگرس');
  });

  await t.test('۲. چرخه کامل درخواست، تأیید، تحویل از انبار، مصرف و برگشت مازاد کالا (Requisition Lifecycle)', () => {
    // A. Create requisition for Cat6 cable (non-serialized)
    const req = foundationStore.createProjectRequisition({
      projectId: 1,
      itemId: 5, // Cat6 Cable
      sourceWarehouseId: 1,
      requestedQty: 2,
      notesFa: 'درخواست ۲ حلقه کابل شبکه Cat6 جهت کابل‌کشی پروژه',
    });

    assert.equal(req.status, 'REQUESTED');
    assert.equal(req.requestedQty, 2);

    // B. Manager Approval
    const approved = foundationStore.approveProjectRequisition(req.id, 2);
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.approvedQty, 2);

    // Check item stock before issuance
    const stockBefore = foundationStore.getItemStock(5).totalStock;

    // C. Warehouse Issuance (تحویل انباردار به نصاب)
    const issued = foundationStore.issueProjectRequisition(req.id, 2, 1);
    assert.equal(issued.status, 'ISSUED');
    assert.equal(issued.issuedQty, 2);

    // Stock should be deducted using existing Inventory Engine
    const stockAfterIssue = foundationStore.getItemStock(5).totalStock;
    assert.equal(stockAfterIssue, stockBefore - 2, 'موجودی انبار باید به میزان ۲ عدد کاهش یافته باشد.');

    // D. Project Consumption (مصرف ۱ حلقه در محل پروژه)
    const consumed = foundationStore.consumeProjectRequisition(req.id, 1, '1405/01/25');
    assert.equal(consumed.status, 'CONSUMED');
    assert.equal(consumed.consumedQty, 1);
    assert.equal(consumed.totalCostIrr, 1 * req.unitCostIrr);

    // Verify double-entry accounting document generated
    const docs = foundationStore.getAccountingDocuments();
    const consumptionDoc = docs.find((d) => d.sourceDocId === req.id);
    assert.ok(consumptionDoc, 'سند حسابداری دوطرفه برای مصرف کالا باید صادر شده باشد.');
    assert.equal(consumptionDoc.totalDebitIrr, consumptionDoc.totalCreditIrr, 'سند مصرف باید کاملاً تراز باشد.');
    assert.ok(consumptionDoc.lines.some((l) => l.accountCode === '70101'), 'بدهکار باید سرفصل بهای تمام‌شده و هزینه پروژه باشد.');
    assert.ok(consumptionDoc.lines.some((l) => l.accountCode === '10501'), 'بستانکار باید سرفصل موجودی انبار کالا باشد.');

    // E. Return Surplus to Warehouse (برگشت ۱ حلقه مازاد سالم به انبار)
    const returned = foundationStore.returnProjectRequisition(req.id, 1, '1405/01/25');
    assert.equal(returned.status, 'RETURNED');
    assert.equal(returned.returnedQty, 1);

    // Stock in warehouse should be restored by 1
    const stockAfterReturn = foundationStore.getItemStock(5).totalStock;
    assert.equal(stockAfterReturn, stockBefore - 1, 'موجودی انبار پس از برگشت ۱ عدد باید بازیابی شده باشد.');
  });

  await t.test('۳. تفکیک و ایزولاسیون دسترسی نصاب (Installer Access Isolation)', () => {
    // Installer 3: مهندس بهرامی
    const installerProjects = foundationStore.getProjects({ installerId: 3 });
    assert.ok(installerProjects.length >= 1);
    for (const p of installerProjects) {
      assert.equal(p.installerId, 3, 'نصاب فقط باید پروژه‌های منتسب به خود را در کارپوشه ببیند.');
    }

    const installerReqs = foundationStore.getProjectRequisitions(undefined, { installerId: 3 });
    for (const r of installerReqs) {
      const parentPrj = foundationStore.getProjectById(r.projectId);
      assert.equal(parentPrj?.installerId, 3, 'درخواست‌های کالای نصاب باید محدود به پروژه‌های خودش باشد.');
    }
  });

  await t.test('۴. تحلیل و محاسبه دقیق سودآوری و بهای تمام‌شده واقعی پروژه (Project Profitability)', () => {
    const detail = foundationStore.getProjectProfitabilityDetail(1);
    assert.ok(detail);
    assert.equal(detail.projectCode, 'PRJ-1405-101');
    assert.ok(detail.invoicedRevenueIrr > 0, 'درآمد قرارداد باید معتبر باشد.');
    assert.ok(detail.totalMaterialCostIrr >= 0, 'بهای تمام‌شده متریال مصرفی باید محاسبه شود.');
    assert.ok(detail.installerWagesIrr >= 0, 'اجرت نصاب باید محاسبه شود.');

    // Mathematical verification:
    // Gross Profit = Revenue - Consumed Materials Cost
    assert.equal(detail.grossProfitIrr, detail.invoicedRevenueIrr - detail.totalMaterialCostIrr);
    // Net Profit = Revenue - (Materials + Installer Wages + Allocated Expenses)
    assert.equal(detail.netProfitIrr, detail.invoicedRevenueIrr - detail.totalCostsIrr);
    assert.ok(detail.materialsBreakdown.length > 0, 'ریز اقلام مصرفی پروژه باید فهرست شود.');
  });

  await t.test('۵. آزمون تسویه حساب فوری شخص در لیست اشخاص (Quick Party Settlement)', () => {
    // Settle party 1 with POS receipt
    const result = foundationStore.settlePartyQuick({
      partyId: 1,
      txType: 'RECEIPT',
      amountIrr: 45000000,
      paymentMethod: 'POS',
      dateJalali: '1405/01/25',
      bankAccountId: 1,
      descriptionFa: 'وصول کارتخوان پایانه فروشگاه بابت فاکتور',
    });

    assert.equal(result.ok, true);
    assert.ok(result.transaction);
    assert.equal(result.transaction.paymentMethod, 'POS');
    assert.equal(result.transaction.amountIrr, 45000000);

    // Settle with Cheque
    const chqResult = foundationStore.settlePartyQuick({
      partyId: 1,
      txType: 'RECEIPT',
      amountIrr: 120000000,
      paymentMethod: 'CHEQUE',
      dateJalali: '1405/01/25',
      chequeNumber: '9876543210123456',
      chequeDueDateJalali: '1405/03/15',
      bankNameFa: 'بانک ملت',
    });
    assert.equal(chqResult.ok, true);
    const cheques = foundationStore.getCheques();
    assert.ok(cheques.some((c) => c.chequeNumber === '9876543210123456'));
  });

  await t.test('۶. آزمون فرم‌های تعاریف اولیه (بانک‌ها، انبارها، گروه‌ها و صندوق‌ها)', () => {
    // 1. Bank Account
    const bank = foundationStore.createBankAccount({
      bankNameFa: 'بانک پاسارگاد شعبه مرکزی',
      accountNumber: '201-8000-1405',
      shabaNumber: 'IR120570020180001405000001',
      balanceIrr: 1500000000,
    });
    assert.ok(bank.accountCode.startsWith('BA-'));
    assert.equal(bank.bankNameFa, 'بانک پاسارگاد شعبه مرکزی');

    // 2. Warehouse
    const wh = foundationStore.createWarehouse({
      code: 'WH-SHIRAZ',
      titleFa: 'انبار منطقه جنوب (شیراز)',
      managerNameFa: 'مهندس قنبری',
      locationAddressFa: 'شیراز، شهرک صنعتی بزرگ',
      phone: '071-37748920',
    });
    assert.equal(wh.code, 'WH-SHIRAZ');

    // 3. Category
    const cat = foundationStore.createItemCategory({
      categoryCode: 'CAT-OPTICAL-FIBER',
      titleFa: 'تجهیزات فیبر نوری و ODF',
      prefix: 'FIB',
    });
    assert.equal(cat.categoryCode, 'CAT-OPTICAL-FIBER');

    // 4. Cash Box
    const box = foundationStore.createCashBox({
      titleFa: 'صندوق ارزی و ریالی شعبه جمهوری',
      balanceIrr: 500000000,
    });
    assert.ok(box.boxCode.startsWith('CB-'));
  });

  await t.test('۷. آزمون امنیت و پاکسازی دیتابیس (Database Reset & Factory Clear)', () => {
    // Test operational wipe
    const wipeRes = foundationStore.resetDatabase({ wipeOperationalOnly: true });
    assert.equal(wipeRes.ok, true);
    assert.equal(foundationStore.getProjects().length, 0, 'پروژه‌ها باید پاکسازی شده باشند.');
    assert.ok(foundationStore.getItems().length > 0, 'تعاریف پایه کالا باید حفظ شده باشند.');
    assert.ok(foundationStore.getParties().length > 0, 'تعاریف پایه اشخاص باید حفظ شده باشند.');

    // Test factory reset (restores default state)
    const factoryRes = foundationStore.resetDatabase({ factoryReset: true });
    assert.equal(factoryRes.ok, true);
    assert.ok(foundationStore.getProjects().length >= 2, 'پس از ریست کارخانه‌ای، پروژه‌های پیش‌فرض بازگردانی می‌شوند.');
  });
});
