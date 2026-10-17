import { test, describe } from 'node:test';
import assert from 'node:assert';
import { foundationStore } from '../src/server/foundationStore';

describe('ماژول خدمات نصب، راه‌اندازی و کنترل‌های پیشرفته برگشت از فروش (مرحله ۷)', () => {
  test('۱. بررسی بارگذاری سفارشات نصب اولیه در دیتابیس', () => {
    const jobs = foundationStore.getInstallationJobs();
    assert(Array.isArray(jobs), 'لیست سفارشات نصب باید آرایه باشد.');
    assert(jobs.length >= 1, 'حداقل یک سفارش نصب اولیه باید وجود داشته باشد.');

    const initialJob = jobs.find((j) => j.jobCode === 'INS-1405-1001');
    assert(initialJob, 'سفارش نصب اولیه INS-1405-1001 باید یافت شود.');
    assert.strictEqual(initialJob.status, 'COMPLETED');
    console.log(`   ✅ سفارش نصب اولیه [${initialJob.jobCode}] با موفقیت بارگذاری شد.`);
  });

  test('۲. ایجاد سفارش نصب جدید (مستقل یا مرتبط با فاکتور فروش)', () => {
    const parties = foundationStore.getParties();
    const customer = parties.find((p) => p.roles?.includes('CUSTOMER') || p.primaryType === 'CUSTOMER') || parties[0];
    const installer = parties.find((p) => p.roles?.includes('INSTALLER') || p.primaryType === 'INSTALLER') || parties[0];

    const newJob = foundationStore.createInstallationJob(
      {
        titleFa: 'نصب و داکت‌کشی سیستم شبکه و ۱۶ عدد دوربین IP',
        customerId: customer.id,
        installerId: installer.id,
        serviceFeeIrr: 80000000,
        additionalExpensesIrr: 20000000,
        locationAddressFa: 'تهران، خیابان شریعتی، مجتمع اداری پارس، طبقه ۳',
        scheduledDateJalali: '1405/01/28',
        notesFa: 'نیاز به نردبان بلند و تجهیزات شبکه دارد.',
      },
      1
    );

    assert(newJob, 'پرونده نصب باید ایجاد شود.');
    assert(newJob.jobCode.startsWith('INS-1405-'), 'کد پرونده نصب باید با INS-1405 شروع شود.');
    assert.strictEqual(newJob.totalCostIrr, 100000000);
    assert.strictEqual(newJob.status, 'ASSIGNED');
    console.log(`   ✅ پرونده نصب جدید [${newJob.jobCode}] به مبلغ ${newJob.totalCostIrr.toLocaleString()} ریال ایجاد شد.`);
  });

  test('۳. به‌روزرسانی وضعیت سفارش نصب و ثبت تحویل نهایی', () => {
    const jobs = foundationStore.getInstallationJobs();
    const targetJob = jobs[0];

    const updated = foundationStore.updateInstallationJobStatus(
      {
        jobId: targetJob.id,
        status: 'COMPLETED',
        completedDateJalali: '1405/01/29',
        paidAmountIrr: targetJob.totalCostIrr,
        notesFa: 'تست تحویل نهایی و دریافت کامل وجه انجام شد.',
      },
      1
    );

    assert.strictEqual(updated.status, 'COMPLETED');
    assert.strictEqual(updated.remainingBalanceIrr, 0);
    console.log(`   ✅ وضعیت سفارش نصب [${updated.jobCode}] به COMPLETED به‌روزرسانی و تسویه شد.`);
  });

  test('۴. آزمون ممانعت از برگشت بیش از مقدار مجاز فروش (Sales Return Control)', () => {
    const invoices = foundationStore.getSalesInvoices();
    const invoice = invoices.find((i) => i.lines && i.lines.length > 0 && i.status !== 'CANCELLED');
    assert(invoice, 'حداقل یک فاکتور فروش دارای کالا باید موجود باشد.');

    const line = invoice.lines[0];
    const invalidExcessQty = line.quantity + 10;

    assert.throws(
      () => {
        foundationStore.createSalesReturn(
          {
            salesInvoiceId: invoice.id,
            targetWarehouseId: invoice.sourceWarehouseId,
            lines: [
              {
                itemId: line.itemId,
                quantity: invalidExcessQty,
                unitRefundIrr: line.netPriceIrr / line.quantity,
              },
            ],
          },
          1
        );
      },
      (err: Error) => {
        return err.message.includes('بیشتر از حداکثر مقدار قابل مرجوعی');
      },
      'سیستم باید جلوی مرجوعی بیش از تعداد فروش‌رفته را بگیرد.'
    );

    console.log(`   ✅ مسدودسازی مرجوعی بیش از مقدار مجاز فروش با موفقیت تایید شد.`);
  });

  test('۵. آزمون کنترل شماره سریال در برگشت از فروش (Serial Control)', () => {
    const invoices = foundationStore.getSalesInvoices();
    const invoiceWithSerials = invoices.find((i) =>
      i.lines.some((l) => l.serialNumbers && l.serialNumbers.length > 0)
    );

    if (invoiceWithSerials) {
      const line = invoiceWithSerials.lines.find((l) => l.serialNumbers && l.serialNumbers.length > 0)!;
      const fakeSerial = 'FAKE-SERIAL-99999';

      assert.throws(
        () => {
          foundationStore.createSalesReturn(
            {
              salesInvoiceId: invoiceWithSerials.id,
              targetWarehouseId: invoiceWithSerials.sourceWarehouseId,
              lines: [
                {
                  itemId: line.itemId,
                  quantity: 1,
                  unitRefundIrr: line.netPriceIrr / line.quantity,
                  serialNumbers: [fakeSerial],
                },
              ],
            },
            1
          );
        },
        (err: Error) => {
          return err.message.includes('متعلق به ردیف فروش فاکتور');
        },
        'سیستم باید جلوی مرجوعی سریال نامعتبر را بگیرد.'
      );

      console.log(`   ✅ مسدودسازی مرجوعی سریال نامتعلق به فاکتور با موفقیت تایید شد.`);
    }
  });

  test('۶. آزمون اجرای برگشت از فروش صحیح و بازیابی سریال به انبار (INBOUND_RETURN)', () => {
    const invoices = foundationStore.getSalesInvoices();
    const invoice = invoices.find((i) =>
      i.lines.some((l) => l.serialNumbers && l.serialNumbers.length > 0)
    );
    assert(invoice, 'فاکتور فروش دارای سریال برای تست مرجوعی یافت نشد.');

    const line = invoice.lines.find((l) => l.serialNumbers && l.serialNumbers.length > 0)!;
    const serialToReturn = line.serialNumbers![0];

    const salesReturn = foundationStore.createSalesReturn(
      {
        salesInvoiceId: invoice.id,
        targetWarehouseId: invoice.sourceWarehouseId,
        dateJalali: '1405/01/29',
        lines: [
          {
            itemId: line.itemId,
            quantity: 1,
            unitRefundIrr: line.netPriceIrr / line.quantity,
            serialNumbers: [serialToReturn],
            reasonFa: 'تست مرجوعی کالا به دلیل معیوب بودن کارت قطعه',
          },
        ],
        notesFa: 'تست مرجوعی رسمی فروش در مرحله ۷',
      },
      1
    );

    assert(salesReturn, 'سند مرجوعی فروش باید صادر شود.');
    assert(salesReturn.returnNumber.startsWith('SRET-1405-'), 'کد مرجوعی باید SRET باشد.');

    // Verify Serial Status is now IN_STOCK
    const serialRecord = foundationStore.getSerialByNumber(serialToReturn);
    assert(serialRecord, 'سریال مرجوعی باید در دیتابیس وجود داشته باشد.');
    assert.strictEqual(serialRecord.status, 'IN_STOCK');

    console.log(
      `   ✅ مرجوعی فروش [${salesReturn.returnNumber}] صادر شد. سریال [${serialToReturn}] به وضعیت IN_STOCK بازگشت.`
    );
  });
});
