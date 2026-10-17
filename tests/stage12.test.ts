import { describe, it } from 'node:test';
import assert from 'node:assert';
import { foundationStore } from '../src/server/foundationStore';

describe('مرحله ۱۲: دارایی‌های ثابت، استهلاک، گزارش‌های مدیریتی و سند افتتاحیه', () => {
  it('۱. بررسی لیست اولیه دارایی‌های ثابت و ثبت دارایی جدید', () => {
    const initialAssets = foundationStore.getFixedAssets();
    assert.strictEqual(Array.isArray(initialAssets), true);
    assert.ok(initialAssets.length >= 2);

    const newAsset = foundationStore.createFixedAsset(
      {
        assetCode: 'AST-TEST-001',
        titleFa: 'دستگاه لیزر صنعتی و برش برد چاپی CCTV',
        purchaseDateJalali: '1405/01/10',
        purchaseCostIrr: 320000000,
        salvageValueIrr: 20000000,
        usefulLifeYears: 5,
        depreciationMethod: 'STRAIGHT_LINE',
        custodianTitleFa: 'واحد تولید و تعمیرات',
        locationAddressFa: 'کارگاه فنی',
      },
      1
    );

    assert.ok(newAsset.id > 0);
    assert.strictEqual(newAsset.purchaseCostIrr, 320000000);
    assert.strictEqual(newAsset.bookValueIrr, 320000000);
    assert.strictEqual(newAsset.status, 'ACTIVE');
  });

  it('۲. محاسبه و ثبت سند دوبل استهلاک متوازن و ممانعت از ثبت تکراری', () => {
    const assets = foundationStore.getFixedAssets();
    const targetAsset = assets[0];
    assert.ok(targetAsset);

    const period = '1405-Y';
    const result = foundationStore.calculateAndPostDepreciation(targetAsset.id, period, 1);

    assert.strictEqual(result.ok, true);
    assert.ok(result.depreciationAmountIrr > 0);
    assert.strictEqual(result.document.lines.length, 2);

    // Verify double-entry debit and credit
    const debitLine = result.document.lines.find((l) => l.debitIrr > 0);
    const creditLine = result.document.lines.find((l) => l.creditIrr > 0);
    assert.ok(debitLine);
    assert.ok(creditLine);
    assert.strictEqual(debitLine.accountCode, '8101'); // هزینه استهلاک
    assert.strictEqual(creditLine.accountCode, '1502'); // استهلاک انباشته
    assert.strictEqual(debitLine.debitIrr, creditLine.creditIrr);

    // Test duplicate prevention for same period
    assert.throws(
      () => {
        foundationStore.calculateAndPostDepreciation(targetAsset.id, period, 1);
      },
      (err: unknown) => {
        return err instanceof Error && err.message.includes('قبلاً محاسبه و ثبت گردیده است');
      }
    );
  });

  it('۳. آزمون عدم ثبت سند افتتاحیه نامتوازن (مجموع بدهکار != مجموع بستانکار)', () => {
    assert.throws(
      () => {
        foundationStore.importOpeningBalances({
          dateJalali: '1405/01/01',
          descriptionFa: 'سند افتتاحیه نامتوازن تست',
          items: [
            {
              type: 'PARTY',
              titleFa: 'مشتری بدهکار',
              accountCode: '10301',
              debitIrr: 100000000,
              creditIrr: 0,
            },
            {
              type: 'GENERAL_ACCOUNT',
              titleFa: 'سرمایه',
              accountCode: '30101',
              debitIrr: 0,
              creditIrr: 50000000, // Imbalanced!
            },
          ],
        });
      },
      (err: unknown) => {
        return err instanceof Error && err.message.includes('متوازن نیست');
      }
    );
  });

  it('۴. آزمون ثبت و تأیید سند افتتاحیه متوازن ۱۰۱ و بروزرسانی خودکار موجودی‌ها و مانده اشخاص', () => {
    const result = foundationStore.importOpeningBalances({
      dateJalali: '1405/01/01',
      descriptionFa: 'سند افتتاحیه سال مالی ۱۰۱ (تأییدشده از اکسل)',
      items: [
        {
          type: 'PARTY',
          refId: 2,
          code: 'PRT-102',
          titleFa: 'بازرگانی پارس هایک',
          accountCode: '10301',
          debitIrr: 200000000,
          creditIrr: 0,
          notesFa: 'مانده بدهکار اولیه',
        },
        {
          type: 'INVENTORY',
          refId: 2,
          warehouseId: 2,
          titleFa: 'دوربین هایک‌ویژن',
          accountCode: '10401',
          debitIrr: 150000000,
          creditIrr: 0,
          qty: 5,
          unitCostIrr: 30000000,
          notesFa: 'موجودی اولیه ۵ عدد در انبار ۲',
        },
        {
          type: 'GENERAL_ACCOUNT',
          titleFa: 'سرمایه اولیه مالکان',
          accountCode: '30101',
          debitIrr: 0,
          creditIrr: 350000000,
          notesFa: 'حساب سرمایه',
        },
      ],
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.document.docNumber, 'DOC-OPENING-101');
    assert.strictEqual(result.document.status, 'PERMANENT');
    assert.strictEqual(result.document.totalDebitIrr, 350000000);

    // Verify Party balance updated
    const party = foundationStore.getParties().find((p) => p.id === 2);
    assert.ok(party);
    assert.strictEqual(party.transactionsSummary?.netBalanceIrr, 1700000000);
  });
});
