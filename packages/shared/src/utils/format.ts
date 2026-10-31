// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · utils/format.ts
// ──────────────────────────────────────────────────────────────────────

const LOCALE = 'en-IN';
const TIMEZONE = 'Asia/Kolkata';

/** Format a date as a readable string in IST */
export function formatDate(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone: TIMEZONE }).format(date);
}

/** Format a date with time */
export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Return a relative time string like "2 hours ago" */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(date);
}

/** Format a currency amount in INR */
export function formatCurrency(
  amount: number | null | undefined,
  opts: { compact?: boolean } = {}
): string {
  if (amount == null) return '—';
  if (opts.compact) {
    if (Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    if (Math.abs(amount) >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a byte count as a human-readable string */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val % 1 === 0 ? val : val.toFixed(1)} ${units[i]}`;
}

/** Format a page count */
export function formatPages(count: number | null | undefined): string {
  if (count == null) return '';
  return `${count} ${count === 1 ? 'page' : 'pages'}`;
}

/** Truncate a string to maxLen, appending ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/** Format a file name — show only the last segment and extension */
export function formatFileName(name: string, maxLen = 40): string {
  if (!name) return '';
  const parts = name.split(/[\\/]/);
  const base = parts[parts.length - 1];
  return truncate(base, maxLen);
}

