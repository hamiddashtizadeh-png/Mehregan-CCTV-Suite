/**
 * Print Utilities for Mehregan ERP
 * Provides multi-strategy rock-solid printing across browsers and iframe environments.
 */

export function generatePrintDocumentHtml(options: {
  title: string;
  bodyHtml: string;
  isThermal?: boolean;
}): string {
  const { title, bodyHtml, isThermal = false } = options;

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
    
    @page {
      size: ${isThermal ? '80mm auto' : 'A4 portrait'};
      margin: ${isThermal ? '2mm' : '8mm'};
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Tahoma, sans-serif;
      font-size: ${isThermal ? '10px' : '11px'};
      line-height: 1.4;
    }

    .printable-sheet {
      width: ${isThermal ? '80mm' : '100%'};
      max-width: ${isThermal ? '80mm' : '210mm'};
      margin: 0 auto;
      padding: ${isThermal ? '4mm' : '6mm'};
      background: #fff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      text-align: right;
    }

    th {
      background: #f1f5f9;
      font-weight: 800;
      color: #1e293b;
    }

    .no-print {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="printable-sheet">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

export function printHtmlContent(options: {
  title: string;
  bodyHtml: string;
  isThermal?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      let printMount = document.getElementById('mehregan-print-mount');
      if (!printMount) {
        printMount = document.createElement('div');
        printMount.id = 'mehregan-print-mount';
        document.body.appendChild(printMount);
      }

      const prevTitle = document.title;
      document.title = options.title || 'چاپ فاکتور و گزارش - سامانه مهرگان';

      const cleanup = () => {
        document.body.classList.remove('mehregan-printing');
        if (printMount) {
          printMount.innerHTML = '';
        }
        document.title = prevTitle;
        window.removeEventListener('afterprint', cleanup);
        window.removeEventListener('keydown', handleKeyDown);
        resolve(true);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('afterprint', cleanup);

      // Render print UI with an on-screen action bar (hidden in @media print)
      printMount.innerHTML = `
        <div class="mehregan-print-topbar no-print">
          <div class="print-topbar-info">
            <span class="print-badge">🖨️ حالت چاپ و صدور سند</span>
            <span class="print-title">${options.title}</span>
          </div>
          <div class="print-topbar-actions">
            <button id="mehregan-btn-do-print" class="print-btn-primary" type="button" title="کلیک کنید یا کلیدهای Ctrl+P را بفشارید">
              🖨️ چاپ مستقیم / ذخیره PDF
            </button>
            <button id="mehregan-btn-download-html" class="print-btn-secondary" type="button" title="دانلود فایل HTML سند">
              📥 دانلود فایل سند
            </button>
            <button id="mehregan-btn-close-print" class="print-btn-close" type="button" title="بستن پیش‌نمایش و بازگشت (کلید Esc)">
              ✖ بستن و بازگشت
            </button>
          </div>
        </div>
        <div class="mehregan-print-viewport">
          <div class="printable-sheet ${options.isThermal ? 'is-thermal' : 'is-a4'}">
            ${options.bodyHtml}
          </div>
        </div>
      `;

      // Wire topbar buttons
      document.getElementById('mehregan-btn-close-print')?.addEventListener('click', cleanup);
      document.getElementById('mehregan-btn-download-html')?.addEventListener('click', () => {
        downloadInvoiceHtml(options.title || 'document', options.title, options.bodyHtml, options.isThermal);
      });
      document.getElementById('mehregan-btn-do-print')?.addEventListener('click', () => {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn('Direct print invocation error:', e);
        }
      });

      // Activate print mode in DOM
      document.body.classList.add('mehregan-printing');

      // Attempt immediate print trigger after layout settles
      setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch (err) {
          console.warn('Initial window.print notice:', err);
        }
      }, 200);
    } catch (err) {
      console.error('Failed to prepare print mount:', err);
      try {
        window.print();
      } catch {
        // ignore
      }
      resolve(true);
    }
  });
}

export function downloadInvoiceHtml(filename: string, title: string, bodyHtml: string, isThermal: boolean = false) {
  try {
    const fullHtml = generatePrintDocumentHtml({ title, bodyHtml, isThermal });
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download invoice HTML:', err);
  }
}
