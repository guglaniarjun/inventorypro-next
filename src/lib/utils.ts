export function cn(...inputs: (string | undefined | null | false | 0)[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function parseIntOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

export function parseDateOrNull(val: unknown): Date | null {
  if (!val || val === "") return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}
