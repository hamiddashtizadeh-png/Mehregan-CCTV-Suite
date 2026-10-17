import React, { useState, useRef } from 'react';
import { Printer, X, FileText, CheckCircle2, ShieldCheck, QrCode, Download, Monitor } from 'lucide-react';
import { numberToWordsPersian } from '../utils/numberToWords';
import { printHtmlContent, downloadInvoiceHtml } from '../utils/printUtils';

export interface InvoicePrintLine {
  itemCode?: string;
  itemTitleFa: string;
  unitNameFa?: string;
  quantity: number;
  unitPriceIrr: number;
  discountIrr?: number;
  totalPriceIrr: number;
  serialNumbers?: string[];
}

export interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleFa: string; // e.g. فاکتور رسمی فروش / پیش‌فاکتور / قبض دریافت
  docNumber: string;
  dateJalali: string;
  companyInfo: {
    name: string;
    economicCode?: string;
    nationalId?: string;
    phone?: string;
    addressFa?: string;
    logoUrl?: string;
  };
  partyInfo?: {
    name: string;
    economicCode?: string;
    nationalId?: string;
    phone?: string;
    addressFa?: string;
  };
  lines: InvoicePrintLine[];
  subtotalIrr: number;
  totalDiscountIrr: number;
  totalVatIrr: number;
  totalPayableIrr: number;
  paidAmountIrr?: number;
  remainingBalanceIrr?: number;
  notesFa?: string;
  receiptFooterMessageFa?: string;
}

