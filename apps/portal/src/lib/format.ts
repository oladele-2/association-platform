/** Shared money formatting helpers (API amounts are kobo strings). */

export function formatNairaFromKobo(kobo: string | number | null | undefined): string {
  const n = typeof kobo === 'string' ? Number(kobo) : Number(kobo ?? 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(n / 100);
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
