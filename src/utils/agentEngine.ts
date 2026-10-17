/**
 * Mehregan ERP Intelligent Agent Engine
 * Senior Accountant & Financial AI Persona ("حسابدار ارشد رسمی مهرگان")
 *
 * Features:
 * - Natural Persian Language Command Parser & Preprocessor
 * - High-accuracy Intent Recognition (Invoices, Journal Vouchers, Payment/Receipts, Expenses, Queries)
 * - Advanced Fuzzy Matching for Parties (Debtor/Creditor status), Item Stock, Bank/Cashbox Balances
 * - Probing / Clarification Engine (asks smart clarifying options when user inputs are ambiguous or missing parameters)
 * - Action Preview Cards with complete debit/credit breakdowns, voucher codes, and account numbers
 * - Direct connection to live ERP foundation store
 */

import { KNOWLEDGE_BASE, queryKnowledgeBase, diagnoseError, DiagnosticResult, KnowledgeItem } from './assistantKnowledge';
import { FoundationDataResponse, PartyRecord, ItemRecord, BankAccountRecord, CashBoxRecord } from '../types/foundation';

export type AgentIntentType =
  | 'ACTION_CREATE_EXPENSE'
  | 'ACTION_CREATE_INVOICE'
  | 'ACTION_CREATE_JOURNAL_VOUCHER'
  | 'ACTION_CREATE_PAYMENT_RECEIPT'
  | 'NEED_CLARIFICATION'
  | 'ACTION_NAVIGATE'
  | 'QUERY_BANK_BALANCES'
  | 'QUERY_INVENTORY'
  | 'QUERY_PARTY_LEDGER'
  | 'QUERY_CHEQUES'
  | 'GUIDE_HELP'
  | 'SYSTEM_DIAGNOSTIC'
  | 'GENERAL_CHAT';

export interface ExpensePreviewPayload {
  title: string;
  amount: number;
  amountFormatted: string;
  category: string;
  cashBoxId?: number;
  cashBoxTitle?: string;
  bankAccountId?: number;
  bankAccountTitle?: string;
  dateJalali: string;
}

export interface InvoiceItemPreview {
  itemId?: number;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoicePreviewPayload {
  type: 'SALES' | 'PURCHASE';
  partyId?: number;
  partyName: string;
  items: InvoiceItemPreview[];
  totalAmount: number;
  totalAmountFormatted: string;
  warehouseId?: number;
  warehouseTitle?: string;
  dateJalali: string;
}

export interface JournalVoucherEntryPreview {
  accountCode: string;
  accountTitle: string;
  debitIrr: number;
  creditIrr: number;
}

export interface JournalVoucherPreviewPayload {
  description: string;
  dateJalali: string;
  entries: JournalVoucherEntryPreview[];
  totalAmountFormatted: string;
}

export interface PaymentReceiptPreviewPayload {
  type: 'RECEIPT' | 'PAYMENT';
  partyId?: number;
  partyName: string;
  sourceTargetTitle: string;
  amount: number;
  amountFormatted: string;
  paymentMethod: 'CASH' | 'BANK' | 'POS';
  bankAccountId?: number;
  cashBoxId?: number;
  dateJalali: string;
}

export interface ClarificationOption {
  label: string;
  actionPrompt: string;
}

export interface ClarificationPayload {
  questionFa: string;
  missingField: string;
  suggestedOptions: ClarificationOption[];
}

export interface AgentCardAction {
  type:
    | 'EXPENSE_CONFIRMATION'
    | 'INVOICE_CONFIRMATION'
    | 'JOURNAL_VOUCHER_CONFIRMATION'
    | 'PAYMENT_RECEIPT_CONFIRMATION'
    | 'CLARIFICATION'
    | 'NAVIGATE'
    | 'PARTY_LEDGER'
    | 'DIAGNOSTIC_FIX';
  title: string;
  expensePayload?: ExpensePreviewPayload;
  invoicePayload?: InvoicePreviewPayload;
  journalVoucherPayload?: JournalVoucherPreviewPayload;
  paymentReceiptPayload?: PaymentReceiptPreviewPayload;
  clarificationPayload?: ClarificationPayload;
  navigateTab?: string;
  partyId?: number;
  quickActionTab?: string;
}

export interface AgentMessage {
  id: string;
  sender: 'USER' | 'AGENT' | 'SYSTEM_ERROR';
  text: string;
  timestamp: string;
  intent?: AgentIntentType;
  cardAction?: AgentCardAction;
  diagnostic?: DiagnosticResult;
  knowledgeItems?: KnowledgeItem[];
  reportData?: {
    type: 'BANK' | 'INVENTORY' | 'PARTY' | 'CHEQUE' | 'PROFITABILITY';
    title: string;
    items: { label: string; value: string; badge?: string }[];
  };
}

// Convert Persian digits to English digits
export function parsePersianDigits(str: string): string {
  if (!str) return '';
  const pDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const aDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(pDigits[i], 'g'), aDigits[i]);
  }
  return result;
}

// Format numbers with 3-digit comma separators
export function format3Digit(val: number | string): string {
  if (val === undefined || val === null || val === '') return '۰';
  const clean = String(val).replace(/[^\d]/g, '');
  if (!clean) return '۰';
  const formatted = Number(clean).toLocaleString('en-US');
  return parsePersianDigits(formatted);
}

// Persian text number extractor
export function extractAmountFromPersianText(text: string): number | null {
  if (!text) return null;
  const normalized = parsePersianDigits(text).replace(/,/g, '');

  // 1. Multiplier with digits ("100 هزار", "2.5 میلیون", "500k")
  const multiplierRegex = /(\d+(?:\.\d+)?)\s*(هزار|میلیون|میلیارد|k|m)/i;
  const matchMult = normalized.match(multiplierRegex);
  if (matchMult) {
    const base = parseFloat(matchMult[1]);
    const unit = matchMult[2].toLowerCase();
    let factor = 1;
    if (unit === 'هزار' || unit === 'k') factor = 1000;
    if (unit === 'میلیون' || unit === 'm') factor = 1000000;
    if (unit === 'میلیارد') factor = 1000000000;
    return Math.round(base * factor);
  }

  // 2. Persian word-based numbers
  let wordAmount = 0;
  if (normalized.includes('نیم میلیون')) wordAmount += 500000;
  if (normalized.includes('یک و نیم میلیون')) wordAmount = 1500000;
  if (normalized.includes('دو و نیم میلیون')) wordAmount = 2500000;

  if (!wordAmount) {
    if (normalized.includes('صد هزار') || normalized.includes('100 هزار') || normalized.includes('100هزار')) wordAmount = 100000;
    else if (normalized.includes('دویست هزار') || normalized.includes('200 هزار') || normalized.includes('200هزار')) wordAmount = 200000;
    else if (normalized.includes('سیصد هزار') || normalized.includes('300 هزار') || normalized.includes('300هزار')) wordAmount = 300000;
    else if (normalized.includes('چهارصد هزار') || normalized.includes('400 هزار') || normalized.includes('400هزار')) wordAmount = 400000;
    else if (normalized.includes('پانصد هزار') || normalized.includes('500 هزار') || normalized.includes('500هزار')) wordAmount = 500000;
    else if (normalized.includes('ششصد هزار') || normalized.includes('600 هزار') || normalized.includes('600هزار')) wordAmount = 600000;
    else if (normalized.includes('هفتصد هزار') || normalized.includes('700 هزار') || normalized.includes('700هزار')) wordAmount = 700000;
    else if (normalized.includes('هشتصد هزار') || normalized.includes('800 هزار') || normalized.includes('800هزار')) wordAmount = 800000;
    else if (normalized.includes('نهصد هزار') || normalized.includes('900 هزار') || normalized.includes('900هزار')) wordAmount = 900000;
    else if (normalized.includes('یک میلیون') || normalized.includes('۱ میلیون')) wordAmount = 1000000;
    else if (normalized.includes('دو میلیون') || normalized.includes('۲ میلیون')) wordAmount = 2000000;
    else if (normalized.includes('پنج میلیون') || normalized.includes('۵ میلیون')) wordAmount = 5000000;
    else if (normalized.includes('ده میلیون') || normalized.includes('۱۰ میلیون')) wordAmount = 10000000;
  }
  if (wordAmount > 0) return wordAmount;

  // 3. Standalone digits with optional currency
  const digitWithCurrency = /(\d{3,12})\s*(تومان|تومن|ریال)?/;
  const matchDigit = normalized.match(digitWithCurrency);
  if (matchDigit) {
    const rawVal = parseInt(matchDigit[1], 10);
    if (matchDigit[2] === 'ریال') {
      return Math.round(rawVal / 10);
    }
    return rawVal;
  }

  return null;
}

