import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Clock, Filter, Search } from 'lucide-react';

export const MyUpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAllUpdates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard');
      setUpdates(res.data.recent_updates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUpdates();
  }, []);

  const filteredUpdates = updates.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.id || '').toLowerCase().includes(s) || 
           (u.title || '').toLowerCase().includes(s) || 
           (u.update_text || '').toLowerCase().includes(s) || 
           (u.agent_name || '').toLowerCase().includes(s);
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>Agent Work Updates Feed</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Complete historical log of all agent updates across Tickets and Tasks. Entries are append-only and never overwritten.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search work update text..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading updates feed...</div>
        ) : filteredUpdates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No work updates found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredUpdates.map((item, idx) => (
              <div key={idx} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '0.95rem' }}>[{item.type}] {item.id}</span>
                    <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{item.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StatusBadge status={item.status} />
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.timestamp}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#334155', background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {item.update_text}
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
                  Logged by: <strong>{item.agent_name}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
