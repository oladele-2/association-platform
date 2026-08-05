import { useEffect, useState } from 'react';
import { apiFetch, type ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';

type MemberProfile = {
  id: string;
  membershipNo: string | null;
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  alternateEmail: string | null;
  status: string;
  membershipTypeName: string | null;
  joinedOn: string | null;
};

export function ProfilePage() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [alternateEmail, setAlternateEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<MemberProfile>('/v1/me/profile', { accessToken });
        setProfile(data);
        setPhone(data.phone ?? '');
        setAlternateEmail(data.alternateEmail ?? '');
      } catch (err) {
        setError((err as ApiError).message || 'Could not load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  async function onSave(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<MemberProfile>('/v1/me/profile', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          phone: phone.trim() || null,
          alternateEmail: alternateEmail.trim() || null,
        }),
      });
      setProfile(data);
      setMessage('Profile updated.');
    } catch (err) {
      setError((err as ApiError).message || 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading profile…</p>;

  return (
    <div>
      <h1>My Profile</h1>
      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert alert--ok">{message}</div> : null}

      {profile ? (
        <>
          <div className="data-panel" style={{ marginBottom: '1.25rem' }}>
            <p>
              <strong>
                {[profile.title, profile.firstName, profile.middleName, profile.lastName]
                  .filter(Boolean)
                  .join(' ')}
              </strong>
            </p>
            <p className="muted">
              {profile.membershipTypeName ?? 'Member'} · {profile.status}
              {profile.membershipNo ? ` · #${profile.membershipNo}` : ''}
            </p>
            <p className="muted">Joined {formatDate(profile.joinedOn)}</p>
          </div>

          <form className="form" onSubmit={onSave} style={{ maxWidth: '28rem' }}>
            <label>
              Phone
              <input value={phone} onChange={(ev) => setPhone(ev.target.value)} />
            </label>
            <label>
              Alternate email
              <input
                type="email"
                value={alternateEmail}
                onChange={(ev) => setAlternateEmail(ev.target.value)}
              />
            </label>
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </>
      ) : (
        <div className="placeholder">
          <p>No member profile is linked to this login yet.</p>
        </div>
      )}
    </div>
  );
}
