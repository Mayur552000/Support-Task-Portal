import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { AppContext } from '../../context/AppContext';
import { Search, Bell, RefreshCw, LogOut, User, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const { setSearchModalOpen, notifications, unreadCount, lastSyncTime, isHelpdeskOnline, triggerSync } = useContext(AppContext);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    await triggerSync();
    setTimeout(() => setSyncing(false), 600);
  };

  return (
    <header className="casco-header">
      <div className="brand-section">
        <div className="brand-logo">CASCO</div>
        <div>
          <div className="brand-title">
            IT Support & Agent Work Portal
            <span className="badge badge-open" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>v1.0 Read-Only Integration</span>
          </div>
          <div className="brand-subtitle">Enterprise Work Management Workspace</div>
        </div>
      </div>

      <div className="header-right">
        {/* Global Search Trigger */}
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => setSearchModalOpen(true)}
          style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 14px' }}
        >
          <Search size={15} />
          <span>Global Search...</span>
          <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>Ctrl+K</kbd>
        </button>

        {/* Read-Only Helpdesk Sync Status Indicator */}
        <div className="sync-badge" title="Helpdesk Integration is strictly READ-ONLY">
          <div className={`sync-dot ${isHelpdeskOnline ? 'online' : 'offline'}`}></div>
          <span>Helpdesk: {isHelpdeskOnline ? 'Online' : 'Offline Mode'}</span>
          <span style={{ opacity: 0.65, fontSize: '0.72rem' }}>({lastSyncTime})</span>
          <button 
            onClick={handleManualSync} 
            disabled={syncing}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Manual Sync (GET Only)"
          >
            <RefreshCw size={13} className={syncing ? 'spin' : ''} />
          </button>
        </div>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer', position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="card" style={{ position: 'absolute', right: 0, top: '45px', width: '360px', zIndex: 500, padding: '12px', background: '#ffffff', color: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>System Notifications ({unreadCount})</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Real-time alerts</span>
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '16px' }}>No active notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: '8px 10px', borderRadius: '6px', background: n.type === 'error' ? '#fee2e2' : '#f8fafc', borderLeft: `3px solid ${n.type === 'error' ? '#ef4444' : '#2563eb'}`, fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: '600', color: n.type === 'error' ? '#991b1b' : '#0f172a' }}>{n.title}</div>
                      <div style={{ color: '#475569', fontSize: '0.78rem' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Agent Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <User size={16} color="#60a5fa" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>{user?.full_name || 'Agent'}</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{user?.role} | HD ID: {user?.external_helpdesk_agent_id}</div>
          </div>
          <button 
            onClick={logout}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', marginLeft: '6px' }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
