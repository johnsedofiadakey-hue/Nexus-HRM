import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DevLogin = () => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) { setError('Master key required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/dev/stats', {
        headers: { 'x-dev-master-key': key }
      });
      if (res.status === 403 || res.status === 401) {
        setError('Invalid master key. Access denied.');
        setLoading(false); return;
      }
      localStorage.setItem('nexus_dev_key', key);
      navigate('/nexus-dev-portal/dashboard');
    } catch {
      setError('Connection error. Is the server running?');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020817', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      {/* Animated grid background */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Terminal header */}
        <div style={{ background: '#0d1526', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.05)' }}>
          {/* Terminal titlebar */}
          <div style={{ background: '#060e1c', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
            {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.8 }} />
            ))}
            <span style={{ marginLeft: 8, fontSize: 11, color: '#475569', letterSpacing: '0.1em' }}>nexus-dev-portal — shadow-access</span>
          </div>

          <div style={{ padding: '40px 36px' }}>
            {/* Skull icon */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ display: 'inline-flex', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/>
                  <path d="M9 17v1a3 3 0 0 0 6 0v-1"/>
                  <line x1="9" y1="12" x2="9" y2="12.01"/>
                  <line x1="15" y1="12" x2="15" y2="12.01"/>
                </svg>
              </div>
              <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>SHADOW ACCESS</h1>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>Nexus HRM — System Developer Portal</p>
            </div>

            {/* Terminal prompt */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#475569', fontSize: 11, marginBottom: 8 }}>$ authenticate --portal=nexus-dev --level=master</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#3b82f6', fontSize: 12 }}>❯</span>
                <span style={{ color: '#64748b', fontSize: 11 }}>Enter master control key:</span>
              </div>
            </div>

            <form onSubmit={handleLogin}>
              <input type="password" value={key} onChange={e => setKey(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${error ? '#ef4444' : 'rgba(59,130,246,0.2)'}`, borderRadius: 8, color: '#60a5fa', padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box', letterSpacing: '0.15em', marginBottom: error ? 8 : 20 }}
                placeholder="••••••••••••••••••••••••••••••••" autoFocus />
              {error && <p style={{ color: '#ef4444', fontSize: 11, marginBottom: 16 }}>⚠ {error}</p>}

              <button type="submit" disabled={loading}
                style={{ width: '100%', background: loading ? '#1e3a5f' : 'linear-gradient(135deg, #1d4ed8, #1e40af)', border: 'none', borderRadius: 8, color: 'white', padding: '13px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> AUTHENTICATING...</>
                ) : '◆ AUTHENTICATE'}
              </button>
            </form>

            <p style={{ color: '#1e3a5f', fontSize: 10, textAlign: 'center', marginTop: 24, letterSpacing: '0.1em' }}>
              UNAUTHORIZED ACCESS IS LOGGED AND PROSECUTED
            </p>
          </div>
        </div>

        <p style={{ color: '#1e293b', fontSize: 10, textAlign: 'center', marginTop: 12, letterSpacing: '0.08em' }}>
          NEXUS HRM DEV PORTAL · {new Date().getFullYear()}
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
export default DevLogin;
