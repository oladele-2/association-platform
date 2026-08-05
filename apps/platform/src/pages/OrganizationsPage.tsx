import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export type Org = {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  orgType: string;
  status: string;
  createdAt?: string;
};

export function OrganizationsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Org[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<Org[] | { items?: Org[] }>('/v1/platform/organizations', {
          accessToken,
        });
        setItems(Array.isArray(data) ? data : (data.items ?? []));
      } catch (err) {
        setError((err as ApiError).message || 'Failed to load organizations');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  return (
    <div>
      <h1>Organizations</h1>
      <p className="muted">Tenant associations managed by Ajir.</p>
      <div className="toolbar">
        <Link className="btn btn--primary" to="/provision">
          Provision organization
        </Link>
      </div>
      {error ? <div className="alert">{error}</div> : null}
      {loading ? <p>Loading…</p> : null}
      {!loading && items.length === 0 ? <p className="muted">No organizations yet.</p> : null}
      {items.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Display name</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/organizations/${o.id}`}>{o.displayName}</Link>
                  </td>
                  <td>{o.slug}</td>
                  <td>{o.orgType}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
