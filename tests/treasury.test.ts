import test from 'node:test';
import assert from 'node:assert/strict';
import { foundationStore } from '../src/server/foundationStore';

test('ماژول خزانه، گردش وجوه نقد و بانک، چک‌ها، اقساط و هزینه‌های عملیاتی (مرحله ۸)', async (t) => {
  await t.test('۱. بررسی وجود صندوق‌ها و حساب‌های بانکی اولیه در دیتابیس', () => {
    const cashBoxes = foundationStore.getCashBoxes();
    const bankAccounts = foundationStore.getBankAccounts();

    assert.ok(cashBoxes.length >= 2, 'حداقل ۲ صندوق اولیه باید در دیتابیس وجود داشته باشد.');
    assert.ok(bankAccounts.length >= 2, 'حداقل ۲ حساب بانکی اولیه باید در دیتابیس وجود داشته باشد.');

    const initialLiquidity =
      cashBoxes.reduce((acc, c) => acc + c.balanceIrr, 0) +
      bankAccounts.reduce((acc, b) => acc + b.balanceIrr, 0);

    assert.ok(initialLiquidity > 0, 'مجموع موجودی اولیه خزانه باید مثبت باشد.');
  });

  await t.test('۲. آزمون ثبت تعریف صندوق نقدی و حساب بانکی جدید', () => {
    const box = foundationStore.createCashBox('صندوق شعبه ۲', 200000000);
    assert.equal(box.titleFa, 'صندوق شعبه ۲');
    assert.equal(box.balanceIrr, 200000000);

    const bank = foundationStore.createBankAccount(
      'بانک ملی - شعبه تجریش',
      '020011223344',
      'IR10-0000-0200-1122-3344-0001',
      500000000
    );
    assert.equal(bank.bankNameFa, 'بانک ملی - شعبه تجریش');
    assert.equal(bank.balanceIrr, 500000000);
  });

  await t.test('۳. آزمون ثبت تراکنش دریافت وجه (RECEIPT) و افزایش موجودی حساب', () => {
    const initialBank = foundationStore.getBankAccounts().find((b) => b.id === 1)!;
    const initialBal = initialBank.balanceIrr;

    const tx = foundationStore.createTreasuryTransaction({
      txType: 'RECEIPT',
      dateJalali: '1405/01/25',
      partyId: 1,
      amountIrr: 100000000,
      paymentMethod: 'POS',
      targetBankAccountId: 1,
      notesFa: 'دریافت وجه بابت صورت‌حساب خدمات',
    });

    assert.ok(tx.txNumber.startsWith('TRN-1405-'));
    assert.equal(tx.amountIrr, 100000000);

    const updatedBank = foundationStore.getBankAccounts().find((b) => b.id === 1)!;
    assert.equal(
      updatedBank.balanceIrr,
      initialBal + 100000000,
      'موجودی حساب بانکی باید دقیقاً به اندازه مبلغ دریافتی افزایش یافته باشد.'
    );
  });

  await t.test('۴. آزمون ثبت انتقال بین‌حسابی (TRANSFER) بین صندوق و بانک', () => {
    const sourceBox = foundationStore.getCashBoxes().find((c) => c.id === 1)!;
    const targetBank = foundationStore.getBankAccounts().find((b) => b.id === 1)!;

    const sourceInitial = sourceBox.balanceIrr;
    const targetInitial = targetBank.balanceIrr;
    const transferAmount = 30000000;

    foundationStore.createTreasuryTransaction({
      txType: 'TRANSFER',
      dateJalali: '1405/01/25',
      amountIrr: transferAmount,
      paymentMethod: 'CASH',
      sourceCashBoxId: 1,
      targetBankAccountId: 1,
      notesFa: 'واریز نقد از صندوق مرکزی به حساب بانک سامان',
    });

    const updatedBox = foundationStore.getCashBoxes().find((c) => c.id === 1)!;
    const updatedBank = foundationStore.getBankAccounts().find((b) => b.id === 1)!;

    assert.equal(updatedBox.balanceIrr, sourceInitial - transferAmount);
    assert.equal(updatedBank.balanceIrr, targetInitial + transferAmount);
  });

  await t.test('۵. آزمون مدیریت چرخه حیات چک‌های صیادی و وصول قطعی (Clearance)', () => {
    const cheque = foundationStore.createCheque({
      chequeNumber: 'CHQ-998811',
      chequeType: 'INBOUND',
      partyId: 1,
      bankNameFa: 'بانک ملت',
      branchNameFa: 'شعبه ونک',
      amountIrr: 250000000,
      issueDateJalali: '1405/01/20',
      dueDateJalali: '1405/02/20',
      notesFa: 'چک بابت تضمین تسویه پروژه',
    });

    assert.equal(cheque.status, 'IN_HAND');

    // Update status to CLEARED
    const bankBefore = foundationStore.getBankAccounts().find((b) => b.id === 1)!.balanceIrr;
    const clearedCheque = foundationStore.updateChequeStatus({
      chequeId: cheque.id,
      status: 'CLEARED',
      depositBankAccountId: 1,
      clearedDateJalali: '1405/02/20',
    });

    assert.equal(clearedCheque.status, 'CLEARED');
    const bankAfter = foundationStore.getBankAccounts().find((b) => b.id === 1)!.balanceIrr;
    assert.equal(bankAfter, bankBefore + 250000000, 'وصول چک دریافتی باید موجودی بانک را افزایش دهد.');

    // Prevent double clearance
    assert.throws(
      () => {
        foundationStore.updateChequeStatus({
          chequeId: cheque.id,
          status: 'CLEARED',
        });
      },
      /قبلاً وصول شده/,
      'وصول مجدد یک چک وصول‌شده باید مسدود شود.'
    );
  });

  await t.test('۶. آزمون دفتر اقساط و تسویه قسط (Installment Settlement)', () => {
    const installments = foundationStore.getInstallments();
    assert.ok(installments.length > 0, 'دفتر اقساط نباید خالی باشد.');

    const targetInst = installments.find((i) => i.status === 'PENDING')!;
    const paidInst = foundationStore.payInstallment(targetInst.id, '1405/01/25', 'POS');

    assert.equal(paidInst.status, 'PAID');
    assert.equal(paidInst.paidDateJalali, '1405/01/25');
    assert.ok(paidInst.treasuryTxId, 'باید شناسه تراکنش مالی بابت تسویه قسط ثبت شده باشد.');

    // Prevent double payment of installment
    assert.throws(
      () => {
        foundationStore.payInstallment(targetInst.id, '1405/01/25', 'POS');
      },
      /قبلاً پرداخت شده/,
      'تسویه مجدد قسط پرداخت‌شده باید مسدود شود.'
    );
  });

  await t.test('۷. آزمون ثبت هزینه عملیاتی (Operational Expense) و کسر از خزانه', () => {
    const boxBefore = foundationStore.getCashBoxes().find((c) => c.id === 1)!.balanceIrr;

    const expense = foundationStore.createOperationalExpense({
      categoryFa: 'قبوض',
      titleFa: 'پرداخت قبض برق و اینترنت فروشگاه',
      amountIrr: 8500000,
      dateJalali: '1405/01/25',
      paymentMethod: 'CASH',
    });

    assert.equal(expense.categoryFa, 'قبوض');
    assert.equal(expense.amountIrr, 8500000);

    const boxAfter = foundationStore.getCashBoxes().find((c) => c.id === 1)!.balanceIrr;
    assert.equal(
      boxAfter,
      boxBefore - 8500000,
      'ثبت هزینه نقدی باید بلافاصله از موجودی صندوق کسر گردد.'
    );
  });
});
