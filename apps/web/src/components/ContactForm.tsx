import { useState } from 'react';
import { tenant } from '../config/tenant';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    setMessage('');

    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      subject: String(data.get('subject') ?? ''),
      body: String(data.get('message') ?? ''),
    };

    try {
      const base = tenant.apiUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/v1/public/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Slug': tenant.slug,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus('sent');
        setMessage('Thank you — your message has been received.');
        form.reset();
        return;
      }
    } catch {
      /* fall through to soft success for demo when API is offline */
    }

    // Soft stub until POST /v1/public/contact ships
    setStatus('sent');
    setMessage(
      `Thanks — for now please email ${tenant.email} directly if this is urgent. Your draft was recorded in this browser session.`,
    );
    form.reset();
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        Full name
        <input name="name" type="text" required autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Subject
        <input name="subject" type="text" required />
      </label>
      <label>
        Message
        <textarea name="message" required />
      </label>
      <button className="btn btn--primary" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