export function InvoicePrintModal({
  isOpen,
  onClose,
  titleFa,
  docNumber,
  dateJalali,
  companyInfo,
  partyInfo,
  lines,
  subtotalIrr,
  totalDiscountIrr,
  totalVatIrr,
  totalPayableIrr,
  paidAmountIrr,
  remainingBalanceIrr,
  notesFa,
  receiptFooterMessageFa,
}: InvoicePrintModalProps) {
  const [printFormat, setPrintFormat] = useState<'A4_FORMAL' | 'POS_80MM'>('A4_FORMAL');
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const payableInWords = numberToWordsPersian(totalPayableIrr);

  const handleTriggerPrint = async () => {
    setIsPrinting(true);
    try {
      const html = printableAreaRef.current?.innerHTML || '';
      await printHtmlContent({
        title: `${titleFa} - ${docNumber}`,
        bodyHtml: html,
        isThermal: printFormat === 'POS_80MM',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadHtml = () => {
    const html = printableAreaRef.current?.innerHTML || '';
    downloadInvoiceHtml(
      `invoice-${docNumber || Date.now()}`,
      `${titleFa} - ${docNumber}`,
      html,
      printFormat === 'POS_80MM'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Control Bar (Excluded from Print) */}
        <div className="no-print px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-black">{titleFa}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                شماره: {docNumber} · تاریخ: {dateJalali}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Format Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintFormat('A4_FORMAL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  printFormat === 'A4_FORMAL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 نسخه A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('POS_80MM')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  printFormat === 'POS_80MM' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🖨️ فیش 80mm
              </button>
            </div>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="ارسال مستقیم به پرینتر یا ذخیره PDF"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'در حال ارسال...' : 'چاپ مستقیم (پرینتر)'}</span>
            </button>

            {/* Browser Print */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isPrinting}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
              title="چاپ با میانبر مرورگر و دیالوگ سیستم‌عامل"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>چاپ صفحه مرورگر</span>
            </button>

            {/* Download HTML Button */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="ذخیره فاکتور بصورت فایل HTML جهت باز کردن در تب جداگانه یا بایگانی"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود فایل HTML</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-8 bg-slate-100/50 max-h-[80vh] overflow-y-auto flex justify-center">
          <div ref={printableAreaRef} className="printable-area w-full flex justify-center">
          {printFormat === 'A4_FORMAL' ? (
            /* 📄 A4 Formal Standard Invoice Sheet */
            <div className="bg-white p-8 rounded-xl border border-slate-300 shadow-md w-full max-w-[210mm] text-slate-900 text-xs leading-relaxed space-y-6 print:shadow-none print:border-none print:w-full print:p-0">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-black text-lg">
                    مهرگان
                  </div>
                  <div>
                    <h1 className="text-base font-black text-slate-900">{companyInfo.name}</h1>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      ارائه‌دهنده سیستم‌های نظارت تصویری، دزدگیر، جک پارکینگ و شبکه‌های کامپیوتری
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="font-extrabold text-sm text-slate-900">{titleFa}</div>
                  <div>
                    <span className="text-slate-500">شماره: </span>
                    <span className="font-bold text-slate-900">{docNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">تاریخ: </span>
                    <span className="font-bold text-slate-900">{dateJalali}</span>
                  </div>
                </div>
              </div>

              {/* Company & Party Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px]">
                {/* Seller Info */}
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1 mb-1.5">
                    مشخصات فروشنده (تأمین‌کننده):
                  </span>
                  <div>نام مجموعه: <strong className="text-slate-900">{companyInfo.name}</strong></div>
                  {companyInfo.economicCode && <div>کد اقتصادی: <span className="font-mono">{companyInfo.economicCode}</span></div>}
                  {companyInfo.nationalId && <div>شناسه ملی: <span className="font-mono">{companyInfo.nationalId}</span></div>}
                  {companyInfo.phone && <div>تلفن تماس: <span className="font-mono">{companyInfo.phone}</span></div>}
                  {companyInfo.addressFa && <div>آدرس: {companyInfo.addressFa}</div>}
                </div>

                {/* Buyer Info */}
                <div className="space-y-1 border-r border-slate-200 pr-4">
                  <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1 mb-1.5">
                    مشخصات خریدار (مشتری):
                  </span>
                  <div>نام/عنوان: <strong className="text-slate-900">{partyInfo?.name || 'مشتری حضوری / عمومی'}</strong></div>
                  {partyInfo?.economicCode && <div>کد اقتصادی: <span className="font-mono">{partyInfo.economicCode}</span></div>}
                  {partyInfo?.nationalId && <div>کد ملی / شناسه: <span className="font-mono">{partyInfo.nationalId}</span></div>}
                  {partyInfo?.phone && <div>تلفن همراه: <span className="font-mono">{partyInfo.phone}</span></div>}
                  {partyInfo?.addressFa && <div>آدرس تحویل: {partyInfo.addressFa}</div>}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-hidden border border-slate-300 rounded-xl">
                <table className="w-full text-right text-[11px] border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <tr>
                      <th className="p-2.5 text-center border-l border-slate-300 w-10">ردیف</th>
                      <th className="p-2.5 border-l border-slate-300">کد / عنوان کالا و خدمات</th>
                      <th className="p-2.5 text-center border-l border-slate-300 w-16">تعداد</th>
                      <th className="p-2.5 text-left border-l border-slate-300">فی (ریال)</th>
                      <th className="p-2.5 text-left border-l border-slate-300">تخفیف (ریال)</th>
                      <th className="p-2.5 text-left">مبلغ کل (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lines.map((l, idx) => (
                      <tr key={idx} className="even:bg-slate-50/50">
                        <td className="p-2.5 text-center font-mono border-l border-slate-300">{idx + 1}</td>
                        <td className="p-2.5 border-l border-slate-300 font-bold text-slate-900">
                          {l.itemTitleFa}
                          {l.itemCode && <span className="text-[10px] text-slate-500 font-mono mr-1">({l.itemCode})</span>}
                          {l.serialNumbers && l.serialNumbers.length > 0 && (
                            <div className="text-[10px] font-mono text-indigo-700 mt-0.5">
                              سریال‌ها: {l.serialNumbers.join(' ، ')}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold border-l border-slate-300">
                          {l.quantity} {l.unitNameFa || ''}
                        </td>
                        <td className="p-2.5 text-left font-mono border-l border-slate-300">
                          {l.unitPriceIrr.toLocaleString('fa-IR')}
                        </td>
                        <td className="p-2.5 text-left font-mono border-l border-slate-300 text-rose-600">
                          {(l.discountIrr || 0).toLocaleString('fa-IR')}
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                          {l.totalPriceIrr.toLocaleString('fa-IR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary & Amount in Words */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-700 block">مبلغ قابل پرداخت به حروف:</span>
                    <span className="font-black text-slate-900 text-xs mt-0.5 block bg-white p-2 rounded-lg border border-slate-200">
                      {payableInWords} ریال
                    </span>
                  </div>
                  {notesFa && (
                    <div className="pt-2 text-[10px] text-slate-600 border-t border-slate-200">
                      <strong>توضیحات فاکتور:</strong> {notesFa}
                    </div>
                  )}
                  {receiptFooterMessageFa && (
                    <div className="text-[10px] text-emerald-800 font-semibold">
                      ✓ {receiptFooterMessageFa}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs text-left dir-ltr">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="dir-rtl text-right">جمع اقلام:</span>
                    <span className="font-bold text-slate-900">{subtotalIrr.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  {totalDiscountIrr > 0 && (
                    <div className="flex justify-between items-center text-rose-600">
                      <span className="dir-rtl text-right">جمع تخفیفات:</span>
                      <span className="font-bold">({totalDiscountIrr.toLocaleString('fa-IR')}) ریال</span>
                    </div>
                  )}
                  {totalVatIrr > 0 && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="dir-rtl text-right">مالیات و عوارض:</span>
                      <span className="font-bold">{totalVatIrr.toLocaleString('fa-IR')} ریال</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-slate-300 pt-2 text-sm font-black text-slate-900">
                    <span className="dir-rtl text-right">مبلغ نهایی قابل پرداخت:</span>
                    <span className="text-emerald-700">{totalPayableIrr.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  {paidAmountIrr !== undefined && (
                    <div className="flex justify-between items-center text-slate-700 text-[11px] pt-1 border-t border-dashed border-slate-200">
                      <span className="dir-rtl text-right">مبلغ دریافتی:</span>
                      <span className="font-bold">{paidAmountIrr.toLocaleString('fa-IR')} ریال</span>
                    </div>
                  )}
                  {remainingBalanceIrr !== undefined && remainingBalanceIrr > 0 && (
                    <div className="flex justify-between items-center text-rose-700 text-[11px] font-bold">
                      <span className="dir-rtl text-right">مانده بدهی:</span>
                      <span>{remainingBalanceIrr.toLocaleString('fa-IR')} ریال</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures & Stamps */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-center text-[11px] font-bold text-slate-700">
                <div>
                  <span>مهر و امضای صادرکننده / فروشگاه</span>
                  <div className="h-16 mt-2 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-300 text-[10px]">
                    محل امضاء و مهر
                  </div>
                </div>
                <div>
                  <span>امضاء و تأیید تحویل‌گیرنده</span>
                  <div className="h-16 mt-2 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-300 text-[10px]">
                    محل امضاء خریدار
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 🖨️ Thermal 80mm POS Thermal Print Layout */
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-md w-[80mm] text-slate-900 text-[10px] leading-tight space-y-3 print:shadow-none print:border-none print:w-[80mm] print:p-0">
              <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                <div className="font-black text-sm text-slate-900">{companyInfo.name}</div>
                <div className="font-extrabold text-xs text-emerald-800">{titleFa}</div>
                <div className="font-mono text-[9px] text-slate-600">
                  شماره: {docNumber} · {dateJalali}
                </div>
                {companyInfo.phone && <div className="font-mono text-[9px]">تلفن: {companyInfo.phone}</div>}
              </div>

              {partyInfo && (
                <div className="border-b border-dashed border-slate-400 pb-2 space-y-0.5">
                  <div>خریدار: <strong className="text-slate-900">{partyInfo.name}</strong></div>
                  {partyInfo.phone && <div>تلفن: <span className="font-mono">{partyInfo.phone}</span></div>}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3">
                {lines.map((l, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-1 text-[10px]">
                    <div className="font-bold text-slate-900">
                      {idx + 1}. {l.itemTitleFa}
                      <div className="text-[9px] text-slate-500 font-mono font-normal">
                        {l.quantity} × {l.unitPriceIrr.toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <div className="font-mono font-extrabold text-slate-900 shrink-0">
                      {l.totalPriceIrr.toLocaleString('fa-IR')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Amounts */}
              <div className="space-y-1 font-mono text-[10px] text-left dir-ltr border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span className="dir-rtl">جمع کل:</span>
                  <span className="font-bold">{subtotalIrr.toLocaleString('fa-IR')}</span>
                </div>
                {totalDiscountIrr > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span className="dir-rtl">تخفیف:</span>
                    <span>({totalDiscountIrr.toLocaleString('fa-IR')})</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs text-slate-900 pt-1 border-t border-slate-200">
                  <span className="dir-rtl">قابل پرداخت:</span>
                  <span className="text-emerald-700">{totalPayableIrr.toLocaleString('fa-IR')} ریال</span>
                </div>
              </div>

              <div className="text-center space-y-1 text-[9px] text-slate-600 pt-1">
                <div>به حروف: {payableInWords} ریال</div>
                {receiptFooterMessageFa && <div className="font-semibold text-emerald-800">{receiptFooterMessageFa}</div>}
                <div className="pt-2 font-mono text-[8px] text-slate-400">
                  *** مهرگان ERP - سیستم حسابداری و POS ***
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
