import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import api from '../services/api';
import { KPICard } from '../components/common/KPICard';
import { StatusBadge, PriorityBadge, WorkloadBadge, RoleBadge } from '../components/common/StatusBadge';
import { MultiStatusFilter } from '../components/common/MultiStatusFilter';
import { UNRESOLVED_STATUSES } from '../constants/statusConfig';
import { HandoverSummaryModal } from '../components/dashboard/HandoverSummaryModal';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';

import { 
  Users, 
  UserPlus,
  AlertTriangle, 
  Clock, 
  Flame, 
  Inbox, 
  CheckCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  UserCheck, 
  ArrowRight,
  ShieldAlert,
  FileText
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const { 
    setActiveTab,
    navigateToTicketsWithFilter, 
    navigateToAgentWorkspace,
    isHelpdeskOnline, 
    triggerSync, 
    lastSyncTime,
    getTeamDashboard
  } = useContext(AppContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Table filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgent, setFilterAgent] = useState('ALL');
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterPriority, setFilterPriority] = useState('ALL');

  const loadTeamDashboard = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const dashboardData = await getTeamDashboard(forceRefresh);
      setData(dashboardData);
    } catch (err) {
      console.error('Failed to load team dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamDashboard(false);
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await triggerSync();
    await loadTeamDashboard(true);
    setSyncing(false);
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px auto', color: '#2563eb' }} />
        <p style={{ fontWeight: 600 }}>Loading CASCO Team Dashboard & Live Freshdesk Sync...</p>
      </div>
    );
  }

  const kpis = data?.team_kpis || data?.kpis || {
    total_open_tickets: 0,
    total_overdue_tickets: 0,
    tickets_due_today: 0,
    critical_high_tickets: 0,
    unassigned_tickets: 0,
    total_active_agents: 0
  };
  const agentCards = data?.agent_cards || [];
  const teamTickets = data?.team_tickets || [];

  // Filtered tickets
  const filteredTickets = teamTickets.filter(tk => {
    // Agent Filter
    if (filterAgent !== 'ALL') {
      const qAgent = filterAgent.toLowerCase();
      const isUnassigned = !tk.assigned_agent_id || tk.assigned_agent_id === '0' || tk.assigned_agent_id === 'None' || (tk.assigned_agent_name || '').toLowerCase() === 'unassigned';
      if (filterAgent === 'Unassigned') {
        if (!isUnassigned) return false;
      } else {
        const matchesAgent = (tk.assigned_agent_name || '').toLowerCase() === qAgent ||
                              (tk.assigned_agent || '').toLowerCase() === qAgent ||
                              (tk.assigned_agent_id || '').toLowerCase() === qAgent;
        if (!matchesAgent) return false;
      }
    }

    // Status Filter (Multi-select)
    if (filterStatuses.length > 0) {
      const currentStatus = tk.status || '';
      const matched = filterStatuses.some(s => s.toLowerCase() === currentStatus.toLowerCase());
      if (!matched) return false;
    }

    // Priority Filter
    if (filterPriority !== 'ALL') {
      if ((tk.priority || '').toLowerCase() !== filterPriority.toLowerCase()) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = String(tk.ticket_id).toLowerCase().includes(q);
      const matchExtId = String(tk.external_id || '').toLowerCase().includes(q);
      const matchSub = (tk.subject || '').toLowerCase().includes(q);
      const matchReq = (tk.requester_name || '').toLowerCase().includes(q);
      const matchAgent = (tk.assigned_agent_name || tk.assigned_agent || '').toLowerCase().includes(q);
      if (!matchId && !matchExtId && !matchSub && !matchReq && !matchAgent) return false;
    }
    return true;
  });

  return (
    <div className="team-dashboard-page" style={{ paddingBottom: '40px' }}>
      {/* Synchronization Alert Banner */}
      {!isHelpdeskOnline && (
        <div style={{ padding: '12px 18px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} color="#d97706" />
          <span><strong>Helpdesk Synchronization Alert</strong>: External Helpdesk API is currently offline. Displaying cached tickets.</span>
        </div>
      )}

      {/* Header & Global Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Team Support Dashboard</h1>
            <span style={{ padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
              READ-ONLY HELPDESK
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
            Real-time workload metrics, agent capacity, and live ticket statuses across the support organization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setActiveTab('admin')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Users size={15} />
            <span>Manage Users & Agents</span>
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleManualSync}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Freshdesk'}</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setHandoverModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <FileText size={15} />
            <span>Shift Handover Summary</span>
          </button>
        </div>
      </div>

      {/* 6 TEAM KPI METRICS CARDS */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <KPICard
          title="Total Open Tickets"
          value={kpis.total_open_tickets}
          subtitle="All active unresolved queue"
          type="info"
          onClick={() => { setFilterStatuses([...UNRESOLVED_STATUSES]); }}
        />
        <KPICard
          title="Overdue Tickets"
          value={kpis.overdue_tickets}
          subtitle="SLA breached / stale"
          type="danger"
          onClick={() => { setFilterStatuses([]); }}
        />
        <KPICard
          title="Due Today"
          value={kpis.due_today_tickets}
          subtitle="Require action today"
          type="warning"
          onClick={() => { setFilterStatuses([]); }}
        />
        <KPICard
          title="Critical / High"
          value={kpis.critical_high_tickets}
          subtitle="Priority attention items"
          type="danger"
          onClick={() => { setFilterPriority('High'); }}
        />
        <KPICard
          title="Unassigned Tickets"
          value={kpis.unassigned_tickets}
          subtitle="Awaiting agent allocation"
          type="neutral"
          onClick={() => { setFilterAgent('Unassigned'); }}
        />
        <KPICard
          title="Active Support Agents"
          value={kpis.total_active_agents}
          subtitle="Team capacity roster"
          type="success"
        />
      </div>


      {/* AGENT WORKLOAD & CAPACITY SECTION */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Agent Workload & Capacity Cards
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Click any agent card to drill down into their dedicated Workspace (Tickets, Tasks, Internal Updates, Docs).
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}
            >
              <UserPlus size={14} />
              <span>+ Add Agent / Manage Users</span>
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {agentCards.length} Registered Agents
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {agentCards.map(card => {
            const isCritical = card.workload_status === 'Critical';
            const isOverdue = card.workload_status === 'Overdue';
            const isHigh = card.workload_status === 'High';

            let cardBorderColor = '#e2e8f0';
            if (isCritical) cardBorderColor = '#ef4444';
            else if (isOverdue) cardBorderColor = '#f87171';
            else if (isHigh) cardBorderColor = '#f59e0b';

            return (
              <div 
                key={card.agent_id}
                onClick={() => navigateToAgentWorkspace(card.agent_id)}
                style={{
                  backgroundColor: '#ffffff',
                  border: `1.5px solid ${cardBorderColor}`,
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                }}
              >
                {/* Agent Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.96rem', color: '#0f172a' }}>{card.name}</span>
                      <RoleBadge role={card.role} />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                      ID: <strong>{card.user_id}</strong> • {card.email}
                    </div>
                  </div>
                  <WorkloadBadge status={card.workload_status} />
                </div>

                {/* KPI Metrics Mini-Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  backgroundColor: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>OPEN</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: card.open_tickets > 0 ? '#0f172a' : '#94a3b8' }}>
                      {card.open_tickets}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>OVERDUE</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: card.overdue_tickets > 0 ? '#dc2626' : '#94a3b8' }}>
                      {card.overdue_tickets}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600 }}>DUE TODAY</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: card.due_today_tickets > 0 ? '#d97706' : '#94a3b8' }}>
                      {card.due_today_tickets}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 600 }}>CRIT/HIGH</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: card.critical_high_tickets > 0 ? '#b91c1c' : '#94a3b8' }}>
                      {card.critical_high_tickets}
                    </div>
                  </div>
                </div>

                {/* Footer Drill-Down Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#2563eb', fontWeight: '600' }}>
                  <span>Open Agent Workspace</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TEAM TICKETS OVERVIEW SECTION */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Team Tickets Overview
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Live Helpdesk ticket queue. Click any ticket to inspect conversation thread, history, and status durations.
            </p>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing <strong>{filteredTickets.length}</strong> of <strong>{teamTickets.length}</strong> tickets
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          backgroundColor: '#f8fafc',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Ticket #, subject, requester..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Filter by Agent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Agent:</label>
            <select
              value={filterAgent}
              onChange={e => setFilterAgent(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.83rem', background: '#ffffff' }}
            >
              <option value="ALL">All Agents</option>
              <option value="Unassigned">Unassigned</option>
              {agentCards.map(a => (
                <option key={a.agent_id} value={a.name}>{a.name} ({a.user_id})</option>
              ))}
            </select>
          </div>

          {/* Filter by Status (Multi-Select) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Status:</label>
            <MultiStatusFilter
              selectedStatuses={filterStatuses}
              onChange={setFilterStatuses}
            />
          </div>

          {/* Filter by Priority */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Priority:</label>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.83rem', background: '#ffffff' }}
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchTerm || filterAgent !== 'ALL' || filterStatuses.length > 0 || filterPriority !== 'ALL') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchTerm('');
                setFilterAgent('ALL');
                setFilterStatuses([]);
                setFilterPriority('ALL');
              }}
              style={{ fontSize: '0.78rem', padding: '6px 10px' }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Tickets Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Ticket #</th>
                <th>Subject</th>
                <th>Assigned Agent</th>
                <th>Requester</th>
                <th style={{ width: '100px' }}>Priority</th>
                <th style={{ width: '110px' }}>Status</th>
                <th>Last Updated</th>
                <th>Status Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    <Inbox size={32} style={{ margin: '0 auto 8px auto', color: '#94a3b8' }} />
                    <p style={{ fontWeight: 600, margin: 0 }}>No tickets found matching your criteria.</p>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Try adjusting your search terms or filter selection.</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(tk => (
                  <tr 
                    key={tk.ticket_id} 
                    onClick={() => setSelectedTicket(tk)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: '700', color: '#2563eb' }}>
                      #{tk.ticket_id}
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 500 }}>{tk.subject}</span>
                    </td>
                    <td>
                      <span style={{ 
                        fontWeight: 600, 
                        color: (tk.assigned_agent_name === 'Unassigned' || tk.assigned_agent === 'Unassigned') ? '#94a3b8' : '#0f172a',
                        fontStyle: (tk.assigned_agent_name === 'Unassigned' || tk.assigned_agent === 'Unassigned') ? 'italic' : 'normal'
                      }}>
                        {tk.assigned_agent_name || tk.assigned_agent || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {tk.requester_name || 'Customer'}
                    </td>
                    <td><PriorityBadge priority={tk.priority} /></td>
                    <td><StatusBadge status={tk.status} /></td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {tk.updated_at ? tk.updated_at.split('T')[0] : 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>
                      {tk.status_durations ? (
                        tk.status_durations[tk.status] 
                          ? `${tk.status_durations[tk.status]} in ${tk.status}` 
                          : `${tk.status_durations.days_since_created || 0}d active`
                      ) : (
                        `${tk.days_in_status || 0}d`
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SHIFT HANDOVER SUMMARY MODAL */}
      <HandoverSummaryModal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        tickets={teamTickets}
        tasks={[]}
        user={user}
      />

      {/* TICKET DETAIL MODAL (Read-only Helpdesk view + Local updates) */}
      <TicketDetailModal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        onAddUpdateClick={() => {
          setSelectedTicket(null);
        }}
      />
    </div>
  );
};

