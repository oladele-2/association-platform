import { useEffect, useMemo, useState } from 'react';
import { apiFetch, type ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatMoneyFromKobo } from '../../lib/format';

type Invoice = {
  id: string;
  invoiceNo: string;
  amountDueKobo: string;
  amountPaidKobo: string;
  status: string;
  dueOn: string | null;
  currency: string;
};

type Payment = {
  id: string;
  reference: string;
  amountKobo: string;
  currency: string;
  status: string;
  channel: string;
  createdAt: string;
  authorizationUrl?: string | null;
};

type Page<T> = { items: T[]; page: number; limit: number; total: number };

export function DuesPage() {
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [inv, pay] = await Promise.all([
        apiFetch<Page<Invoice> | Invoice[]>('/v1/me/invoices', { accessToken }),
        apiFetch<Page<Payment> | Payment[]>('/v1/me/payments', { accessToken }),
      ]);
      setInvoices(Array.isArray(inv) ? inv : (inv.items ?? []));
      setPayments(Array.isArray(pay) ? pay : (pay.items ?? []));
    } catch (err) {
      setError((err as ApiError).message || 'Could not load billing data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const payable = useMemo(
    () =>
      invoices.filter((i) => ['issued', 'partially_paid', 'overdue', 'pending'].includes(i.status)),
    [invoices],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function payWithPaystack() {
    if (!accessToken || selected.size === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<Payment & { authorizationUrl?: string }>(
        '/v1/me/payments/paystack/initialize',
        {
          method: 'POST',
          accessToken,
          body: JSON.stringify({
            invoiceIds: [...selected],
            idempotencyKey: `portal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            callbackUrl: `${window.location.origin}/member/dues`,
          }),
        },
      );
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setMessage('Payment initialized (mock/offline gateway). Refreshing…');
      setSelected(new Set());
      await load();
    } catch (err) {
      setError((err as ApiError).message || 'Paystack init failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading dues…</p>;

  return (
    <div>
      <h1>Dues &amp; Payments</h1>
      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert alert--ok">{message}</div> : null}

      <h2 style={{ marginTop: '1.5rem', fontSize: '1.25rem' }}>Invoices</h2>
      {payable.length === 0 && invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th />
                <th>Invoice</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const canPay = ['issued', 'partially_paid', 'overdue', 'pending'].includes(
                  inv.status,
                );
                return (
                  <tr key={inv.id}>
                    <td>
                      {canPay ? (
                        <input
                          type="checkbox"
                          checked={selected.has(inv.id)}
                          onChange={() => toggle(inv.id)}
                          aria-label={`Select ${inv.invoiceNo}`}
                        />
                      ) : null}
                    </td>
                    <td>{inv.invoiceNo}</td>
                    <td>{formatDate(inv.dueOn)}</td>
                    <td>{formatMoneyFromKobo(inv.amountDueKobo, inv.currency)}</td>
                    <td>{formatMoneyFromKobo(inv.amountPaidKobo, inv.currency)}</td>
                    <td>{inv.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <button
          className="btn btn--primary"
          type="button"
          disabled={busy || selected.size === 0}
          onClick={() => void payWithPaystack()}
        >
          {busy ? 'Starting…' : `Pay selected (${selected.size})`}
        </button>
      </div>

      <h2 style={{ marginTop: '2rem', fontSize: '1.25rem' }}>Recent payments</h2>
      {payments.length === 0 ? (
        <p className="muted">No payments yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Amount</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.reference}</td>
                  <td>{formatMoneyFromKobo(p.amountKobo, p.currency)}</td>
                  <td>{p.channel}</td>
                  <td>{p.status}</td>
                  <td>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
