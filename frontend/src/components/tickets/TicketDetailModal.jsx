import React, { useState, useEffect, useContext } from 'react';
import {
  X, Plus, Calendar, Clock, User, ShieldAlert, CheckCircle2,
  ExternalLink, Activity, MessageSquare, Bot, AlertCircle,
  RefreshCw, Layers, Timer, ArrowRight, BarChart3, RotateCcw
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';
import { AppContext } from '../../context/AppContext';
import api from '../../services/api';

const STATUS_COLOR_MAP = {
  'Open': '#2563eb',
  'Assigned': '#0ea5e9',
  'Hold': '#ea580c',
  'In progress': '#d97706',
  'In Progress': '#d97706',
  'AB Approval Pending': '#8b5cf6',
  'CAB Approval Pending': '#6366f1',
  'Wait customer': '#a855f7',
  'Wait Customer': '#a855f7',
  'Wait User': '#4f46e5',
  'Pending Review': '#0284c7',
  'Pending': '#db2777',
  'Resolved': '#16a34a',
  'Closed': '#475569',
};

export const TicketDetailModal = ({ isOpen, onClose, ticket, onAddUpdateClick }) => {
  const { getTicketDetail } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('overview'); // overview, activities, updates
  const [activityFilter, setActivityFilter] = useState('all'); // all, Agent, Customer, Automation, Note, System
  const [detailData, setDetailData] = useState(ticket);
  const [loadingLive, setLoadingLive] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Sync or fetch rich details when modal opens or ticket changes
  useEffect(() => {
    if (!ticket) return;
    setDetailData(ticket);
    setFetchError(null);

    // Auto-fetch fresh live ticket detail from Freshdesk API
    fetchLiveTicket(ticket.external_id || ticket.ticket_id);
  }, [ticket]);

  const fetchLiveTicket = async (tid) => {
    if (!tid) return;
    setLoadingLive(true);
    setFetchError(null);
    try {
      // Fetch via cached helper or live endpoint
      const data = await getTicketDetail(tid, true);
      if (data) {
        setDetailData(data);
      }
    } catch (err) {
      console.warn('Could not fetch live ticket detail', err);
      setFetchError('Could not reach Freshdesk API. Showing local ticket information.');
    } finally {
      setLoadingLive(false);
    }
  };

  if (!isOpen || !detailData) return null;

  const currentTicket = detailData;
  const externalId = currentTicket.external_id || currentTicket.ticket_id;
  const freshdeskUrl = `https://cascoauto.freshdesk.com/a/tickets/${externalId}`;

  // Status duration calculations
  const durations = currentTicket.status_durations || {};
  const statusEntries = Object.entries(durations);
  const totalDurationDays = statusEntries.reduce((acc, [, days]) => acc + (parseFloat(days) || 0), 0);
  const totalDaysFormatted = totalDurationDays.toFixed(2);
  const totalHoursFormatted = (totalDurationDays * 24).toFixed(1);

  // Activities (Freshdesk Conversation & Lifecycle Stream)
  const activities = currentTicket.activities || [];
  const filteredActivities = activities.filter(act => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'Agent') return act.category === 'Reply' || (act.actor && act.actor.includes('Agent'));
    if (activityFilter === 'Customer') return act.category === 'Customer' || act.actor === 'Customer' || (act.action_text && act.action_text.includes('Customer'));
    if (activityFilter === 'Automation') return act.category === 'Automation' || (act.actor && act.actor.includes('AI')) || act.category === 'Note';
    if (activityFilter === 'System') return act.category === 'System';
    return true;
  });

  // Internal Work Logs (Portal Only)
  const updates = currentTicket.updates || [];

  return (
    /* Overlay does NOT have onClick={onClose} so clicking outside will not dismiss */
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '920px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        
        {/* MODAL HEADER */}
        <div className="modal-header" style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #0b192c 0%, #1e293b 100%)' }}>
          <div style={{ flex: 1, paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                #{currentTicket.ticket_id}
              </span>
              <h3 style={{ fontSize: '1.08rem', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                {currentTicket.subject}
              </h3>
              {currentTicket.is_stale && (
                <span className="stale-badge" title="No internal update for > 3 days">
                  <ShieldAlert size={12} /> Stale Ticket
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span>Freshdesk Ref: <strong>{externalId}</strong></span>
              <span>•</span>
              <span>Created: {currentTicket.created_at || 'N/A'}</span>
              <span>•</span>
              <span>Last Sync: {currentTicket.last_sync_at || 'Just now'}</span>
              {loadingLive && (
                <span style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={11} className="animate-spin" /> Syncing live Freshdesk data...
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href={freshdeskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'background 0.2s'
              }}
              title="Open actual ticket in Freshdesk portal"
            >
              <ExternalLink size={13} />
              <span>Open in Freshdesk</span>
            </a>

            <button
              onClick={() => fetchLiveTicket(externalId)}
              className="btn btn-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#e2e8f0',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              title="Refresh live details from Freshdesk"
              disabled={loadingLive}
            >
              <RefreshCw size={13} className={loadingLive ? 'animate-spin' : ''} />
            </button>

            {/* Header X button explicitly closes modal */}
            <button 
              onClick={onClose} 
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              title="Close modal"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 24px',
          gap: '8px'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'overview' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'overview' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BarChart3 size={15} />
            <span>Overview & Status Duration</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'activities' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'activities' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'activities' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Activity size={15} />
            <span>Freshdesk Activity – Read Only</span>
            <span style={{
              background: activeTab === 'activities' ? '#dbeafe' : '#e2e8f0',
              color: activeTab === 'activities' ? '#1d4ed8' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              {activities.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'updates' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'updates' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'updates' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MessageSquare size={15} />
            <span>Internal Work Logs – Portal Only</span>
            <span style={{
              background: activeTab === 'updates' ? '#dbeafe' : '#e2e8f0',
              color: activeTab === 'updates' ? '#1d4ed8' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              {updates.length}
            </span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto' }}>
          
          {/* Read-Only Notice Banner */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            marginBottom: '18px',
            fontSize: '0.78rem',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} color="#0284c7" />
              <span>
                <strong>Freshdesk Read-Only Policy</strong>: Status durations and activity stream are retrieved via live GET requests. Internal work logs are stored locally and <u>never written to Freshdesk</u>.
              </span>
            </div>
            <a
              href={freshdeskUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
            >
              cascoauto.freshdesk.com <ExternalLink size={11} />
            </a>
          </div>

          {/* Sync Error Alert if live sync failed */}
          {fetchError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              marginBottom: '18px',
              fontSize: '0.78rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{fetchError}</span>
              <button
                onClick={() => fetchLiveTicket(externalId)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #f87171',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  color: '#991b1b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={11} /> Retry Sync
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW & STATUS DURATION ANALYSIS */}
          {activeTab === 'overview' && (
            <div>
              {/* STATUS DURATION CALCULATION CARD */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '18px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '6px' }}>
                      <Timer size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Status Duration Analysis (Days in Status)
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Calculated from Freshdesk lifecycle timestamps & event transitions
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Lifecycle Duration</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {totalDaysFormatted} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>days</span>
                      <span style={{ fontSize: '0.78rem', color: '#2563eb', marginLeft: '6px', fontWeight: 600 }}>
                        ({totalHoursFormatted} hrs)
                      </span>
                    </div>
                  </div>
                </div>

                {/* VISUAL SEGMENTED DURATION BAR */}
                {statusEntries.length > 0 && totalDurationDays > 0 ? (
                  <div>
                    <div style={{
                      display: 'flex',
                      height: '14px',
                      borderRadius: '7px',
                      overflow: 'hidden',
                      background: '#f1f5f9',
                      marginBottom: '16px',
                      border: '1px solid #e2e8f0'
                    }}>
                      {statusEntries.map(([statusName, days]) => {
                        const pct = Math.max(4, Math.round(((parseFloat(days) || 0) / totalDurationDays) * 100));
                        const bg = STATUS_COLOR_MAP[statusName] || '#64748b';
                        return (
                          <div
                            key={statusName}
                            style={{
                              width: `${pct}%`,
                              background: bg,
                              transition: 'width 0.3s ease'
                            }}
                            title={`${statusName}: ${days} days (${pct}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* STATUS DURATION BREAKDOWN GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`, gap: '12px' }}>
                      {statusEntries.map(([statusName, days]) => {
                        const daysNum = parseFloat(days) || 0;
                        const hoursNum = (daysNum * 24).toFixed(1);
                        const pct = totalDurationDays > 0 ? Math.round((daysNum / totalDurationDays) * 100) : 0;
                        const color = STATUS_COLOR_MAP[statusName] || '#64748b';
                        const isCurrent = currentTicket.status?.toLowerCase() === statusName.toLowerCase();

                        return (
                          <div
                            key={statusName}
                            style={{
                              background: isCurrent ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${isCurrent ? '#86efac' : '#e2e8f0'}`,
                              borderRadius: '8px',
                              padding: '12px 14px',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                  {statusName}
                                </span>
                              </div>
                              {isCurrent && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                                  Active Now
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                              {daysNum} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>days</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.72rem', color: '#64748b' }}>
                              <span>{hoursNum} hours</span>
                              <span style={{ fontWeight: 600 }}>{pct}% of total</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.82rem' }}>
                    {loadingLive ? 'Calculating status durations from Freshdesk timestamps...' : 'Duration timeline will populate automatically as the ticket transitions across statuses.'}
                  </div>
                )}
              </div>

              {/* TICKET DETAILS 4-COL GRID */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '14px',
                marginBottom: '20px',
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>CURRENT STATUS</div>
                  <div style={{ marginTop: '4px' }}><StatusBadge status={currentTicket.status} /></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>PRIORITY</div>
                  <div style={{ marginTop: '4px' }}><PriorityBadge priority={currentTicket.priority} /></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>ASSIGNED AGENT</div>
                  <div style={{ 
                    marginTop: '4px', 
                    fontWeight: '600', 
                    fontSize: '0.85rem',
                    color: (currentTicket.assigned_agent_name === 'Unassigned' || currentTicket.assigned_agent === 'Unassigned') ? '#94a3b8' : '#0f172a',
                    fontStyle: (currentTicket.assigned_agent_name === 'Unassigned' || currentTicket.assigned_agent === 'Unassigned') ? 'italic' : 'normal'
                  }}>
                    {currentTicket.assigned_agent_name || currentTicket.assigned_agent || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>LAST FRESHDESK UPDATE</div>
                  <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#475569' }}>{currentTicket.updated_at || 'N/A'}</div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>TICKET DESCRIPTION</div>
                <div style={{
                  padding: '14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.86rem',
                  color: '#334155',
                  lineHeight: 1.55,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {currentTicket.description || 'No description provided.'}
                </div>
              </div>

              {/* WORK ITEM TAGS */}
              {currentTicket.tags && currentTicket.tags.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>WORK ITEM TAGS</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {currentTicket.tags.map((tag, i) => (
                      <span key={i} style={{ background: '#f1f5f9', color: '#334155', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FRESHDESK ACTIVITY STREAM (READ ONLY) */}
          {activeTab === 'activities' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Freshdesk Activity Details & Communication Stream
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Chronological activity log reconstructed from conversations, agent notes, replies, and system events
                  </span>
                </div>

                {/* Filter chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All (${activities.length})` },
                    { id: 'Agent', label: 'Agent Replies' },
                    { id: 'Customer', label: 'Customer' },
                    { id: 'Automation', label: 'AI & Notes' },
                    { id: 'System', label: 'Status Events' },
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setActivityFilter(filter.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '14px',
                        border: activityFilter === filter.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        background: activityFilter === filter.id ? '#eff6ff' : '#ffffff',
                        color: activityFilter === filter.id ? '#1d4ed8' : '#64748b',
                        fontSize: '0.74rem',
                        fontWeight: activityFilter === filter.id ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredActivities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {filteredActivities.map(act => {
                    let accentColor = '#64748b';
                    let catBg = '#f1f5f9';
                    let catColor = '#475569';

                    if (act.category === 'Automation' || (act.actor && act.actor.includes('AI'))) {
                      accentColor = '#8b5cf6';
                      catBg = '#ede9fe';
                      catColor = '#6d28d9';
                    } else if (act.category === 'Customer' || act.actor === 'Customer') {
                      accentColor = '#10b981';
                      catBg = '#d1fae5';
                      catColor = '#065f46';
                    } else if (act.category === 'Reply' || (act.actor && act.actor.includes('Agent'))) {
                      accentColor = '#3b82f6';
                      catBg = '#dbeafe';
                      catColor = '#1e40af';
                    } else if (act.category === 'Note') {
                      accentColor = '#f59e0b';
                      catBg = '#fef3c7';
                      catColor = '#92400e';
                    }

                    return (
                      <div
                        key={act.activity_id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: `4px solid ${accentColor}`,
                          borderRadius: '8px',
                          padding: '12px 16px',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                              {act.actor}
                            </span>
                            <span style={{
                              background: catBg,
                              color: catColor,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              {act.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            <span>{act.timestamp}</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {act.action_text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                  No activities matching the selected filter.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INTERNAL WORK LOGS – PORTAL ONLY */}
          {activeTab === 'updates' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Internal Work Logs – Portal Only
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Immutable internal work logs recorded inside this portal. Never transmitted to Freshdesk.
                  </span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={onAddUpdateClick}>
                  <Plus size={14} />
                  <span>Add Work Log</span>
                </button>
              </div>

              {updates.length > 0 ? (
                <div className="timeline">
                  {updates.map(upd => (
                    <div key={upd.update_id} className="timeline-item">
                      <div className="timeline-header">
                        <span className="timeline-agent">{upd.agent_name}</span>
                        <span>{upd.timestamp}</span>
                      </div>
                      <div className="timeline-text">{upd.update_text}</div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: '#475569', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', flexWrap: 'wrap' }}>
                        {upd.status_after && <div>Status: <strong>{upd.status_after}</strong></div>}
                        {upd.next_action && <div>Next Action: <strong>{upd.next_action}</strong></div>}
                        {upd.follow_up_date && <div>Follow-up: <strong style={{ color: '#2563eb' }}>{upd.follow_up_date}</strong></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                  No internal work logs have been added yet. Click "Add Work Log" to record agent progress.
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <a
            href={freshdeskUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2563eb',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ExternalLink size={14} />
            <span>Open Ticket #{externalId} in Freshdesk</span>
          </a>

          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Footer Close Button explicitly closes modal */}
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={onAddUpdateClick}>
              <Plus size={16} />
              <span>Add Work Log</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

