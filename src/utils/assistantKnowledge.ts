/**
 * Internal Offline Knowledgebase and Diagnostic Engine for Mehregan ERP Assistant
 * Provides instant step-by-step troubleshooting, accounting workflows, and error diagnosis.
 */

export interface KnowledgeItem {
  id: string;
  category: 'SALES' | 'PURCHASE' | 'INVENTORY' | 'TREASURY' | 'ACCOUNTING' | 'INSTALLATION' | 'SYSTEM' | 'ERROR';
  titleFa: string;
  keywords: string[];
  summaryFa: string;
  solutionStepsFa: string[];
  suggestedTab?: string;
}

export interface DiagnosticResult {
  code: string;
  titleFa: string;
  causeFa: string;
  resolutionFa: string[];
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  quickAction?: { label: string; tab: string };
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'pos_sale',
    category: 'SALES',
    titleFa: 'نحوه صدور فاکتور فروش سریع (Quick POS)',
    keywords: ['فروش', 'فاکتور', 'فروش سریع', 'pos', 'صندوق', 'ثبت فاکتور', 'کارتخوان', 'بارکد'],
    summaryFa: 'برای ثبت سریع فاکتور در فروشگاه با استفاده از بارکدخوان یا کیبورد.',
    solutionStepsFa: [
      'به تب «فروش و POS» مراجعه نمایید.',
      'بارکد کالا را اسکن کنید یا نام آن را در کادر جستجو تایپ کنید.',
      'با کلیدهای جهت‌نمای کیبورد (↑ و ↓) روی کالای موردنظر بروید و دکمه Enter را بزنید تا کالا فوراً به سبد اضافه شود.',
      'تعداد کالا و در صورت نیاز قیمت واحد را ویرایش نمایید.',
      'مشتری و انبار خروج کالا را مشخص کنید (امکان افزودن سریع با آیکون + وجود دارد).',
      'روش تسویه (پوز، نقدی، کارت به کارت یا نسیه) را انتخاب کنید و دکمه «ثبت فاکتور فروش» را بزنید.',
      'فاکتور بلافاصله به سند حسابداری دوبل و حواله خروج انبار تبدیل می‌شود.'
    ],
    suggestedTab: 'SALES'
  },
  {
    id: 'proforma_convert',
    category: 'SALES',
    titleFa: 'تبدیل پیش‌فاکتور به فاکتور فروش قطعی',
    keywords: ['پیش فاکتور', 'تبدیل پیش فاکتور', 'استعلام قیمت', 'پیشفاکتور'],
    summaryFa: 'صدور پیش‌فاکتور بدون کسر از انبار و تبدیل رسمی آن به فاکتور نهایی پس از تایید مشتری.',
    solutionStepsFa: [
      'در تب «فروش و POS»، به زیرمنوی «پیش‌فاکتورها» بروید.',
      'پیش‌فاکتور موردنظر را در جدول بیابید و دکمه «تبدیل به فاکتور قطعی» را بزنید.',
      'انبار خروج کالا و شرایط تسویه را تایید کنید.',
      'پس از ثبت، موجودی انبار کسر و سند حسابداری فروش صادر می‌شود.'
    ],
    suggestedTab: 'SALES'
  },
  {
    id: 'purchase_cogs',
    category: 'PURCHASE',
    titleFa: 'ثبت فاکتور خرید و بهای تمام‌شده Landed Cost',
    keywords: ['خرید', 'تأمین کننده', 'سربار', 'حمل', 'گمرک', 'بهای تمام شده', 'cogs'],
    summaryFa: 'محاسبه دقیق ارزش ریالی کالا بر اساس فاکتور خرید به‌علاوه هزینه‌های حمل، بیمه و گمرک.',
    solutionStepsFa: [
      'به تب «خرید و تدارکات» بروید و روی دکمه «ثبت فاکتور خرید جدید» کلیک کنید.',
      'تأمین‌کننده، انبار مقصد و ارز فاکتور (ریال، درهم، دلار یا یورو) را انتخاب کنید.',
      'اقلام خریداری‌شده و قیمت را ثبت نمایید.',
      'در بخش هزینه‌های سربار خرید (Landed Costs)، مبالغ کرایه حمل، بیمه، گمرک و بسته‌بندی را وارد کنید.',
      'سیستم بهای تمام‌شده هر قلم کالا را بر اساس روش وزنی ریالی یا تعدادی محاسبه و به انبار می‌افزاید.'
    ],
    suggestedTab: 'PURCHASES'
  },
  {
    id: 'inventory_kardex',
    category: 'INVENTORY',
    titleFa: 'استعلام کاردکس کالا و گردش انبار',
    keywords: ['کاردکس', 'موجودی', 'انبار', 'انتقال انبار', 'گردش کالا', 'تراز انبار'],
    summaryFa: 'مشاهده تاریخچه ورود، خروج، فی واحد و تراز لحظه‌ای هر کالا در تمام انبارها.',
    solutionStepsFa: [
      'به تب «کالا و انبارداری» مراجعه کنید.',
      'تب «کاردکس کالا» را انتخاب نمایید.',
      'کالای موردنظر و در صورت نیاز انبار مشخص را فیلتر کنید.',
      'می‌توانید با دکمه‌های بالای صفحه خروجی اکسل یا پرینت رسمی PDF از کاردکس تهیه کنید.'
    ],
    suggestedTab: 'INVENTORY'
  },
  {
    id: 'serial_tracking',
    category: 'INVENTORY',
    titleFa: 'رهگیری شماره سریال و MAC آدرس تجهیزات',
    keywords: ['سریال', 'مک آدرس', 'mac', 'گارانتی', 'ردگیری', 'دوربین'],
    summaryFa: 'ردگیری تاریخچه هر دستگاه دوربین یا ضبط‌کننده بر اساس شماره سریال کارخانه.',
    solutionStepsFa: [
      'به تب «کالا و انبارداری» و سپس «ردگیری سریال و MAC» بروید.',
      'شماره سریال یا مک آدرس دستگاه را در کادر جستجو تایپ کنید.',
      'مشاهده وضعیت فیزیکی (موجود در انبار، تحویل به مشتری، تحویل به نصاب، مرجوعی یا معیوب).'
    ],
    suggestedTab: 'INVENTORY'
  },
  {
    id: 'cheque_management',
    category: 'TREASURY',
    titleFa: 'ثبت و وصول چک‌های صیادی بنفش',
    keywords: ['چک', 'صیاد', 'وصول چک', 'برگشت چک', 'خزانه', 'سررسید'],
    summaryFa: 'مدیریت چک‌های دریافتی از مشتریان و پرداختی به تأمین‌کنندگان.',
    solutionStepsFa: [
      'به تب «خزانه و نقدینگی» بروید.',
      'در بخش اسناد دریافتی/پرداختی، دکمه «ثبت چک صیادی جدید» را کلیک کنید.',
      'شناسه صیادی ۱۶ رقمی، بانک عامل، مبلغ و تاریخ سررسید را وارد نمایید.',
      'در سررسید چک، با زدن دکمه «اعلام وصول»، مبلغ به حساب بانک واریز و سند حسابداری پاس‌شدن چک ثبت می‌گردد.'
    ],
    suggestedTab: 'TREASURY'
  },
  {
    id: 'double_entry_sanad',
    category: 'ACCOUNTING',
    titleFa: 'صدور و بررسی اسناد حسابداری دوبل رسمی',
    keywords: ['سند', 'حسابداری', 'تراز', 'دفتر کل', 'بدهکار', 'بستانکار', 'کدینگ'],
    summaryFa: 'مشاهده اسناد حسابداری خودکار صادرشده توسط سیستم یا ثبت سند دستی جدید.',
    solutionStepsFa: [
      'به تب «حسابداری و سودآوری» بروید.',
      'در تب «دفتر روزنامه اسناد»، تمام اسناد حاصل از فروش، خرید، خزانه و انبار با جزئیات بدهکار/بستانکار موجودند.',
      'برای چاپ سند، روی آیکون پرینتر کنار هر سند کلیک کنید.',
      'برای تراز آزمایشی، تب «تراز آزمایشی و سودآوری» را بررسی کنید.'
    ],
    suggestedTab: 'ACCOUNTING'
  },
  {
    id: 'backup_restore',
    category: 'SYSTEM',
    titleFa: 'تهیه نسخه پشتیبان (Backup) و بازیابی اطلاعات (Restore)',
    keywords: ['بکاپ', 'پشتیبان', 'بازیابی', 'ریستور', 'دانلود بکاپ', 'حفظ اطلاعات', 'backup', 'restore'],
    summaryFa: 'تهیه فایل پشتیبان کامل و امن از تمام اسناد، پایگاه‌داده و بازیابی بدون خطر.',
    solutionStepsFa: [
      'به منوی «سیستم: تنظیمات» بروید.',
      'بخش «مدیریت پشتیبان‌گیری و بازیابی (Backup & Restore)» را باز کنید.',
      'روی دکمه «تهیه و دانلود فایل پشتیبان کامل» کلیک کنید تا فایل JSON با امضای دیجیتال دریافت شود.',
      'جهت بازیابی، فایل پشتیبان را انتخاب کنید، پیش‌نمایش تغییرات را مشاهده کنید و تایید نهایی را صادر نمایید.'
    ],
    suggestedTab: 'SETTINGS_HEALTH'
  }
];

