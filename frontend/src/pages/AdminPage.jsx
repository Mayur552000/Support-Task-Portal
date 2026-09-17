import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { RoleBadge } from '../components/common/StatusBadge';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Key, 
  Ban, 
  CheckCircle, 
  Trash2, 
  ShieldCheck, 
  FileSpreadsheet, 
  Lock, 
  RefreshCw, 
  X, 
  Save, 
  AlertTriangle, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export const AdminPage = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'audit'

  // User Management State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalUser, setEditModalUser] = useState(null);
  const [resetModalUser, setResetModalUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  // Form states
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create User Form
  const [newUserId, setNewUserId] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState('AGENT');
  const [newSource, setNewSource] = useState('Helpdesk');
  const [newHelpdeskId, setNewHelpdeskId] = useState('');

  // Edit User Form
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('AGENT');
  const [editStatus, setEditStatus] = useState('Active');
  const [editHelpdeskId, setEditHelpdeskId] = useState('');

  // Reset Password Form
  const [resetPasswordVal, setResetPasswordVal] = useState('password123');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await api.get('/audit?limit=50');
      setAuditLogs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, []);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const uid = (newUserId || '').trim().toLowerCase();
      const fn = (newFullName || '').trim();
      const em = (newEmail || '').trim();

      if (!uid) throw { userMessage: 'User ID is required.' };
      if (!fn) throw { userMessage: 'Full Name is required.' };
      if (!em) throw { userMessage: 'Email address is required.' };

      await api.post('/users', {
        user_id: uid,
        username: uid,
        full_name: fn,
        email: em,
        password: newPassword || 'password123',
        role: newRole || 'AGENT',
        source: newSource || 'Local',
        status: 'Active',
        external_helpdesk_agent_id: newHelpdeskId ? String(newHelpdeskId).trim() : '0'
      });

      setFormSuccess(`User '${uid}' registered successfully.`);
      setCreateModalOpen(false);
      // Reset form
      setNewUserId('');
      setNewFullName('');
      setNewEmail('');
      setNewPassword('password123');
      setNewHelpdeskId('');
      fetchUsers();
    } catch (err) {
      const msg = typeof err?.userMessage === 'string' ? err.userMessage : (err?.message || 'Failed to create user.');
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setEditModalUser(u);
    setEditFullName(u.full_name || '');
    setEditEmail(u.email || '');
    setEditRole(u.role || 'AGENT');
    setEditStatus(u.status || 'Active');
    setEditHelpdeskId(u.external_helpdesk_agent_id ? String(u.external_helpdesk_agent_id) : '');
    setFormError(null);
  };

  // Handle Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editModalUser) return;
    setSubmitting(true);
    setFormError(null);
    const targetId = editModalUser.user_id || editModalUser.username || editModalUser.id;
    try {
      await api.put(`/users/${targetId}`, {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
        status: editStatus,
        external_helpdesk_agent_id: editHelpdeskId ? String(editHelpdeskId).trim() : '0'
      });
      setFormSuccess(`User '${targetId}' updated successfully.`);
      setEditModalUser(null);
      fetchUsers();
    } catch (err) {
      const msg = typeof err?.userMessage === 'string' ? err.userMessage : (err?.message || 'Failed to update user.');
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setSubmitting(true);
    setFormError(null);
    const targetId = resetModalUser.user_id || resetModalUser.username || resetModalUser.id;
    try {
      await api.post(`/users/${targetId}/reset-password`, {
        new_password: resetPasswordVal
      });
      setFormSuccess(`Password for user '${targetId}' has been reset.`);
      setResetModalUser(null);
      setResetPasswordVal('password123');
    } catch (err) {
      const msg = typeof err?.userMessage === 'string' ? err.userMessage : (err?.message || 'Failed to reset password.');
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (u) => {
    const isActivating = u.status === 'Disabled';
    const targetId = u.user_id || u.username || u.id;
    const endpoint = isActivating ? `/users/${targetId}/enable` : `/users/${targetId}/disable`;
    try {
      await api.post(endpoint);
      setFormSuccess(`User '${targetId}' ${isActivating ? 'enabled' : 'disabled'}.`);
      fetchUsers();
    } catch (err) {
      alert(typeof err?.userMessage === 'string' ? err.userMessage : 'Action failed.');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setSubmitting(true);
    const targetId = deleteConfirmUser.user_id || deleteConfirmUser.username || deleteConfirmUser.id;
    try {
      await api.delete(`/users/${targetId}`);
      setFormSuccess(`User '${targetId}' removed.`);
      setDeleteConfirmUser(null);
      fetchUsers();
    } catch (err) {
      alert(typeof err?.userMessage === 'string' ? err.userMessage : 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'ALL' && (u.role || '').toUpperCase() !== roleFilter.toUpperCase()) {
      return false;
    }
    if (statusFilter !== 'ALL' && (u.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchId = (u.user_id || '').toLowerCase().includes(q);
      const matchName = (u.full_name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchHId = String(u.external_helpdesk_agent_id || '').includes(q);
      if (!matchId && !matchName && !matchEmail && !matchHId) return false;
    }
    return true;
  });

  return (
    <div className="admin-page" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            User Management & System Administration
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '3px 0 0 0' }}>
            Manage local accounts, map Freshdesk Helpdesk Agent IDs, assign roles, and review security audit trails.
          </p>
        </div>

        {/* Global Notifications / Success Banner */}
        {formSuccess && (
          <div style={{ padding: '8px 14px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>{String(formSuccess)}</span>
            <button onClick={() => setFormSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', color: '#065f46' }}>✕</button>
          </div>
        )}
      </div>

      {/* Top Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'users' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'users' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem'
          }}
        >
          <Users size={17} />
          <span>Manage Users & Helpdesk Mapping ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'audit' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'audit' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem'
          }}
        >
          <ShieldCheck size={17} />
          <span>System Health & Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: MANAGE USERS */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '20px' }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 300px' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search user ID, name, email, Freshdesk ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    fontSize: '0.84rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1'
                  }}
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: '7px 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="LEAD">LEAD</option>
                <option value="AGENT">AGENT</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '7px 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={fetchUsers}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setFormError(null);
                  setCreateModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <UserPlus size={15} />
                <span>Create User</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Helpdesk Agent ID</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading user directory...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No users match your criteria.</td></tr>
                ) : (
                  filteredUsers.map(u => {
                    const uIdentifier = u.user_id || u.username;
                    const isSelf = currentUser?.user_id === uIdentifier || currentUser?.username === uIdentifier;
                    const isActive = u.status === 'Active';

                    return (
                      <tr key={uIdentifier}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{u.email}</div>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600 }}>{u.user_id}</code>
                        </td>
                        <td>
                          <RoleBadge role={u.role} />
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
                            color: isActive ? '#065f46' : '#991b1b',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`
                          }}>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
                            {u.source || 'Local'}
                          </span>
                        </td>
                        <td>
                          {u.external_helpdesk_agent_id && u.external_helpdesk_agent_id !== '0' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: '#f1f5f9',
                              color: '#0f172a'
                            }}>
                              #{u.external_helpdesk_agent_id}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Unmapped
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {u.created_at ? u.created_at.split(' ')[0] : 'N/A'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            {/* Edit */}
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(u)}
                              title="Edit User Details & Helpdesk ID"
                              style={{ padding: '4px 8px' }}
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Reset Password */}
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setResetModalUser(u);
                                setResetPasswordVal('password123');
                                setFormError(null);
                              }}
                              title="Reset Password"
                              style={{ padding: '4px 8px' }}
                            >
                              <Key size={13} />
                            </button>

                            {/* Toggle Enable/Disable */}
                            {!isSelf && (
                              <button
                                className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={() => handleToggleStatus(u)}
                                title={isActive ? 'Disable User' : 'Enable User'}
                                style={{ padding: '4px 8px' }}
                              >
                                {isActive ? <Ban size={13} color="#dc2626" /> : <CheckCircle size={13} color="#16a34a" />}
                              </button>
                            )}

                            {/* Delete */}
                            {!isSelf && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setDeleteConfirmUser(u)}
                                title="Delete User"
                                style={{ padding: '4px 8px', color: '#dc2626' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG TRAIL & SYSTEM HEALTH */}
      {activeTab === 'audit' && (
        <div>
          {/* Architecture Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FileSpreadsheet color="#2563eb" size={20} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>Persistence Engine</h4>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                Workbook: <code>support_data.xlsx</code><br />
                Thread Safety: <code>threading.RLock()</code>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ShieldCheck color="#10b981" size={20} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>Helpdesk Integration</h4>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                Mode: <strong>Strictly READ-ONLY (GET only)</strong><br />
                Target: <code>https://cascoauto.freshdesk.com</code>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Lock color="#8b5cf6" size={20} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>RBAC & Security</h4>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                Hashing: <code>bcrypt</code> with JWT tokens<br />
                Roles: <code>ADMIN</code>, <code>LEAD</code>, <code>AGENT</code>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Append-Only Audit Log Trail
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={fetchAuditLogs}>
                <RefreshCw size={13} /> Refresh Logs
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Timestamp</th>
                    <th>Result</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAudit ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading audit trail...</td></tr>
                  ) : auditLogs.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No audit records found.</td></tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.audit_id}>
                        <td style={{ fontWeight: 700, fontSize: '0.78rem', color: '#64748b' }}>{log.audit_id}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.username}</td>
                        <td><span className="badge badge-open" style={{ fontSize: '0.7rem' }}>{log.action}</span></td>
                        <td style={{ fontSize: '0.82rem' }}>{log.entity} ({log.entity_id})</td>
                        <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{log.timestamp}</td>
                        <td>
                          <span className={`badge ${log.result === 'SUCCESS' ? 'badge-completed' : 'badge-pending'}`}>
                            {log.result}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#475569' }}>{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {createModalOpen && (
        <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Create New User / Register Agent</h3>
              <button onClick={() => setCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '14px', fontSize: '0.84rem' }}>
                    {String(formError)}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>User ID (Username) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. nithin"
                      value={newUserId}
                      onChange={e => setNewUserId(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Initial Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Nithin Nanjappa"
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. nithin@cascoauto.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Application Role *</label>
                    <select className="form-control" value={newRole} onChange={e => setNewRole(e.target.value)}>
                      <option value="AGENT">AGENT (Support Representative)</option>
                      <option value="LEAD">LEAD (Team Lead)</option>
                      <option value="ADMIN">ADMIN (System Administrator)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>User Source</label>
                    <select className="form-control" value={newSource} onChange={e => setNewSource(e.target.value)}>
                      <option value="Helpdesk">Helpdesk (Freshdesk)</option>
                      <option value="Local">Local Portal User</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Freshdesk Agent ID (Numeric)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 12055605196"
                    value={newHelpdeskId}
                    onChange={e => setNewHelpdeskId(e.target.value)}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.74rem' }}>
                    Required to link this agent to their tickets from Freshdesk.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Save size={15} />
                  <span>{submitting ? 'Creating...' : 'Register User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editModalUser && (
        <div className="modal-overlay" onClick={() => setEditModalUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Edit User: {editModalUser.user_id}</h3>
              <button onClick={() => setEditModalUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '14px', fontSize: '0.84rem' }}>
                    {String(formError)}
                  </div>
                )}

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Role</label>
                    <select className="form-control" value={editRole} onChange={e => setEditRole(e.target.value)}>
                      <option value="AGENT">AGENT</option>
                      <option value="LEAD">LEAD</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-control" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Freshdesk Agent ID (Numeric)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 12056973780"
                    value={editHelpdeskId}
                    onChange={e => setEditHelpdeskId(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModalUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Save size={15} />
                  <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetModalUser && (
        <div className="modal-overlay" onClick={() => setResetModalUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Reset Password: {resetModalUser.user_id}</h3>
              <button onClick={() => setResetModalUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '14px', fontSize: '0.84rem' }}>
                    {String(formError)}
                  </div>
                )}

                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px' }}>
                  Enter a new password for user <strong>{resetModalUser.full_name}</strong> (<code>{resetModalUser.user_id}</code>).
                </p>

                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Minimum 6 characters"
                    value={resetPasswordVal}
                    onChange={e => setResetPasswordVal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResetModalUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Key size={15} />
                  <span>{submitting ? 'Resetting...' : 'Reset Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirmUser && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ backgroundColor: '#991b1b' }}>
              <h3>Confirm User Deletion</h3>
              <button onClick={() => setDeleteConfirmUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                Are you sure you want to delete user <strong>{deleteConfirmUser.full_name}</strong> (<code>{deleteConfirmUser.user_id}</code>)?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                This action will remove the account from the local directory.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmUser(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDeleteUser}
                disabled={submitting}
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
              >
                <Trash2 size={15} />
                <span>{submitting ? 'Deleting...' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
