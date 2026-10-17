/**
 * تبدیل هوشمند و دقیق مبالغ عددی به حروف فارسی
 * برای درج در فاکتورهای رسمی، فیش پرینتر و اسناد مالی
 */
export function numberToWordsPersian(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return 'صفر';
  if (num === 0) return 'صفر';
  if (num < 0) return 'منفی ' + numberToWordsPersian(Math.abs(num));

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dahgan = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const dahyekan = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const maghadir = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function threeDigitsToWords(n: number): string {
    if (n === 0) return '';
    const parts: string[] = [];
    const s = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const y = n % 10;

    if (s > 0) parts.push(sadgan[s]);

    if (d === 1) {
      parts.push(dahyekan[y]);
    } else {
      if (d > 0) parts.push(dahgan[d]);
      if (y > 0) parts.push(yekan[y]);
    }

    return parts.join(' و ');
  }

  const parts: string[] = [];
  let temp = Math.floor(num);
  let step = 0;

  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkWords = threeDigitsToWords(chunk);
      const label = maghadir[step];
      parts.unshift(label ? `${chunkWords} ${label}` : chunkWords);
    }
    temp = Math.floor(temp / 1000);
    step++;
  }

  return parts.join(' و ');
}
