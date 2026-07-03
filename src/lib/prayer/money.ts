/** Format ledger amounts for display (USD-style; currency field can come later). */
export function formatLedgerAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseLedgerAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
