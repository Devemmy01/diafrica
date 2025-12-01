"use client";
import React, { useState } from 'react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Server error');
        setStatus('error');
        return;
      }

      setEmailSent(Boolean(data.emailSent));

      // If ICS base64 returned, create download link
      if (data.icsBase64) {
        const byteCharacters = atob(data.icsBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        setIcsUrl(url);
      }

      setStatus('success');
    } catch (err: any) {
      setError(err?.message || String(err));
      setStatus('error');
    }
  }

  return (
    <main className="register-container">
      <header className="register-hero">
        <h1>Public Presentation — Women & Youth Impact Fund (TWYIF)</h1>
        <p>
          Women Aligned for Growth (WAG), in partnership with DI-Africa and the Nigerian Institute of International
          Affairs (NIIA), warmly invites you to the public presentation of the Women & Youth Impact Fund (TWYIF).
        </p>
      </header>

      <img
        src="/diafrica.jpeg"
        alt="TWYIF banner"
        className="banner-i flex mx-auto"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      <section className="card" aria-labelledby="register-heading">
        <h2 id="register-heading" style={{ margin: 0, fontSize: '1.1rem', marginBottom: 8 }}>Register your attendance</h2>

        {status !== 'success' && (
          <form onSubmit={onSubmit} className="form-grid" aria-describedby="register-desc">
            <p id="register-desc" className="full" style={{ margin: 0, color: '#6b7280' }}>
              Please provide the details below. We'll send an RSVP and calendar invite to your email when available.
            </p>

            <label className="form-row full">
              <span>Full name (title inclusive)</span>
              <input
                className="input"
                required
                value={name}
                name='name'
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Dr. Ifeyinwa Nwakwesi"
              />
            </label>

            <label className="form-row">
              <span>Email address</span>
              <input
                className="input"
                required
                type="email"
                name='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="form-row">
              <span>Phone number</span>
              <input
                className="input"
                value={phone}
                name='phone'
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
              />
            </label>

            <div className="form-row full actions">
              <button className="btn" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Registering...' : 'Register / RSVP'}
              </button>

              {status === 'error' && error && <span className="error">{error}</span>}
            </div>
          </form>
        )}

        {status === 'success' && (
          <div style={{ marginTop: 10 }}>
            <div className="success">
              <strong>Thank you for signing up for the Public Presentation of the 10 Billion Naira Women and Youth Impact Fund (TWYIF).</strong>
              <div style={{ marginTop: 8 }}>
                We look forward to you gracing the occasion with your participation.
              </div>
              <div style={{ marginTop: 8, fontSize: '0.95rem' }}>Yours truly, The organising committee.</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <p style={{ margin: 0 }}>An RSVP with calendar invite has been sent to your email.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
