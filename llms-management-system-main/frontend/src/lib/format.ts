import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

function toDate(date: Date | string | number | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  if (typeof date === "string") {
    // Attempt parseISO first, fallback to new Date
    const parsed = parseISO(date);
    if (isValid(parsed)) return parsed;
    const direct = new Date(date);
    return isValid(direct) ? direct : null;
  }
  const fromNum = new Date(date);
  return isValid(fromNum) ? fromNum : null;
}

export function formatDate(
  date: Date | string | number | null | undefined,
  formatString = "MMM d, yyyy"
): string {
  const d = toDate(date);
  if (!d) return "-";
  try {
    return format(d, formatString);
  } catch {
    return "-";
  }
}

export function formatDateTime(
  date: Date | string | number | null | undefined,
  formatString = "MMM d, yyyy, h:mm a"
): string {
  const d = toDate(date);
  if (!d) return "-";
  try {
    return format(d, formatString);
  } catch {
    return "-";
  }
}

export function formatRelative(
  date: Date | string | number | null | undefined
): string {
  const d = toDate(date);
  if (!d) return "-";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "-";
  }
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", options).format(num);
}