export const DIAGNOSTIC_RULES: Record<string, DiagnosticResult> = {
  INSUFFICIENT_STOCK: {
    code: 'INSUFFICIENT_STOCK',
    titleFa: 'کسری موجودی فیزیکی کالا در انبار انتخابی',
    causeFa: 'تعداد درخواستی در فاکتور فروش یا حواله خروج، بیشتر از موجودی ثبت‌شده کالا در انبار مبدأ است.',
    resolutionFa: [
      'موجودی کالا را در تب «کالا و انبارداری» بررسی کنید.',
      'انبار مبدأ کالا را در فاکتور به انباری تغییر دهید که دارای موجودی است.',
      'یا ابتدا رسید ورود خرید یا سند تعدیل مثبت انبارگردانی برای این کالا ثبت نمایید.'
    ],
    severity: 'WARNING',
    quickAction: { label: 'بررسی موجودی انبار', tab: 'INVENTORY' }
  },
  DUPLICATE_PARTY_MOBILE: {
    code: 'DUPLICATE_PARTY_MOBILE',
    titleFa: 'شماره تلفن همراه تکراری برای طرف حساب',
    causeFa: 'این شماره موبایل قبلاً برای یک مشتری یا شخص دیگر در سیستم ثبت شده است.',
    resolutionFa: [
      'شخص موردنظر را از لیست اشخاص جستجو کنید و از همان پرونده استفاده نمایید.',
      'یا تیک گزینه «اجازه ثبت موارد مشابه» را فعال نمایید.'
    ],
    severity: 'INFO',
    quickAction: { label: 'جستجو در اشخاص', tab: 'PARTIES' }
  },
  EMPTY_CART: {
    code: 'EMPTY_CART',
    titleFa: 'سبد فاکتور فروش خالی است',
    causeFa: 'هیچ کالایی جهت صدور فاکتور انتخاب نشده است.',
    resolutionFa: [
      'از کادر جستجوی سریع با دکمه‌های ↑ و ↓ کالای موردنظر را انتخاب کرده و Enter را بزنید.',
      'یا بارکد کالا را اسکن کنید.'
    ],
    severity: 'WARNING',
    quickAction: { label: 'بازگشت به فاکتور فروش', tab: 'SALES' }
  },
  UNBALANCED_DOCUMENT: {
    code: 'UNBALANCED_DOCUMENT',
    titleFa: 'عدم تراز بدهکار و بستانکار در سند حسابداری',
    causeFa: 'مجموع مبالغ بدهکار با مجموع مبالغ بستانکار در سند حسابداری دستی همخوانی ندارد.',
    resolutionFa: [
      'سطرهای سند را بررسی کنید تا جمع ستون بدهکار دقیقاً مساوی با ستون بستانکار باشد.',
      'سند حسابداری دوطرفه نمی‌تواند با تراز نامتعادل ثبت شود.'
    ],
    severity: 'CRITICAL',
    quickAction: { label: 'اسناد حسابداری', tab: 'ACCOUNTING' }
  },
  NETWORK_SERVER_ERROR: {
    code: 'NETWORK_SERVER_ERROR',
    titleFa: 'خطا در ارتباط با سرویس دیتابیس یا سرور محلی',
    causeFa: 'سرور پشتیبان یا پایگاه‌داده موقتاً پاسخ نداده است.',
    resolutionFa: [
      'از اتصال شبکه و اجرای سرور برنامه روی پورت 3000 اطمینان حاصل کنید.',
      'دکمه «تلاش مجدد برای برقراری اتصال» را بزنید.'
    ],
    severity: 'CRITICAL',
    quickAction: { label: 'بررسی وضعیت استقرار', tab: 'DEPLOYMENT' }
  }
};