// Current Jalali date helper
export function getCurrentJalaliDate(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === 'year')?.value || '1403';
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const day = parts.find((p) => p.type === 'day')?.value || '01';
    return `${year}/${month}/${day}`;
  } catch {
    return '1403/07/22';
  }
}

// Normalize Persian Text helper
export function normalizePersianText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u200c\u200b\u200e\u200f]/g, ' ')
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\.\,\-\_\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy Party Search Engine
 */
export function findMatchedParties(input: string, parties: PartyRecord[]): PartyRecord[] {
  const normInput = normalizePersianText(input);
  if (!normInput || !parties || parties.length === 0) return [];

  const stopWords = [
    'بدهکاره', 'بستانکاره', 'بدهکار', 'بستانکار', 'بدهی', 'طلب', 'حساب', 'وضعیت',
    'مانده', 'صورتحساب', 'صورت', 'معین', 'دفتر', 'شخص', 'اشخاص', 'اقا', 'آقا',
    'خانم', 'مهندس', 'دکتر', 'شرکت', 'چقدر', 'داره', 'دارد', 'چطوریه', 'چیه',
    'است', 'هست', 'روی', 'را', 'رو', 'بگو', 'بده', 'چک', 'کن', 'ایا', 'آیا',
    'پیدا', 'سرچ', 'نمایش', 'اطلاعات'
  ];

  let cleanedQuery = normInput;
  stopWords.forEach((sw) => {
    cleanedQuery = cleanedQuery.replace(new RegExp(`\\b${sw}\\b`, 'g'), ' ');
  });
  cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();

  const queryTokens = cleanedQuery.split(' ').filter((t) => t.length >= 2);

  const scoredParties: { party: PartyRecord; score: number }[] = [];

  for (const party of parties) {
    const normFull = normalizePersianText(party.fullName);
    const normComp = party.companyTitle ? normalizePersianText(party.companyTitle) : '';
    const normCode = party.partyCode ? normalizePersianText(party.partyCode) : '';
    const mobile = party.mobile || '';

    let score = 0;

    if (cleanedQuery.length >= 2 && normFull.includes(cleanedQuery)) {
      score += 100;
    } else if (normInput.includes(normFull)) {
      score += 90;
    } else if (normComp && (cleanedQuery.includes(normComp) || normComp.includes(cleanedQuery))) {
      score += 85;
    } else if (cleanedQuery && normCode.includes(cleanedQuery)) {
      score += 95;
    } else if (mobile && normInput.includes(mobile)) {
      score += 95;
    }

    if (queryTokens.length > 0) {
      const partyTokens = normFull.split(' ').concat(normComp ? normComp.split(' ') : []).filter((t) => t.length >= 2);
      let matchCount = 0;
      for (const qToken of queryTokens) {
        if (partyTokens.some((pToken) => pToken.includes(qToken) || qToken.includes(pToken))) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        score += matchCount * 30;
      }
    }

    if (score > 0) {
      scoredParties.push({ party, score });
    }
  }

  scoredParties.sort((a, b) => b.score - a.score);
  return scoredParties.map((sp) => sp.party);
}

/**
 * Fuzzy Item Search Engine
 */
export function findMatchedItems(input: string, items: ItemRecord[]): ItemRecord[] {
  const normInput = normalizePersianText(input);
  if (!normInput || !items || items.length === 0) return [];

  const stopWords = [
    'موجودی', 'کالا', 'انبار', 'کاردکس', 'چقدر', 'چند', 'تا', 'داری', 'داریم',
    'موجود', 'رو', 'بگو', 'بده', 'تعداد', 'است', 'هست', 'قیمت', 'قیمتش', 'چندتا',
    'سرچ', 'پیدا', 'کن', 'لیست', 'وضعیت', 'نام', 'مدل'
  ];

  let cleanedQuery = normInput;
  stopWords.forEach((sw) => {
    cleanedQuery = cleanedQuery.replace(new RegExp(`\\b${sw}\\b`, 'g'), ' ');
  });
  cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();

  const queryTokens = cleanedQuery.split(' ').filter((t) => t.length >= 1);

  const scoredItems: { item: ItemRecord; score: number }[] = [];

  for (const item of items) {
    const normTitle = normalizePersianText(item.titleFa);
    const normModel = item.model ? normalizePersianText(item.model) : '';
    const normCode = item.itemCode ? normalizePersianText(item.itemCode) : '';
    const normBrand = item.brandName ? normalizePersianText(item.brandName) : '';

    let score = 0;

    if (cleanedQuery.length >= 2 && normTitle.includes(cleanedQuery)) {
      score += 100;
    } else if (cleanedQuery && normCode.includes(cleanedQuery)) {
      score += 100;
    } else if (normInput.includes(normTitle)) {
      score += 90;
    }

    if (queryTokens.length > 0) {
      const itemTokens = normTitle
        .split(' ')
        .concat(normModel ? normModel.split(' ') : [])
        .concat(normBrand ? normBrand.split(' ') : [])
        .filter((t) => t.length >= 1);

      let tokenHits = 0;
      for (const qToken of queryTokens) {
        if (itemTokens.some((iToken) => iToken.includes(qToken) || qToken.includes(iToken))) {
          tokenHits++;
        }
      }
      if (tokenHits > 0) {
        score += tokenHits * 35;
      }
    }

    if (score > 0) {
      scoredItems.push({ item, score });
    }
  }

  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.map((si) => si.item);
}

/**
 * Fuzzy Bank & CashBox Search Engine
 */
export function findMatchedBanksAndCashBoxes(
  input: string,
  bankAccounts: BankAccountRecord[],
  cashBoxes: CashBoxRecord[]
): { matchedBanks: BankAccountRecord[]; matchedCashBoxes: CashBoxRecord[] } {
  const normInput = normalizePersianText(input);

  const matchedBanks = (bankAccounts || []).filter((ba) => {
    const normName = normalizePersianText(ba.bankNameFa);
    const normAcc = normalizePersianText(ba.accountNumber || '');
    const tokens = normName.split(' ').concat(normAcc).filter((t) => t.length >= 2);
    return normInput.includes(normName) || tokens.some((t) => normInput.includes(t) && t !== 'بانک');
  });

  const matchedCashBoxes = (cashBoxes || []).filter((cb) => {
    const normTitle = normalizePersianText(cb.titleFa);
    const tokens = normTitle.split(' ').filter((t) => t.length >= 2);
    return normInput.includes(normTitle) || tokens.some((t) => normInput.includes(t) && t !== 'صندوق');
  });

  return { matchedBanks, matchedCashBoxes };
}

/**
 * Preprocessing Intent Parser Layer
 */
export interface IntentParsingResult {
  rawInput: string;
  actionType: 'REGISTRATION' | 'INVOICE' | 'ACCOUNTING' | 'PAYMENT_RECEIPT' | 'REPORT' | 'SEARCH' | 'NAVIGATION' | 'GENERAL';
  domainFocus: 'EXPENSE' | 'SALES' | 'PURCHASE' | 'BANK_CASH' | 'INVENTORY' | 'PARTY' | 'CHEQUE' | 'JOURNAL' | 'GENERAL';
  matchedKeywords: string[];
  extractedAmount: number | null;
  suggestedTab?: string;
  structuredPromptPrefix: string;
  summaryFa: string;
  missingParameters: string[];
}

