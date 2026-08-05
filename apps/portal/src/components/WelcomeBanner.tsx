import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

type Profile = {
  metadata?: Record<string, unknown>;
};

/** Shown once after self-registration (metadata.showWelcome). */
export function WelcomeBanner() {
  const { accessToken, shells } = useAuth();
  const [show, setShow] = useState(false);
  const androidUrl = import.meta.env.VITE_ANDROID_APP_URL as string | undefined;

  useEffect(() => {
    if (!accessToken || !shells.includes('member')) return;
    void (async () => {
      try {
        const profile = await apiFetch<Profile>('/v1/me/profile', { accessToken });
        if (profile.metadata?.showWelcome === true) setShow(true);
      } catch {
        /* ignore */
      }
    })();
  }, [accessToken, shells]);

  async function dismiss() {
    if (!accessToken) return;
    try {
      await apiFetch('/v1/me/profile', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          metadata: { showWelcome: false, welcomeSeenAt: new Date().toISOString() },
        }),
      });
    } catch {
      /* still hide */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="alert alert--ok" style={{ marginBottom: '1rem' }}>
      <strong>Congratulations — you are registered.</strong>
      <p style={{ margin: '0.5rem 0' }}>
        Use this portal anytime. You can also install the Android companion app.
      </p>
      <div className="toolbar">
        {androidUrl ? (
          <a className="btn btn--ghost" href={androidUrl} target="_blank" rel="noreferrer">
            Download Android app
          </a>
        ) : null}
        <button className="btn btn--primary" type="button" onClick={() => void dismiss()}>
          Continue
        </button>
      </div>
    </div>
  );
}
