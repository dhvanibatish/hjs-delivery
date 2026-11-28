export const DAY = 864e5;

export function today0(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
export function parseD(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  return isNaN(+d) ? null : d;
}
/** whole days from a → b (b - a) */
export function daysBetween(a: Date, b: Date): number { return Math.round((+b - +a) / DAY); }
/** days from today to s (negative = past) */
export function daysFromToday(s: string | null | undefined): number { const d = parseD(s); return d ? daysBetween(today0(), d) : 0; }
export function daysSince(s: string | null | undefined): number { return -daysFromToday(s); }

export function iso(d: Date | number): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function addDays(s: string | Date, n: number): Date { const d = typeof s === 'string' ? parseD(s)! : new Date(s); return new Date(+d + n * DAY); }

export function fmtD(s: string | null | undefined): string {
  const d = parseD(s); return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
}
export function fmtDY(s: string | null | undefined): string {
  const d = parseD(s); return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
export function fmtGB(d: Date | string | null | undefined): string {
  const x = typeof d === 'string' ? parseD(d) : d; return x ? x.toLocaleDateString('en-GB') : '—';
}

export function inr(n: number | null | undefined): string { return '₹' + Math.round(+(n || 0)).toLocaleString('en-IN'); }
export function rs(n: number): string { return 'Rs. ' + Math.round(n).toLocaleString('en-IN') + '/-'; }
export function short(n: number): string {
  n = +n || 0;
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'k';
  return inr(n);
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function two(n: number): string { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''); }
function three(n: number): string { const h = Math.floor(n / 100), r = n % 100; return (h ? ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : ''); }
/** Indian numbering in words: 1,23,456 → "One Lakh Twenty Three Thousand Four Hundred Fifty Six" */
export function inWords(num: number): string {
  let n = Math.round(Math.abs(num));
  if (!n) return 'Zero';
  const parts: string[] = [];
  const cr = Math.floor(n / 1e7); n %= 1e7;
  const lk = Math.floor(n / 1e5); n %= 1e5;
  const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) parts.push(inWords(cr) + ' Crore');
  if (lk) parts.push(two(lk) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (n) parts.push(three(n));
  return parts.join(' ');
}

export function csvCopy(rows: (string | number | null | undefined)[][]): Promise<void> {
  const q = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return navigator.clipboard.writeText(rows.map(r => r.map(q).join(',')).join('\n'));
}