export function parseUserIntentPreprocess(input: string): IntentParsingResult {
  const rawInput = input.trim();
  const lower = rawInput.toLowerCase();
  const matchedKeywords: string[] = [];
  const missingParameters: string[] = [];

  let actionType: IntentParsingResult['actionType'] = 'GENERAL';

  if (/(فاکتور|صدور فاکتور|فروش بزن|پیش‌فاکتور|خرید بزن)/.test(lower)) {
    actionType = 'INVOICE';
    matchedKeywords.push('فاکتور/معامله');
  } else if (/(سند|سند حسابداری|دفتر روزنامه|بدهکار|بستانکار|موازنه)/.test(lower)) {
    actionType = 'ACCOUNTING';
    matchedKeywords.push('سند حسابداری');
  } else if (/(پرداخت|دریافت|قبض|واریز|برداشت|حواله|کارت به کارت|تسویه)/.test(lower)) {
    actionType = 'PAYMENT_RECEIPT';
    matchedKeywords.push('قبض دریافت/پرداخت');
  } else if (/(ثبت|اضافه|ایجاد|جدید|خرج|هزینه)/.test(lower)) {
    actionType = 'REGISTRATION';
    matchedKeywords.push('ثبت عملیات');
  } else if (/(گزارش|مانده|موجودی|تراز|صورت‌حساب|صورتحساب|سود|آمار|چقدر)/.test(lower)) {
    actionType = 'REPORT';
    matchedKeywords.push('گزارش/استعلام');
  } else if (/(جستجو|پیدا|سرچ|مشاهده|ببین)/.test(lower)) {
    actionType = 'SEARCH';
    matchedKeywords.push('جستجو/یافتن');
  } else if (/(برو|باز کن|صفحه|نمایش|انتقال)/.test(lower)) {
    actionType = 'NAVIGATION';
    matchedKeywords.push('ناوبری/صفحه');
  }

  let domainFocus: IntentParsingResult['domainFocus'] = 'GENERAL';
  let suggestedTab: string | undefined = undefined;

  if (/(هزینه|خرج|خرید برای|پلاستیک|کرایه|اسنپ|ناهار|قبض|شارژ|اجاره|حقوق|پذیرایی)/.test(lower)) {
    domainFocus = 'EXPENSE';
    suggestedTab = 'ACCOUNTING';
    matchedKeywords.push('هزینه');
  } else if (/(فروش|فاکتور فروش|پوز|pos|پیش‌فاکتور|مرجوعی فروش)/.test(lower)) {
    domainFocus = 'SALES';
    suggestedTab = 'SALES';
    matchedKeywords.push('فروش');
  } else if (/(خرید|فاکتور خرید|تدارکات|تأمین‌کننده)/.test(lower)) {
    domainFocus = 'PURCHASE';
    suggestedTab = 'PURCHASES';
    matchedKeywords.push('خرید');
  } else if (/(بانک|صندوق|حساب|نقدینگی|پول|موجودی بانک|موجودی صندوق)/.test(lower)) {
    domainFocus = 'BANK_CASH';
    suggestedTab = 'TREASURY';
    matchedKeywords.push('بانک/صندوق');
  } else if (/(کالا|انبار|کاردکس|موجودی کالا|سریال|مک آدرس|mac)/.test(lower)) {
    domainFocus = 'INVENTORY';
    suggestedTab = 'INVENTORY';
    matchedKeywords.push('انبار/کالا');
  } else if (/(مشتری|شخص|اشخاص|بدهکار|بستانکار|طلب|بدهی)/.test(lower)) {
    domainFocus = 'PARTY';
    suggestedTab = 'PARTIES';
    matchedKeywords.push('اشخاص/مشتری');
  } else if (/(چک|صیادی|سررسید چک|پاس)/.test(lower)) {
    domainFocus = 'CHEQUE';
    suggestedTab = 'TREASURY';
    matchedKeywords.push('چک/خزانه');
  } else if (/(سند|دفتر روزنامه|کدینگ|تراز)/.test(lower)) {
    domainFocus = 'JOURNAL';
    suggestedTab = 'ACCOUNTING';
    matchedKeywords.push('دفترکل/روزنامه');
  }

  const extractedAmount = extractAmountFromPersianText(rawInput);

  if ((actionType === 'INVOICE' || actionType === 'PAYMENT_RECEIPT' || actionType === 'REGISTRATION') && !extractedAmount) {
    missingParameters.push('مبلغ (تومان)');
  }

  let summaryFa = `کلیدواژه‌های مالی: [${matchedKeywords.join(' - ')}]`;
  if (extractedAmount) {
    summaryFa += ` | مبلغ شناسایی‌شده: ${format3Digit(extractedAmount)} تومان`;
  }
  if (missingParameters.length > 0) {
    summaryFa += ` | پارامترهای غایب: [${missingParameters.join(', ')}]`;
  }

  const structuredPromptPrefix = `[پیش‌پردازش حسابدار ارشد - نقش: Senior Accountant | INTENT: ${actionType} | حوزه: ${domainFocus} | کلیدواژه‌ها: ${matchedKeywords.join(
    ','
  )}${extractedAmount ? ` | مبلغ عددی: ${extractedAmount} تومان` : ''}${
    missingParameters.length > 0 ? ` | پارامترهای ناقص: ${missingParameters.join(',')}` : ''
  }]\nدستور کاربر: `;

  return {
    rawInput,
    actionType,
    domainFocus,
    matchedKeywords,
    extractedAmount,
    suggestedTab,
    structuredPromptPrefix,
    summaryFa,
    missingParameters,
  };
}

/**
 * Main Agent Command Processor (Senior Accountant Local Engine with Fuzzy Match)
 */