/**
 * Searches the offline knowledgebase by user query and returns matched items
 */
export function queryKnowledgeBase(query: string): KnowledgeItem[] {
  if (!query.trim()) return KNOWLEDGE_BASE.slice(0, 4);
  const q = query.trim().toLowerCase();

  const scored = KNOWLEDGE_BASE.map((item) => {
    let score = 0;
    if (item.titleFa.toLowerCase().includes(q)) score += 10;
    if (item.summaryFa.toLowerCase().includes(q)) score += 5;
    for (const kw of item.keywords) {
      if (kw.toLowerCase().includes(q)) score += 6;
      if (q.includes(kw.toLowerCase())) score += 6;
    }
    for (const step of item.solutionStepsFa) {
      if (step.toLowerCase().includes(q)) score += 2;
    }
    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}

/**
 * Diagnoses an error message and returns a rich diagnostic report
 */
export function diagnoseError(errorMessage: string): DiagnosticResult {
  const msg = (errorMessage || '').toLowerCase();

  if (msg.includes('موجودی') || msg.includes('stock') || msg.includes('کسری')) {
    return DIAGNOSTIC_RULES.INSUFFICIENT_STOCK;
  }
  if (msg.includes('موبایل') || msg.includes('تکراری') || msg.includes('duplicate')) {
    return DIAGNOSTIC_RULES.DUPLICATE_PARTY_MOBILE;
  }
  if (msg.includes('سبد') || msg.includes('اقلام') || msg.includes('کالا') && msg.includes('انتخاب')) {
    return DIAGNOSTIC_RULES.EMPTY_CART;
  }
  if (msg.includes('تراز') || msg.includes('balance') || msg.includes('بدهکار') && msg.includes('بستانکار')) {
    return DIAGNOSTIC_RULES.UNBALANCED_DOCUMENT;
  }
  if (msg.includes('سرور') || msg.includes('پورت') || msg.includes('network') || msg.includes('failed to fetch')) {
    return DIAGNOSTIC_RULES.NETWORK_SERVER_ERROR;
  }

  return {
    code: 'UNKNOWN_ISSUE',
    titleFa: 'بررسی تخصصی پیام و راهنمایی',
    causeFa: errorMessage || 'سیستم پیام خطایی دریافت نموده است.',
    resolutionFa: [
      'اطلاعات واردشده در فرم را از نظر درستی فیلدهای اجباری و مبالغ بررسی کنید.',
      'در صورت نیاز با پشتیبانی فنی سیستم تماس حاصل نمایید یا از قابلیت بازیابی نسخه پشتیبان استفاده کنید.'
    ],
    severity: 'INFO'
  };
}
