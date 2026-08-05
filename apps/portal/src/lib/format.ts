/** Shared money formatting helpers (API amounts are kobo strings). */

export function formatMoneyFromKobo(
  kobo: string | number | null | undefined,
  currency = 'NGN',
): string {
  const n = typeof kobo === 'string' ? Number(kobo) : Number(kobo ?? 0);
  if (!Number.isFinite(n)) return '—';
  const code = currency.trim().toUpperCase() || 'NGN';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(n / 100);
  } catch {
    return `${(n / 100).toFixed(2)} ${code}`;
  }
}

/** @deprecated Prefer formatMoneyFromKobo(amount, currency) */
export function formatNairaFromKobo(kobo: string | number | null | undefined): string {
  return formatMoneyFromKobo(kobo, 'NGN');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
