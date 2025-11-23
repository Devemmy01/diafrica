"use client";
import React, { useState, useEffect } from 'react';

type Registration = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string | Date;
  icsPath?: string;
};

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ [key: string]: string }>({});

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/registrations', {
        headers: { Authorization: `Bearer ${secret}` },
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setRegistrations(data.registrations || []);
        localStorage.setItem('adminSecret', secret);
      } else {
        setError('Invalid admin secret');
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchRegistrations() {
    const storedSecret = localStorage.getItem('adminSecret') || secret;
    if (!storedSecret) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/registrations', {
        headers: { Authorization: `Bearer ${storedSecret}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      } else {
        setError('Failed to load registrations');
        setIsAuthenticated(false);
        localStorage.removeItem('adminSecret');
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(reg: Registration) {
    const storedSecret = localStorage.getItem('adminSecret') || secret;
    if (!storedSecret) return;

    const key = reg._id?.toString() || reg.id || reg.email;
    setResendStatus({ ...resendStatus, [key]: 'Sending...' });

    try {
      const res = await fetch('/api/admin/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedSecret}`,
        },
        body: JSON.stringify({ email: reg.email, name: reg.name }),
      });

      const data = await res.json();
      if (data.emailSent) {
        setResendStatus({ ...resendStatus, [key]: 'Sent!' });
      } else {
        setResendStatus({ ...resendStatus, [key]: `Failed: ${data.sendError || 'Unknown error'}` });
      }
    } catch (err: any) {
      setResendStatus({ ...resendStatus, [key]: `Error: ${err?.message}` });
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setSecret('');
    setRegistrations([]);
    localStorage.removeItem('adminSecret');
  }

  function downloadCSV() {
    const header = ['Name', 'Email', 'Phone', 'Created At'];
    const rows = registrations.map((r) => [
      r.name,
      r.email,
      r.phone || '',
      typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
    ]);

    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twyif-registrations-${Date.now()}.csv`;
    a.click();
  }

  useEffect(() => {
    const storedSecret = localStorage.getItem('adminSecret');
    if (storedSecret) {
      setSecret(storedSecret);
      setIsAuthenticated(true);
      fetchRegistrations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 400, margin: '4rem auto', padding: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Admin Login</h1>
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
          <label>
            Admin Secret
            <input
              type="password"
              required
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter admin secret"
              className="input"
              style={{ width: '100%', padding: 8, marginTop: 6 }}
            />
          </label>
          <button type="submit" disabled={loading} className="btn" style={{ padding: '10px 16px' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} className='flex-col gap-6 md:flex-row'>
        <h1 style={{ fontSize: '1.5rem' }}>TWYIF Registrations ({registrations.length})</h1>
        <div style={{ display: 'flex', gap: 8 }} className='flex-wrap'>
          <button onClick={fetchRegistrations} disabled={loading} className="btn">
            Refresh
          </button>
          <button onClick={downloadCSV} className="btn">
            Download CSV
          </button>
          <button onClick={handleLogout} className="btn" style={{ background: '#dc2626' }}>
            Logout
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} className='whitespace-nowrap'>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Email</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Phone</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Created At</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg) => {
              const key = reg._id?.toString() || reg.id || reg.email;
              return (
                <tr key={key} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{reg.name}</td>
                  <td style={{ padding: 8 }}>{reg.email}</td>
                  <td style={{ padding: 8 }}>{reg.phone || '-'}</td>
                  <td style={{ padding: 8 }}>
                    {typeof reg.createdAt === 'string'
                      ? reg.createdAt
                      : new Date(reg.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: 8 }}>
                    <button
                      onClick={() => handleResend(reg)}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                    >
                      Resend Email
                    </button>
                    {resendStatus[key] && (
                      <span style={{ marginLeft: 8, fontSize: '0.875rem', color: '#6b7280' }}>
                        {resendStatus[key]}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {registrations.length === 0 && <p style={{ marginTop: 16 }}>No registrations found.</p>}
      </div>
    </div>
  );
}