export function processAgentCommand(
  input: string,
  foundationData: FoundationDataResponse | null
): AgentMessage {
  const rawInput = input.trim();
  const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const msgId = `msg_${Date.now()}`;

  if (!rawInput) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: 'با درود. من **حسابدار ارشد رسمی مهرگان** هستم. چطور می‌توانم در امور مالی، استعلام بدهکار/بستانکار اشخاص، موجودی کالاها، بانک‌ها و صدور اسناد به شما کمک کنم؟',
      timestamp: timeStr,
      intent: 'GENERAL_CHAT',
    };
  }

  const lower = rawInput.toLowerCase();
  const parties = foundationData?.parties || [];
  const items = foundationData?.items || [];
  const bankAccounts = foundationData?.bankAccounts || [];
  const cashBoxes = foundationData?.cashBoxes || [];

  // Fuzzy matches
  const matchedParties = findMatchedParties(rawInput, parties);
  const matchedParty = matchedParties.length > 0 ? matchedParties[0] : null;

  const matchedItems = findMatchedItems(rawInput, items);
  const matchedItem = matchedItems.length > 0 ? matchedItems[0] : null;

  const { matchedBanks, matchedCashBoxes } = findMatchedBanksAndCashBoxes(rawInput, bankAccounts, cashBoxes);

  const amount = extractAmountFromPersianText(rawInput);

  // =========================================================================
  // 1. SPECIFIC PARTY LEDGER QUERY (استعلام بدهکاری/بستانکاری شخص)
  // =========================================================================
  const isPartyQuery =
    matchedParties.length > 0 &&
    (lower.includes('بدهکار') ||
      lower.includes('بستانکار') ||
      lower.includes('وضعیت') ||
      lower.includes('حساب') ||
      lower.includes('صورتحساب') ||
      lower.includes('بدهی') ||
      lower.includes('طلب') ||
      lower.includes('مانده') ||
      lower.includes('چقدر') ||
      lower.includes('شخص') ||
      matchedParties.length === 1);

  if (isPartyQuery && !amount) {
    if (matchedParties.length === 1) {
      const p = matchedParties[0];
      const bal = Number(p.transactionsSummary?.netBalanceIrr || 0);

      let statusBadge = 'تسویه کامل';
      let statusDesc = 'دارای مانده حساب صفر بوده و کاملاً تسویه است (بی‌حساب)';
      let amtFormatted = '۰ تومان';

      if (bal < 0) {
        statusBadge = 'بدهکار';
        amtFormatted = `${format3Digit(Math.abs(bal))} تومان`;
        statusDesc = `به مبلغ **${amtFormatted} بدهکار است** (بدهی به مجموعه شما)`;
      } else if (bal > 0) {
        statusBadge = 'بستانکار';
        amtFormatted = `${format3Digit(bal)} تومان`;
        statusDesc = `به مبلغ **${amtFormatted} بستانکار است** (طلبکار از مجموعه شما)`;
      }

      return {
        id: msgId,
        sender: 'AGENT',
        text: `گزارش حسابدار ارشد بر اساس دفتر معین اشخاص:\n\nطرف تجاری **«${p.fullName}»** (کد معین: \`${p.partyCode}\` | همراه: \`${
          p.mobile || '-'
        }\`) ${statusDesc}.`,
        timestamp: timeStr,
        intent: 'QUERY_PARTY_LEDGER',
        cardAction: {
          type: 'PARTY_LEDGER',
          title: 'مشاهده کامل گردش حساب در دفتر معین',
          navigateTab: 'PARTIES',
          partyId: p.id,
        },
        reportData: {
          type: 'PARTY',
          title: `صورتحساب معین ${p.fullName}`,
          items: [
            { label: 'نام و نام خانوادگی', value: p.fullName },
            { label: 'کد معین حسابداری', value: p.partyCode },
            { label: 'شماره همراه', value: p.mobile || '-' },
            { label: 'وضعیت بدهکار/بستانکار', value: `${statusBadge}: ${amtFormatted}`, badge: statusBadge },
            { label: 'جمع فروش ثبت‌شده', value: `${format3Digit(p.transactionsSummary?.totalSalesIrr || 0)} تومان` },
            { label: 'جمع دریافتی‌های ثبت‌شده', value: `${format3Digit(p.transactionsSummary?.totalReceiptsIrr || 0)} تومان` },
            { label: 'مانده نهایی حساب', value: `${amtFormatted} (${statusBadge})`, badge: statusBadge },
          ],
        },
      };
    } else {
      // Multiple matched parties
      const reportItems = matchedParties.slice(0, 5).map((p) => {
        const bal = Number(p.transactionsSummary?.netBalanceIrr || 0);
        const bBadge = bal < 0 ? 'بدهکار' : bal > 0 ? 'طلبکار' : 'تسویه';
        const bVal = bal < 0 ? `${format3Digit(Math.abs(bal))} تومان بدهکار` : bal > 0 ? `${format3Digit(bal)} تومان بستانکار` : 'تسویه (۰)';
        return {
          label: `${p.fullName} (کد: ${p.partyCode})`,
          value: bVal,
          badge: bBadge,
        };
      });

      return {
        id: msgId,
        sender: 'AGENT',
        text: `تعداد **${matchedParties.length} طرف حساب** متناسب با جستجوی شما یافت گردید. وضعیت حساب‌ها:`,
        timestamp: timeStr,
        intent: 'QUERY_PARTY_LEDGER',
        cardAction: {
          type: 'NAVIGATE',
          title: 'ورود به فهرست کامل اشخاص',
          navigateTab: 'PARTIES',
        },
        reportData: {
          type: 'PARTY',
          title: 'نتایج جستجوی اشخاص',
          items: reportItems,
        },
      };
    }
  }

  // =========================================================================
  // 2. SPECIFIC INVENTORY ITEM QUERY (استعلام موجودی کالا - حتی با اسم ناقص)
  // =========================================================================
  const isInventoryQuery =
    (lower.includes('موجودی') ||
      lower.includes('کالا') ||
      lower.includes('انبار') ||
      lower.includes('کاردکس') ||
      lower.includes('چند تا') ||
      lower.includes('چقدر داریم') ||
      matchedItems.length > 0) &&
    !amount;

  if (isInventoryQuery) {
    const itemsToReport = matchedItems.length > 0 ? matchedItems.slice(0, 5) : items.slice(0, 5);

    if (itemsToReport.length > 0) {
      const itemSummaries = itemsToReport.map((it) => {
        const qty = Number(it.totalStock || 0);
        const badge = qty > 0 ? 'موجود' : 'اتمام موجودی';
        return `📦 **«${it.titleFa}»** (کد: \`${it.itemCode}\` | مدل: \`${it.model || '-'}\`):\n  👈 موجودی فعلی: **${format3Digit(
          qty
        )} ${it.unitNameFa || 'عدد'}** (${badge === 'موجود' ? '🟢 موجود در انبار' : '🔴 اتمام موجودی'})`;
      });

      const reportItems = itemsToReport.map((it) => {
        const qty = Number(it.totalStock || 0);
        return {
          label: `${it.titleFa} (کد: ${it.itemCode})`,
          value: `${format3Digit(qty)} ${it.unitNameFa || 'عدد'}`,
          badge: qty > 0 ? 'موجود' : 'اتمام موجودی',
        };
      });

      return {
        id: msgId,
        sender: 'AGENT',
        text: `استعلام کاردکس موجودی کالا در انبار مهرگان:\n\n${itemSummaries.join('\n\n')}`,
        timestamp: timeStr,
        intent: 'QUERY_INVENTORY',
        cardAction: {
          type: 'NAVIGATE',
          title: 'مشاهده کامل کاردکس و انبار',
          navigateTab: 'INVENTORY',
        },
        reportData: {
          type: 'INVENTORY',
          title: 'گزارش استعلام موجودی کالا',
          items: reportItems,
        },
      };
    }
  }

  // =========================================================================
  // 3. BANK & CASHBALANCES SPECIFIC QUERY (استعلام بانک خاص یا صندوق)
  // =========================================================================
  const isBankQuery =
    lower.includes('بانک') ||
    lower.includes('صندوق') ||
    lower.includes('نقدینگی') ||
    lower.includes('پول') ||
    lower.includes('موجودی') ||
    lower.includes('چقدر داریم') ||
    lower.includes('چند تومان') ||
    matchedBanks.length > 0 ||
    matchedCashBoxes.length > 0;

  if (isBankQuery && !amount) {
    if (matchedBanks.length === 1 && matchedCashBoxes.length === 0) {
      const ba = matchedBanks[0];
      const bal = Number(ba.balanceIrr || 0);
      return {
        id: msgId,
        sender: 'AGENT',
        text: `استعلام حساب بانکی از دفتر کل:\n\n🏦 **«${ba.bankNameFa}»** (شماره حساب: \`${ba.accountNumber}\`):\nمانده فعلی نقدینگی: **${format3Digit(
          bal
        )} تومان**`,
        timestamp: timeStr,
        intent: 'QUERY_BANK_BALANCES',
        cardAction: {
          type: 'NAVIGATE',
          title: 'ورود به دفتر عملیات پرداخت و دریافت',
          navigateTab: 'TREASURY',
        },
        reportData: {
          type: 'BANK',
          title: `گزارش موجودی ${ba.bankNameFa}`,
          items: [
            { label: 'نام بانک', value: ba.bankNameFa },
            { label: 'شماره حساب', value: ba.accountNumber },
            { label: 'وضعیت حساب', value: ba.status === 'ACTIVE' ? 'فعال' : 'غیرفعال', badge: 'فعال' },
            { label: 'مانده موجودی نقد', value: `${format3Digit(bal)} تومان`, badge: 'حساب بانکی' },
          ],
        },
      };
    }

    if (matchedCashBoxes.length === 1 && matchedBanks.length === 0) {
      const cb = matchedCashBoxes[0];
      const bal = Number(cb.balanceIrr || 0);
      return {
        id: msgId,
        sender: 'AGENT',
        text: `استعلام موجودی صندوق از دفتر کل:\n\n💵 **«${cb.titleFa}»** (کد صندوق: \`${cb.boxCode}\`):\nمانده نهایی صندوق: **${format3Digit(
          bal
        )} تومان**`,
        timestamp: timeStr,
        intent: 'QUERY_BANK_BALANCES',
        cardAction: {
          type: 'NAVIGATE',
          title: 'ورود به دفتر عملیات پرداخت و دریافت',
          navigateTab: 'TREASURY',
        },
        reportData: {
          type: 'BANK',
          title: `گزارش موجودی ${cb.titleFa}`,
          items: [
            { label: 'عنوان صندوق', value: cb.titleFa },
            { label: 'کد صندوق', value: cb.boxCode },
            { label: 'مانده نقدینگی', value: `${format3Digit(bal)} تومان`, badge: 'صندوق' },
          ],
        },
      };
    }

    // Comprehensive liquidity breakdown: Cash Boxes + Bank Accounts + Grand Total
    let totalCashBoxesIrr = 0;
    let totalBankAccountsIrr = 0;

    const cashLines = cashBoxes.map((cb) => {
      const bal = Number(cb.balanceIrr || 0);
      totalCashBoxesIrr += bal;
      return `- 💵 **«${cb.titleFa}»**: **${format3Digit(bal)} تومان**`;
    });

    const bankLines = bankAccounts.map((ba) => {
      const bal = Number(ba.balanceIrr || 0);
      totalBankAccountsIrr += bal;
      return `- 🏦 **«${ba.bankNameFa}»** (${ba.accountNumber}): **${format3Digit(bal)} تومان**`;
    });

    const grandTotalIrr = totalCashBoxesIrr + totalBankAccountsIrr;

    const reportItems: { label: string; value: string; badge?: string }[] = [];

    cashBoxes.forEach((cb) => {
      const bal = Number(cb.balanceIrr || 0);
      reportItems.push({
        label: `صندوق: ${cb.titleFa}`,
        value: `${format3Digit(bal)} تومان`,
        badge: 'صندوق',
      });
    });
    reportItems.push({
      label: '🔹 جمع کل موجودی صندوق‌ها',
      value: `${format3Digit(totalCashBoxesIrr)} تومان`,
      badge: 'جمع صندوق‌ها',
    });

    bankAccounts.forEach((ba) => {
      const bal = Number(ba.balanceIrr || 0);
      reportItems.push({
        label: `بانک: ${ba.bankNameFa} (${ba.accountNumber})`,
        value: `${format3Digit(bal)} تومان`,
        badge: 'حساب بانکی',
      });
    });
    reportItems.push({
      label: '🔹 جمع کل موجودی بانک‌ها',
      value: `${format3Digit(totalBankAccountsIrr)} تومان`,
      badge: 'جمع بانک‌ها',
    });

    reportItems.push({
      label: '⭐️ مجموع کل نقدینگی (صندوق + بانک)',
      value: `${format3Digit(grandTotalIrr)} تومان`,
      badge: 'کل نقدینگی',
    });

    const textResponse =
      `گزارش تفکیکی نقدینگی و موجودی وجوه از دفتر کل خزانه مهرگان:\n\n` +
      `💵 **۱. موجودی صندوق‌های نقدی:**\n${
        cashLines.length > 0 ? cashLines.join('\n') : '- صندوقی ثبت نشده'
      }\n` +
      `📌 **جمع کل صندوق‌ها:** **${format3Digit(totalCashBoxesIrr)} تومان**\n\n` +
      `🏦 **۲. موجودی حساب‌های بانکی:**\n${
        bankLines.length > 0 ? bankLines.join('\n') : '- حساب بانکی ثبت نشده'
      }\n` +
      `📌 **جمع کل بانک‌ها:** **${format3Digit(totalBankAccountsIrr)} تومان**\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⭐️ **مجموع کل نقدینگی دسترس (صندوق‌ها + بانک‌ها):**\n` +
      `💰 **${format3Digit(grandTotalIrr)} تومان** (معادل \`${(
        grandTotalIrr * 10
      ).toLocaleString('fa-IR')}\` ریال)`;

    return {
      id: msgId,
      sender: 'AGENT',
      text: textResponse,
      timestamp: timeStr,
      intent: 'QUERY_BANK_BALANCES',
      cardAction: {
        type: 'NAVIGATE',
        title: 'ورود به دفتر عملیات پرداخت و دریافت',
        navigateTab: 'TREASURY',
      },
      reportData: {
        type: 'BANK',
        title: 'گزارش نقدینگی به تفکیک بانک و صندوق',
        items: reportItems,
      },
    };
  }

  // =========================================================================
  // 4. PROBING / CLARIFICATION CHECK FOR AMBIGUOUS COMMANDS
  // =========================================================================
  if (
    (lower.includes('فاکتور') || lower.includes('صدور فاکتور') || lower.includes('فروش')) &&
    !amount &&
    !matchedItem
  ) {
    const partyName = matchedParty ? matchedParty.fullName : 'طرف حساب نامشخص';
    return {
      id: msgId,
      sender: 'AGENT',
      text: `جناب مدیر، دستور صدور فاکتور برای **«${partyName}»** دریافت شد. اما اقلام، تعداد و مبلغ معامله مشخص نشده است.\nجهت صدور دقیق فاکتور، لطفاً یکی از گزینه‌های زیر را انتخاب نمایید:`,
      timestamp: timeStr,
      intent: 'NEED_CLARIFICATION',
      cardAction: {
        type: 'CLARIFICATION',
        title: 'استعلام اطلاعات مکمل فاکتور',
        clarificationPayload: {
          questionFa: `اقلام و مبلغ فاکتور برای ${partyName} مشخص نشده است.`,
          missingField: 'اقلام و مبلغ فاکتور',
          suggestedOptions: [
            {
              label: 'ورود به فرم فاکتور فروش و انتخاب کالاها',
              actionPrompt: 'ورود به فاکتور فروش',
            },
            {
              label: 'صدور فاکتور با مبلغ کلی ۱ میلیون تومان',
              actionPrompt: `فاکتور فروش برای ${partyName} به مبلغ ۱ میلیون تومان`,
            },
            {
              label: 'صدور پیش‌فاکتور رسمی',
              actionPrompt: `صدور پیش‌فاکتور برای ${partyName}`,
            },
          ],
        },
      },
    };
  }

  if (
    (lower.includes('پرداخت') || lower.includes('واریز') || lower.includes('دریافت')) &&
    !amount &&
    !lower.includes('گزارش') &&
    !lower.includes('موجودی')
  ) {
    const partyName = matchedParty ? matchedParty.fullName : 'طرف حساب';
    return {
      id: msgId,
      sender: 'AGENT',
      text: `دستور پرداخت/دریافت وجه مربوط به **«${partyName}»** ناقص است (مبلغ و حساب مبدأ/مقصد مشخص نیست).\nلطفاً یکی از گزینه‌های زیر را انتخاب فرمایید:`,
      timestamp: timeStr,
      intent: 'NEED_CLARIFICATION',
      cardAction: {
        type: 'CLARIFICATION',
        title: 'تکمیل اطلاعات قبض پرداخت/دریافت',
        clarificationPayload: {
          questionFa: 'مبلغ و محل واریز/برداشت مشخص نگردیده است.',
          missingField: 'مبلغ و حساب بانکی',
          suggestedOptions: [
            {
              label: 'پرداخت ۵۰۰ هزار تومان از بانک اصلی',
              actionPrompt: `پرداخت ۵۰۰ هزار تومان به ${partyName} از بانک`,
            },
            {
              label: 'دریافت ۱ میلیون تومان نقد به صندوق',
              actionPrompt: `دریافت ۱ میلیون تومان از ${partyName} به صندوق`,
            },
            {
              label: 'ورود به بخش خزانه و تسویه سریع',
              actionPrompt: 'ورود به خزانه',
            },
          ],
        },
      },
    };
  }

  // =========================================================================
  // 5. SMART INVOICE ISSUANCE INTENT (صدور فاکتور فروش / خرید)
  // =========================================================================
  if (
    (lower.includes('فاکتور') || lower.includes('فروش') || lower.includes('خرید')) &&
    amount &&
    amount > 0 &&
    !lower.includes('هزینه')
  ) {
    const isPurchase = lower.includes('خرید');
    const partyName = matchedParty ? matchedParty.fullName : isPurchase ? 'تأمین‌کننده عمومی' : 'مشتری عمومی (نقدی)';
    const partyId = matchedParty ? matchedParty.id : 1;
    const itemTitle = matchedItem ? matchedItem.titleFa : 'کالا / خدمات عمومی';
    const itemId = matchedItem ? matchedItem.id : 1;

    const formattedAmt = format3Digit(amount);

    return {
      id: msgId,
      sender: 'AGENT',
      text: `اینجانب به عنوان حسابدار ارشد، **پیش‌نمایش ${isPurchase ? 'فاکتور خرید' : 'فاکتور فروش'}** را بر اساس استاندارد مالی مهرگان تنظیم نمودم.\nاطلاعات طرف حساب، اثر مالی بدهکار/بستانکار و جزئیات سند در کارت زیر آماده تایید نهایی شماست:`,
      timestamp: timeStr,
      intent: 'ACTION_CREATE_INVOICE',
      cardAction: {
        type: 'INVOICE_CONFIRMATION',
        title: `تایید صدور ${isPurchase ? 'فاکتور خرید' : 'فاکتور فروش'} رسمی`,
        invoicePayload: {
          type: isPurchase ? 'PURCHASE' : 'SALES',
          partyId,
          partyName,
          items: [
            {
              itemId,
              title: itemTitle,
              quantity: 1,
              unitPrice: amount,
              totalPrice: amount,
            },
          ],
          totalAmount: amount,
          totalAmountFormatted: formattedAmt,
          warehouseId: 1,
          warehouseTitle: 'انبار مرکزی فروشگاه',
          dateJalali: getCurrentJalaliDate(),
        },
      },
    };
  }

  // =========================================================================
  // 6. AUTOMATED JOURNAL VOUCHER INTENT (سند حسابداری دوطرفه)
  // =========================================================================
  if (
    (lower.includes('سند حسابداری') || lower.includes('ثبت سند') || lower.includes('دفتر روزنامه')) &&
    amount &&
    amount > 0
  ) {
    const formattedAmt = format3Digit(amount);
    const partyName = matchedParty ? matchedParty.fullName : 'طرف حساب';

    const entries: JournalVoucherEntryPreview[] = [
      {
        accountCode: '1102',
        accountTitle: 'حساب‌های دریافتنی / طرف تجاری ' + partyName,
        debitIrr: amount,
        creditIrr: 0,
      },
      {
        accountCode: '4101',
        accountTitle: 'درآمد حاصل از ارائه خدمات / فروش',
        debitIrr: 0,
        creditIrr: amount,
      },
    ];

    return {
      id: msgId,
      sender: 'AGENT',
      text: `سند حسابداری دوطرفه موازنه شده به مبلغ **${formattedAmt} تومان** تنظیم گردید. کدینگ حساب‌ها بر اساس دفترکل صادر شده است:`,
      timestamp: timeStr,
      intent: 'ACTION_CREATE_JOURNAL_VOUCHER',
      cardAction: {
        type: 'JOURNAL_VOUCHER_CONFIRMATION',
        title: 'تایید ثبت سند حسابداری در دفتر روزنامه',
        journalVoucherPayload: {
          description: `سند حسابداری خودکار صادرشده توسط ایجنت - ${rawInput}`,
          dateJalali: getCurrentJalaliDate(),
          entries,
          totalAmountFormatted: formattedAmt,
        },
      },
    };
  }

  // =========================================================================
  // 7. PAYMENTS & RECEIPTS VOUCHER INTENT (قبوض دریافت و پرداخت خزانه)
  // =========================================================================
  if (
    (lower.includes('پرداخت') || lower.includes('دریافت') || lower.includes('واریز') || lower.includes('قبض')) &&
    amount &&
    amount > 0
  ) {
    const isPayment = lower.includes('پرداخت') || lower.includes('واریز به') || lower.includes('برداشت');
    const partyName = matchedParty ? matchedParty.fullName : isPayment ? 'تأمین‌کننده / شخص' : 'مشتری / بدهکار';
    const formattedAmt = format3Digit(amount);

    const defaultBank = bankAccounts[0];
    const defaultCash = cashBoxes[0];
    const sourceTargetTitle = lower.includes('بانک')
      ? defaultBank?.bankNameFa || 'حساب بانکی اصلی'
      : defaultCash?.titleFa || 'صندوق اصلی فروشگاه';

    return {
      id: msgId,
      sender: 'AGENT',
      text: `پیش‌نمایش **قبض ${isPayment ? 'پرداخت وجه' : 'دریافت وجه'}** بر اساس حساب **${sourceTargetTitle}** آماده ثبت گردید:`,
      timestamp: timeStr,
      intent: 'ACTION_CREATE_PAYMENT_RECEIPT',
      cardAction: {
        type: 'PAYMENT_RECEIPT_CONFIRMATION',
        title: `تایید و صدور قبض ${isPayment ? 'پرداخت' : 'دریافت'} خزانه`,
        paymentReceiptPayload: {
          type: isPayment ? 'PAYMENT' : 'RECEIPT',
          partyId: matchedParty?.id || 1,
          partyName,
          sourceTargetTitle,
          amount,
          amountFormatted: formattedAmt,
          paymentMethod: lower.includes('بانک') ? 'BANK' : 'CASH',
          bankAccountId: defaultBank?.id || 1,
          cashBoxId: defaultCash?.id || 1,
          dateJalali: getCurrentJalaliDate(),
        },
      },
    };
  }

  // =========================================================================
  // 8. OPERATIONAL EXPENSE CREATION INTENT (ثبت هزینه جاری)
  // =========================================================================
  const expenseKeywords = [
    'هزینه', 'خرج', 'خرید برای', 'پلاستیک', 'کیسه', 'کرایه', 'تاکسی', 'اسنپ',
    'پیک', 'ناهار', 'شام', 'قبض', 'آب', 'برق', 'گاز', 'تلفن', 'شارژ', 'اجاره', 'تعمیر',
    'تعمیرات', 'بنزین', 'لوازم', 'ملزومات', 'پذیرایی', 'چسب', 'کاغذ', 'شوینده', 'حقوق',
    'پاداش', 'کارمزد'
  ];
  const hasExpenseContext = expenseKeywords.some((kw) => lower.includes(kw));

  if (amount && amount > 0 && (hasExpenseContext || amount >= 1000)) {
    let title = rawInput
      .replace(/(ثبت|کن|اضافه|کنید|شد|شدند|بود|هزینه|خريد|خرید|مبلغ|تومان|تومن|ریال|\d+|هزار|میلیون|میلیارد|k|m)/gi, '')
      .replace(/[^\u0600-\u06FF\s]/g, '')
      .trim();
    if (!title || title.length < 2) {
      title = 'هزینه جاری و عملیاتی';
    } else {
      if (!title.startsWith('هزینه')) {
        title = `هزینه ${title}`;
      }
    }

    const defaultCashBox = cashBoxes[0];
    const cashBoxTitle = defaultCashBox?.titleFa || 'صندوق اصلی فروشگاه';
    const cashBoxId = defaultCashBox?.id || 1;
    const formattedAmt = format3Digit(amount);

    return {
      id: msgId,
      sender: 'AGENT',
      text: `پیش‌نمایش **سند ثبت هزینه جاری** به مبلغ **${formattedAmt} تومان** تنظیم شد. کد حساب: \`8101-هزینه‌های عمومی و اداری\`.\nلطفاً فاکتور و مشخصات زیر را تایید بفرمایید:`,
      timestamp: timeStr,
      intent: 'ACTION_CREATE_EXPENSE',
      cardAction: {
        type: 'EXPENSE_CONFIRMATION',
        title: 'تایید و صدور سند هزینه',
        expensePayload: {
          title,
          amount,
          amountFormatted: formattedAmt,
          category: 'هزینه‌های جاری و اداری',
          cashBoxId,
          cashBoxTitle,
          dateJalali: getCurrentJalaliDate(),
        },
      },
    };
  }

  // =========================================================================
  // 9. CHEQUE QUERY INTENT (چک‌های صیادی و خزانه)
  // =========================================================================
  if (
    lower.includes('چک') ||
    lower.includes('سررسید چک') ||
    lower.includes('چک صیادی')
  ) {
    const cheques = foundationData?.cheques || [];
    let pendingCount = 0;
    let pendingAmount = 0;

    cheques.forEach((c) => {
      if (c.status === 'IN_HAND' || c.status === 'DEPOSITED') {
        pendingCount++;
        pendingAmount += Number(c.amountIrr || 0);
      }
    });

    return {
      id: msgId,
      sender: 'AGENT',
      text: `گزارش اسناد دریافتنی / چک‌های صیادی: تعداد **${pendingCount} فقره چک** در جریان رسیدگی به ارزش کل **${format3Digit(
        pendingAmount
      )} تومان** ثبت شده است.`,
      timestamp: timeStr,
      intent: 'QUERY_CHEQUES',
      cardAction: {
        type: 'NAVIGATE',
        title: 'مدیریت چک‌های صیادی و اعلام وصول',
        navigateTab: 'TREASURY',
      },
    };
  }

  // =========================================================================
  // 10. SYSTEM NAVIGATION INTENTS (باز کردن فرم‌ها و ناوبری مستقیم به تب‌ها)
  // =========================================================================
  const isNavRequest = lower.includes('بیار') || lower.includes('باز کن') || lower.includes('نمایش بده') || lower.includes('برو به') || lower.includes('فرم') || lower.includes('کارتابل');

  if (isNavRequest && (lower.includes('فروش') || lower.includes('فاکتور فروش') || lower.includes('پوز') || lower.includes('pos'))) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: '✅ **فرم فاکتور فروش و صندوق سریع POS باز گردید.**',
      timestamp: timeStr,
      intent: 'ACTION_NAVIGATE',
      cardAction: { type: 'NAVIGATE', title: 'مشاهده و صدور فاکتور فروش', navigateTab: 'SALES' },
    };
  }

  if (isNavRequest && (lower.includes('خرید') || lower.includes('فاکتور خرید'))) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: '✅ **فرم فاکتورهای خرید و تامین‌کنندگان باز گردید.**',
      timestamp: timeStr,
      intent: 'ACTION_NAVIGATE',
      cardAction: { type: 'NAVIGATE', title: 'مشاهده فاکتورهای خرید', navigateTab: 'PURCHASES' },
    };
  }

  if (isNavRequest && (lower.includes('پرداخت') || lower.includes('دریافت') || lower.includes('خزانه') || lower.includes('قبض'))) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: '✅ **فرم عملیات دریافت، پرداخت و خزانه باز گردید.**',
      timestamp: timeStr,
      intent: 'ACTION_NAVIGATE',
      cardAction: { type: 'NAVIGATE', title: 'مشاهده دریافت و پرداخت خزانه', navigateTab: 'TREASURY' },
    };
  }

  if (isNavRequest && (lower.includes('انبار') || lower.includes('کالا') || lower.includes('کاردکس'))) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: '✅ **بخش مدیریت کالاها و کاردکس انبار باز گردید.**',
      timestamp: timeStr,
      intent: 'ACTION_NAVIGATE',
      cardAction: { type: 'NAVIGATE', title: 'مشاهده انباردار و کالاها', navigateTab: 'INVENTORY' },
    };
  }

  if (isNavRequest && (lower.includes('پروژه') || lower.includes('نصاب') || lower.includes('کارتابل'))) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: '✅ **کارتابل پروژه‌ها، سفارشات نصب و تکنسین‌ها باز گردید.**',
      timestamp: timeStr,
      intent: 'ACTION_NAVIGATE',
      cardAction: { type: 'NAVIGATE', title: 'مشاهده کارتابل پروژه‌ها و نصابان', navigateTab: 'INSTALLATION' },
    };
  }

  if (isNavRequest && (lower.includes('اشخاص') || lower.includes('مشتری') || lower.includes('دفتر معین'))) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: '✅ **بخش مدیریت اشخاص و طرف‌های تجاری باز گردید.**',
      timestamp: timeStr,
      intent: 'ACTION_NAVIGATE',
      cardAction: { type: 'NAVIGATE', title: 'مشاهده لیست اشخاص', navigateTab: 'PARTIES' },
    };
  }

  if (isNavRequest && (lower.includes('حسابداری') || lower.includes('تراز') || lower.includes('سند') || lower.includes('کدینگ'))) {
    return {
      id: msgId,
      sender: 'AGENT',
      text: '✅ **بخش اسناد حسابداری، ترازنامه و دفتر روزنامه باز گردید.**',
      timestamp: timeStr,
      intent: 'ACTION_NAVIGATE',
      cardAction: { type: 'NAVIGATE', title: 'مشاهده اسناد و دفتر روزنامه', navigateTab: 'ACCOUNTING' },
    };
  }

  // Fallback Knowledge Search
  const matchedKnowledge = queryKnowledgeBase(rawInput);
  if (matchedKnowledge.length > 0) {
    const topItem = matchedKnowledge[0];
    return {
      id: msgId,
      sender: 'AGENT',
      text: `پاسخ تخصصی حسابداری درباره **«${topItem.titleFa}»**:\n\n${topItem.summaryFa}`,
      timestamp: timeStr,
      intent: 'GUIDE_HELP',
      knowledgeItems: matchedKnowledge,
      cardAction: topItem.suggestedTab
        ? {
            type: 'NAVIGATE',
            title: `ورود به بخش ${topItem.titleFa}`,
            navigateTab: topItem.suggestedTab,
          }
        : undefined,
    };
  }

  // Probing Fallback Options
  return {
    id: msgId,
    sender: 'AGENT',
    text: `درخواست شما دریافت گردید: «${rawInput}».\nبه عنوان حسابدار ارشد، جهت اجرای دقیق عملیات مالی، لطفاً یکی از دستورات زیر را انتخاب فرمایید:`,
    timestamp: timeStr,
    intent: 'NEED_CLARIFICATION',
    cardAction: {
      type: 'CLARIFICATION',
      title: 'راهنمایی عملیات‌های مالی مجاز',
      clarificationPayload: {
        questionFa: 'چه نوع عملیات یا گزارشی مد نظر شماست؟',
        missingField: 'نوع عملیات',
        suggestedOptions: [
          {
            label: 'استعلام بدهکار/بستانکار بودن یک شخص',
            actionPrompt: 'رضایی بدهکاره یا بستانکار؟',
          },
          {
            label: 'استعلام موجودی یک کالا در انبار',
            actionPrompt: 'موجودی کالا رو بگو',
          },
          {
            label: 'استعلام موجودی یک بانک خاص یا صندوق',
            actionPrompt: 'موجودی بانک ملی چقدره؟',
          },
          {
            label: 'ثبت هزینه جاری جدید',
            actionPrompt: '100 هزار تومان هزینه خرید ملزومات',
          },
        ],
      },
    },
  };
}

