'use client';
import { useState, useEffect } from 'react';

export default function TwoFactorSettings() {
  const [status, setStatus] = useState(null); // null=loading, true=enabled, false=disabled
  const [setupData, setSetupData] = useState(null); // { secret, uri }
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/2fa?action=status')
      .then(r => r.json())
      .then(d => setStatus(d.enabled))
      .catch(() => setStatus(false));
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/2fa?action=setup');
    const data = await res.json();
    if (data.alreadyEnabled) {
      setStatus(true);
    } else if (data.secret) {
      setSetupData(data);
    }
    setLoading(false);
  };

  const enable = async () => {
    if (!code || code.length !== 6) return;
    setLoading(true);
    const res = await fetch('/api/2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enable', code }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatus(true);
      setSetupData(null);
      setCode('');
      setMsg({ ok: true, text: '2FA enabled successfully! Your account is now protected.' });
    } else {
      setMsg({ ok: false, text: data.error || 'Invalid code' });
    }
    setLoading(false);
  };

  const disable = async () => {
    if (!code || code.length !== 6) return;
    setLoading(true);
    const res = await fetch('/api/2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disable', code }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatus(false);
      setCode('');
      setMsg({ ok: true, text: '2FA disabled.' });
    } else {
      setMsg({ ok: false, text: data.error || 'Invalid code' });
    }
    setLoading(false);
  };

  if (status === null) return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>;

  return (
    <div>
      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 12, fontWeight: 600,
          background: msg.ok ? 'rgba(52,189,89,0.1)' : 'rgba(239,88,86,0.1)',
          color: msg.ok ? '#34bd59' : '#EF5856',
          border: `1px solid ${msg.ok ? 'rgba(52,189,89,0.25)' : 'rgba(239,88,86,0.25)'}`,
        }}>
          {msg.text}
        </div>
      )}

      {status ? (
        // 2FA is enabled — show disable form
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'rgba(52,189,89,0.08)', borderRadius: 'var(--radius)', border: '1px solid rgba(52,189,89,0.2)' }}>
            <span style={{ fontSize: 18 }}>🔐</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#34bd59' }}>Two-factor authentication is enabled</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your account requires an authenticator code at login</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Enter your authenticator code to disable 2FA
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                style={{ width: 120, textAlign: 'center', fontSize: 18, letterSpacing: 6, fontFamily: 'monospace' }}
              />
              <button onClick={disable} disabled={loading || code.length !== 6} className="btn btn-secondary btn-sm" style={{ color: '#EF5856' }}>
                {loading ? '…' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      ) : setupData ? (
        // Setup flow — show QR + verification
        <div>
          <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <strong>Step 1:</strong> Scan the QR code below with an authenticator app (Google Authenticator, Authy, etc.)
            or manually enter the secret key.
          </div>

          {/* QR code via Google Charts API (no external npm needed) */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.uri)}`}
              alt="QR Code"
              style={{ width: 160, height: 160, borderRadius: 8, background: '#fff', padding: 8 }}
            />
          </div>

          <div style={{ marginBottom: 16, background: 'var(--panel-inner)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Manual entry key</div>
            <code style={{ fontSize: 13, letterSpacing: 2, fontWeight: 700, color: 'var(--text-primary)' }}>{setupData.secret}</code>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            <strong>Step 2:</strong> Enter the 6-digit code from your app to confirm setup.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              autoFocus
              style={{ width: 120, textAlign: 'center', fontSize: 18, letterSpacing: 6, fontFamily: 'monospace' }}
            />
            <button onClick={enable} disabled={loading || code.length !== 6} className="btn btn-primary btn-sm">
              {loading ? '…' : 'Enable 2FA'}
            </button>
            <button onClick={() => { setSetupData(null); setCode(''); }} className="btn btn-secondary btn-sm">Cancel</button>
          </div>
        </div>
      ) : (
        // 2FA is off — show enable button
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>🔓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Two-factor authentication is disabled</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add an extra layer of security to your account</div>
            </div>
          </div>
          <button onClick={startSetup} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? '…' : 'Set up 2FA'}
          </button>
        </div>
      )}
    </div>
  );
}
