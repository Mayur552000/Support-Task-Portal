import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { login, loading, authError } = useContext(AuthContext);
  const [username, setUsername] = useState('mayur');
  const [password, setPassword] = useState('password123');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0b192c 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '36px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: '#fff',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(37,99,235,0.4)'
          }}>
            <ShieldCheck size={30} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>CASCO IT Portal</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>IT Support & Agent Work Management Workspace</p>
        </div>

        {authError && (
          <div style={{
            padding: '12px 14px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #fca5a5'
          }}>
            <AlertCircle size={16} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
          <div style={{ fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Demo Accounts:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Agent: <strong>mayur</strong></span>
              <span>Pass: <code>password123</code></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Lead: <strong>lead_user</strong></span>
              <span>Pass: <code>password123</code></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Admin: <strong>admin_user</strong></span>
              <span>Pass: <code>password123</code></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