/**
 * Async Online Agent Command Processor (Gemini AI + Senior Accountant Persona)
 */
export async function processAgentCommandOnline(
  input: string,
  foundationData: FoundationDataResponse | null
): Promise<AgentMessage> {
  const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const msgId = `msg_${Date.now()}`;

  const preprocessed = parseUserIntentPreprocess(input);

  try {
    const summary = {
      cashBoxes: foundationData?.cashBoxes?.map((c) => ({ id: c.id, title: c.titleFa, boxCode: c.boxCode, balance: c.balanceIrr })),
      bankAccounts: foundationData?.bankAccounts?.map((b) => ({ id: b.id, name: b.bankNameFa, accountNumber: b.accountNumber, balance: b.balanceIrr })),
      totalItemsCount: foundationData?.items?.length || 0,
      allItems: foundationData?.items?.map((i) => ({ code: i.itemCode, title: i.titleFa, model: i.model, stock: i.totalStock, unit: i.unitNameFa })),
      partiesCount: foundationData?.parties?.length || 0,
      allParties: foundationData?.parties?.map((p) => ({
        id: p.id,
        code: p.partyCode,
        name: p.fullName,
        mobile: p.mobile,
        netBalanceIrr: p.transactionsSummary?.netBalanceIrr || 0,
        salesIrr: p.transactionsSummary?.totalSalesIrr || 0,
        receiptsIrr: p.transactionsSummary?.totalReceiptsIrr || 0,
      })),
      intentSummaryFa: preprocessed.summaryFa,
    };

    const promptWithIntentPrefix = `${preprocessed.structuredPromptPrefix}${input}`;

    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: promptWithIntentPrefix, foundationDataSummary: summary }),
    });

    const data = await response.json();

    if (data.ok && data.mode === 'GEMINI_AI' && data.aiResult) {
      const res = data.aiResult;
      let cardAction: any = undefined;
      let reportData: any = undefined;

      // Extract fuzzy report if AI query
      const matchedParties = findMatchedParties(input, foundationData?.parties || []);
      const matchedItems = findMatchedItems(input, foundationData?.items || []);
      const { matchedBanks, matchedCashBoxes } = findMatchedBanksAndCashBoxes(
        input,
        foundationData?.bankAccounts || [],
        foundationData?.cashBoxes || []
      );

      if (res.intent === 'QUERY_PARTY_LEDGER' && matchedParties.length > 0) {
        const p = matchedParties[0];
        const bal = Number(p.transactionsSummary?.netBalanceIrr || 0);
        const statusBadge = bal < 0 ? 'بدهکار' : bal > 0 ? 'طلبکار' : 'تسویه';
        const amtFormatted = `${format3Digit(Math.abs(bal))} تومان`;

        cardAction = {
          type: 'PARTY_LEDGER',
          title: 'مشاهده صورتحساب در دفتر معین',
          navigateTab: 'PARTIES',
          partyId: p.id,
        };

        reportData = {
          type: 'PARTY',
          title: `صورتحساب معین ${p.fullName}`,
          items: [
            { label: 'نام طرف تجاری', value: p.fullName },
            { label: 'کد معین حسابداری', value: p.partyCode },
            { label: 'شماره همراه', value: p.mobile || '-' },
            { label: 'وضعیت بدهکار/بستانکار', value: `${statusBadge}: ${amtFormatted}`, badge: statusBadge },
            { label: 'مانده نهایی حساب', value: `${amtFormatted} (${statusBadge})`, badge: statusBadge },
          ],
        };
      } else if (res.intent === 'QUERY_INVENTORY' && matchedItems.length > 0) {
        const itemsToReport = matchedItems.slice(0, 5);
        reportData = {
          type: 'INVENTORY',
          title: 'گزارش استعلام موجودی کالا',
          items: itemsToReport.map((it) => ({
            label: `${it.titleFa} (کد: ${it.itemCode})`,
            value: `${format3Digit(it.totalStock || 0)} ${it.unitNameFa || 'عدد'}`,
            badge: (it.totalStock || 0) > 0 ? 'موجود' : 'اتمام موجودی',
          })),
        };
        cardAction = { type: 'NAVIGATE', title: 'مشاهده کامل انبار', navigateTab: 'INVENTORY' };
      } else if (res.intent === 'QUERY_BANK_BALANCES' && (matchedBanks.length > 0 || matchedCashBoxes.length > 0)) {
        if (matchedBanks.length > 0) {
          const ba = matchedBanks[0];
          reportData = {
            type: 'BANK',
            title: `گزارش موجودی ${ba.bankNameFa}`,
            items: [
              { label: 'نام بانک', value: ba.bankNameFa },
              { label: 'شماره حساب', value: ba.accountNumber },
              { label: 'مانده موجودی نقد', value: `${format3Digit(ba.balanceIrr)} تومان`, badge: 'حساب بانکی' },
            ],
          };
        } else if (matchedCashBoxes.length > 0) {
          const cb = matchedCashBoxes[0];
          reportData = {
            type: 'BANK',
            title: `گزارش موجودی ${cb.titleFa}`,
            items: [
              { label: 'عنوان صندوق', value: cb.titleFa },
              { label: 'کد صندوق', value: cb.boxCode },
              { label: 'مانده نقدینگی', value: `${format3Digit(cb.balanceIrr)} تومان`, badge: 'صندوق' },
            ],
          };
        }
      } else if (res.intent === 'NEED_CLARIFICATION' && res.clarificationPayload) {
        cardAction = {
          type: 'CLARIFICATION',
          title: 'استعلام اطلاعات مکمل',
          clarificationPayload: res.clarificationPayload,
        };
      } else if (res.intent === 'ACTION_CREATE_EXPENSE' && res.expensePayload) {
        const amt = Number(res.expensePayload.amount || 0);
        const formattedAmt = format3Digit(amt);
        const defaultCashBox = foundationData?.cashBoxes?.[0];

        cardAction = {
          type: 'EXPENSE_CONFIRMATION',
          title: 'تایید و صدور سند هزینه',
          expensePayload: {
            title: res.expensePayload.title || 'هزینه عملیاتی',
            amount: amt,
            amountFormatted: formattedAmt,
            category: res.expensePayload.category || 'هزینه‌های جاری و اداری',
            cashBoxId: defaultCashBox?.id || 1,
            cashBoxTitle: defaultCashBox?.titleFa || 'صندوق اصلی فروشگاه',
            dateJalali: getCurrentJalaliDate(),
          },
        };
      } else if (res.intent === 'ACTION_CREATE_INVOICE' && res.invoicePayload) {
        const amt = Number(res.invoicePayload.totalAmount || 0);
        cardAction = {
          type: 'INVOICE_CONFIRMATION',
          title: `تایید صدور ${res.invoicePayload.type === 'PURCHASE' ? 'فاکتور خرید' : 'فاکتور فروش'}`,
          invoicePayload: {
            ...res.invoicePayload,
            totalAmountFormatted: format3Digit(amt),
            dateJalali: getCurrentJalaliDate(),
          },
        };
      } else if (res.intent === 'ACTION_CREATE_JOURNAL_VOUCHER' && res.journalVoucherPayload) {
        cardAction = {
          type: 'JOURNAL_VOUCHER_CONFIRMATION',
          title: 'تایید ثبت سند حسابداری در دفتر روزنامه',
          journalVoucherPayload: {
            ...res.journalVoucherPayload,
            dateJalali: getCurrentJalaliDate(),
          },
        };
      } else if (res.intent === 'ACTION_CREATE_PAYMENT_RECEIPT' && res.paymentReceiptPayload) {
        cardAction = {
          type: 'PAYMENT_RECEIPT_CONFIRMATION',
          title: `تایید صدور قبض ${res.paymentReceiptPayload.type === 'PAYMENT' ? 'پرداخت' : 'دریافت'}`,
          paymentReceiptPayload: {
            ...res.paymentReceiptPayload,
            amountFormatted: format3Digit(res.paymentReceiptPayload.amount || 0),
            dateJalali: getCurrentJalaliDate(),
          },
        };
      } else if (res.navigateTab) {
        cardAction = {
          type: 'NAVIGATE',
          title: `انتقال به بخش ${res.navigateTab}`,
          navigateTab: res.navigateTab,
        };
      }

      return {
        id: msgId,
        sender: 'AGENT',
        text: res.text || 'درخواست توسط حسابدار ارشد ارزیابی گردید.',
        timestamp: timeStr,
        intent: res.intent || 'GENERAL_CHAT',
        cardAction,
        reportData,
      };
    }
  } catch {
    // Fallback to local NLP
  }

  return processAgentCommand(input, foundationData);
}
