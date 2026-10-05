const SI = [
  { v: 1e15, s: "P" },
  { v: 1e12, s: "T" },
  { v: 1e9, s: "B" },
  { v: 1e6, s: "M" },
  { v: 1e3, s: "K" },
];

const BYTE_UNITS = [
  { v: 1e18, s: "EB" },
  { v: 1e15, s: "PB" },
  { v: 1e12, s: "TB" },
  { v: 1e9, s: "GB" },
  { v: 1e6, s: "MB" },
  { v: 1e3, s: "KB" },
];

function trim(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/** 1234 → "1.23K", 3_500_000 → "3.5M". Uses "B" for billions (back-of-envelope style). */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const unit = SI.find((u) => Math.abs(n) >= u.v);
  return unit ? `${trim(n / unit.v)}${unit.s}` : trim(n);
}

/** Decimal (powers of 1000), matching how estimates are usually done on a whiteboard. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const unit = BYTE_UNITS.find((u) => Math.abs(n) >= u.v);
  return unit ? `${trim(n / unit.v)} ${unit.s}` : `${trim(n)} B`;
}
