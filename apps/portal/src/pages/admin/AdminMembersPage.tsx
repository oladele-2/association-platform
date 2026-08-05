import { useEffect, useState } from 'react';
import { apiFetch, type ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';

type Member = {
  id: string;
  membershipNo: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  status: string;
  phone: string | null;
  alternateEmail: string | null;
  membershipTypeName: string | null;
  createdAt: string;
};

type Page = { items: Member[]; page: number; limit: number; total: number };

export function AdminMembersPage() {
  const { accessToken } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(search = q, statusFilter = status) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50', page: '1' });
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch<Page>(`/v1/admin/members?${params}`, { accessToken });
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } catch (err) {
      setError((err as ApiError).message || 'Could not load members');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return (
    <div>
      <h1>Members</h1>
      <p className="muted">
        {total} member{total === 1 ? '' : 's'} in this organisation.
      </p>

      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          placeholder="Search name or membership no"
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
        />
        <select value={status} onChange={(ev) => setStatus(ev.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">draft</option>
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
        <button className="btn btn--primary" type="submit">
          Search
        </button>
      </form>

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <p>Loading…</p> : null}

      {!loading && items.length === 0 ? <p className="muted">No members matched.</p> : null}

      {items.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Membership</th>
                <th>Type</th>
                <th>Status</th>
                <th>Contact</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>{[m.title, m.firstName, m.lastName].filter(Boolean).join(' ')}</td>
                  <td>{m.membershipNo ?? '—'}</td>
                  <td>{m.membershipTypeName ?? '—'}</td>
                  <td>{m.status}</td>
                  <td>{m.phone ?? m.alternateEmail ?? '—'}</td>
                  <td>{formatDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
