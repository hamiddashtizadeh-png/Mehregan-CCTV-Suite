import * as XLSX from 'xlsx';
import { printHtmlContent } from './printUtils';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * خروجی استاندارد به فرمت اکسل (XLSX) با راست‌به‌چپ (RTL) و هدرهای فارسی
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[]
) {
  // آماده‌سازی آرایه داده‌ها با هدرهای مشخص‌شده
  const formattedRows = data.map((item) => {
    const row: Record<string, unknown> = {};
    columns.forEach((col) => {
      row[col.header] = item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);

  // تنظیم عرض ستون‌ها
  worksheet['!cols'] = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length * 2, 16),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  // جهت راست‌به‌چپ شیت
  if (!workbook.Workbook) {
    workbook.Workbook = {};
  }
  workbook.Workbook.Views = [{ RTL: true }];

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

/**
 * چاپ و خروجی استاندارد PDF با رندرینگ کامل یونیکد، استایل راست‌به‌چپ و سربرگ تجاری
 */
/**
 * چاپ و خروجی استاندارد PDF با رندرینگ کامل یونیکد، استایل راست‌به‌چپ و سربرگ تجاری
 */
export async function exportToPdf(
  title: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[],
  metadata?: { docNumber?: string; dateJalali?: string; summaryFa?: string }
) {
  const tableHeaders = columns.map((c) => `<th>${c.header}</th>`).join('');
  const tableRows = data
    .map((row, idx) => {
      const cells = columns
        .map((c) => {
          const val = row[c.key];
          return `<td>${val !== undefined && val !== null ? String(val) : '-'}</td>`;
        })
        .join('');
      return `<tr><td style="text-align: center; width: 40px;">${idx + 1}</td>${cells}</tr>`;
    })
    .join('');

  const bodyHtml = `
    <div style="font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; text-align: right; color: #0f172a; font-size: 11px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <div style="font-size: 16px; font-weight: 800; color: #0369a1;">سامانه جامع مدیریت و حسابداری مهرگان</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 700;">${title}</div>
        </div>
        <div style="text-align: left; font-size: 10px; color: #334155; line-height: 1.6;">
          ${metadata?.docNumber ? `<div><strong>شماره سند/گزارش:</strong> ${metadata.docNumber}</div>` : ''}
          <div><strong>تاریخ استخراج:</strong> ${metadata?.dateJalali || new Date().toLocaleDateString('fa-IR')}</div>
          <div><strong>وضعیت:</strong> رسمی و ممهور سامانه</div>
        </div>
      </div>

      ${
        metadata?.summaryFa
          ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-weight: 600; font-size: 11px;">${metadata.summaryFa}</div>`
          : ''
      }

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; color: #1e293b; font-weight: 700;">
            <th style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: center; width: 40px;">ردیف</th>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="' + (columns.length + 1) + '" style="text-align:center; padding:15px; color:#64748b;">هیچ داده‌ای برای نمایش یافت نشد</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 10px; text-align: center; font-size: 10px; color: #94a3b8;">
        گزارش تولیدشده توسط سیستم جامع حسابداری، انبار و فروش مهرگان - تمامی حقوق محفوظ است
      </div>
    </div>
  `;

  await printHtmlContent({
    title,
    bodyHtml,
    isThermal: false,
  });
}
