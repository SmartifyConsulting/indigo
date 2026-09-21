/**
 * Locale-independent formatting. Intl output differs between Node and browsers
 * (thousand separators, month names), which would break server-rendered hydration.
 */

const group = (n: number) =>
  Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export const zar = (n: number) => `${n < 0 ? "-" : ""}R ${group(n)}`;

export const zarCompact = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000_000) return `${sign}R ${(a / 1_000_000_000).toFixed(2)}bn`;
  if (a >= 1_000_000) return `${sign}R ${(a / 1_000_000).toFixed(1)}m`;
  if (a >= 10_000) return `${sign}R ${Math.round(a / 1000)}k`;
  return zar(n);
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SAST_MS = 2 * 60 * 60 * 1000;
const sast = (iso: string) => new Date(new Date(iso).getTime() + SAST_MS);
const p2 = (n: number) => n.toString().padStart(2, "0");

export const fmtDate = (iso: string) => {
  const d = sast(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const fmtDateTime = (iso: string) => {
  const d = sast(iso);
  return `${fmtDate(iso)}, ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
};

export const fmtPremium = (n: number) => `${zar(n)} p/m`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;
