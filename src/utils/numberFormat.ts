/**
 * Comprehensive number and currency formatting utilities for Mehregan ERP
 * Supports 3-digit comma separation, Persian/Arabic digit conversion, and live input formatting.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Normalizes Persian and Arabic numerals to standard Latin digits (0-9)
 */
export function normalizePersianDigits(input: string | number): string {
  if (input === null || input === undefined) return '';
  let str = String(input);
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
    str = str.replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return str;
}

/**
 * Parses numeric value from a string containing commas, spaces, or Persian digits
 */
export function parseNumberFromCommas(input: string | number | undefined | null): number {
  if (input === null || input === undefined) return 0;
  const normalized = normalizePersianDigits(input);
  const cleanStr = normalized.replace(/[^0-9.-]/g, '');
  const num = Number(cleanStr);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a number with 3-digit comma separators (e.g. 1500000 -> "1,500,000")
 */
export function formatWithCommas(value: number | string | undefined | null): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : parseNumberFromCommas(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Formats value as Tomans with 3-digit comma separators
 */
export function formatToman(valueIrrOrToman: number | string | undefined | null, isAlreadyToman = false): string {
  const num = typeof valueIrrOrToman === 'number' ? valueIrrOrToman : parseNumberFromCommas(valueIrrOrToman);
  const toman = isAlreadyToman ? num : Math.round(num / 10);
  return `${formatWithCommas(toman)} تومان`;
}

/**
 * Formats value as Rials with 3-digit comma separators
 */
export function formatRial(valueIrr: number | string | undefined | null): string {
  const num = typeof valueIrr === 'number' ? valueIrr : parseNumberFromCommas(valueIrr);
  return `${formatWithCommas(num)} ریال`;
}
