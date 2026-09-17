import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import api from '../services/api';
import { StatusBadge, PriorityBadge, WorkloadBadge, RoleBadge } from '../components/common/StatusBadge';
import { MultiStatusFilter } from '../components/common/MultiStatusFilter';
import { UNRESOLVED_STATUSES } from '../constants/statusConfig';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';
import { AddTicketUpdateModal } from '../components/tickets/AddTicketUpdateModal';
import { TaskModal } from '../components/tasks/TaskModal';
import { 
  ArrowLeft, 
  Ticket, 
  CheckSquare, 
  Clock, 
  BookOpen, 
  Plus, 
  Search, 
  AlertCircle, 
  Calendar, 
  User, 
  Mail, 
  Shield, 
  Layers, 
  CheckCircle2,
  RefreshCw,
  Inbox
} from 'lucide-react';

export const AgentDetailPage = () => {
  const { user } = useContext(AuthContext);
  const { selectedAgentId, setActiveTab } = useContext(AppContext);

  const [agentData, setAgentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('tickets'); // tickets, tasks, updates, docs

  // Modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [updateModalTicket, setUpdateModalTicket] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Filters
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatuses, setTicketStatuses] = useState([]);
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('ALL');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [updateSearch, setUpdateSearch] = useState('');

  const targetAgentId = selectedAgentId || user?.user_id || user?.id;

  const fetchAgentDetails = async () => {
    if (!targetAgentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/agents/${targetAgentId}`);
      setAgentData(res.data);
    } catch (err) {
      console.error('Failed to fetch agent workspace', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentDetails();
  }, [targetAgentId]);

  if (loading || !agentData) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px auto', color: '#2563eb' }} />
        <p style={{ fontWeight: 600 }}>Loading Agent Workspace...</p>
      </div>
    );
  }

  const { agent, kpis, workload_status, tickets, tasks, updates } = agentData;

  // Filtered tickets
  const filteredTickets = (tickets || []).filter(tk => {
    // Multi-status filter
    if (ticketStatuses && ticketStatuses.length > 0) {
      const currentStatus = tk.status || '';
      const matched = ticketStatuses.some(s => s.toLowerCase() === currentStatus.toLowerCase());
      if (!matched) return false;
    }
    // Priority filter
    if (ticketPriorityFilter !== 'ALL' && (tk.priority || '').toLowerCase() !== ticketPriorityFilter.toLowerCase()) {
      return false;
    }
    // Search query
    if (ticketSearch.trim()) {
      const q = ticketSearch.toLowerCase();
      const matchId = String(tk.ticket_id).toLowerCase().includes(q);
      const matchExtId = String(tk.external_id || '').toLowerCase().includes(q);
      const matchSub = (tk.subject || '').toLowerCase().includes(q);
      const matchReq = (tk.requester_name || '').toLowerCase().includes(q);
      if (!matchId && !matchExtId && !matchSub && !matchReq) return false;
    }
    return true;
  });


  // Filtered tasks
  const filteredTasks = (tasks || []).filter(tsk => {
    if (taskStatusFilter !== 'ALL' && (tsk.status || '').toLowerCase() !== taskStatusFilter.toLowerCase()) {
      return false;
    }
    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase();
      const matchTitle = (tsk.title || '').toLowerCase().includes(q);
      const matchDesc = (tsk.description || '').toLowerCase().includes(q);
      const matchProj = (tsk.project || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchProj) return false;
    }
    return true;
  });

  // Filtered updates
  const filteredUpdates = (updates || []).filter(u => {
    if (!updateSearch.trim()) return true;
    const q = updateSearch.toLowerCase();
    const matchId = (u.id || '').toLowerCase().includes(q);
    const matchText = (u.update_text || '').toLowerCase().includes(q);
    const matchTitle = (u.title || '').toLowerCase().includes(q);
    return matchId || matchText || matchTitle;
  });

  return (
    <div className="agent-workspace-page" style={{ paddingBottom: '40px' }}>
      {/* Top Breadcrumb / Return */}
      <div style={{ marginBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'none', 
            border: 'none', 
            color: '#2563eb', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '0.86rem',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Team Dashboard</span>
        </button>
      </div>

      {/* Agent Identity & Profile Header Card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '20px', borderLeft: '4px solid #2563eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          {/* Agent Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              fontWeight: '700'
            }}>
              {(agent?.full_name || 'Agent').charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {agent?.full_name}
                </h1>
                <RoleBadge role={agent?.role} />
                <WorkloadBadge status={workload_status} />
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 600, 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  backgroundColor: agent?.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                  color: agent?.status === 'Active' ? '#166534' : '#991b1b',
                  border: `1px solid ${agent?.status === 'Active' ? '#bbf7d0' : '#fecaca'}`
                }}>
                  {agent?.status || 'Active'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: '#64748b', marginTop: '6px', flexWrap: 'wrap' }}>
                <span>User ID: <strong>{agent?.user_id}</strong></span>
                <span>•</span>
                <span>Email: <strong>{agent?.email}</strong></span>
                <span>•</span>
                <span>Helpdesk Agent ID: <strong>{agent?.external_helpdesk_agent_id ? `#${agent.external_helpdesk_agent_id}` : 'Not Linked'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={fetchAgentDetails}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Highlights Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div 
            onClick={() => { setTicketStatuses([...UNRESOLVED_STATUSES]); setTicketPriorityFilter('ALL'); setActiveSubTab('tickets'); }}
            style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>OPEN TICKETS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: kpis?.open_tickets > 0 ? '#2563eb' : '#94a3b8' }}>
              {kpis?.open_tickets ?? 0}
            </div>
          </div>
          <div 
            onClick={() => { setTicketStatuses([]); setTicketPriorityFilter('ALL'); setActiveSubTab('tickets'); }}
            style={{ backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#dc2626' }}>OVERDUE TICKETS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: kpis?.overdue_tickets > 0 ? '#dc2626' : '#94a3b8' }}>
              {kpis?.overdue_tickets ?? 0}
            </div>
          </div>
          <div 
            onClick={() => { setTicketStatuses([]); setTicketPriorityFilter('ALL'); setActiveSubTab('tickets'); }}
            style={{ backgroundColor: '#fffbeb', padding: '10px 14px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d97706' }}>DUE TODAY</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: kpis?.due_today_tickets > 0 ? '#d97706' : '#94a3b8' }}>
              {kpis?.due_today_tickets ?? 0}
            </div>
          </div>
          <div 
            onClick={() => { setTicketStatuses([]); setTicketPriorityFilter('High'); setActiveSubTab('tickets'); }}
            style={{ backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b91c1c' }}>CRITICAL / HIGH</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: kpis?.critical_high_tickets > 0 ? '#b91c1c' : '#94a3b8' }}>
              {kpis?.critical_high_tickets ?? 0}
            </div>
          </div>
          <div 
            onClick={() => setActiveSubTab('tasks')}
            style={{ backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#166534' }}>ACTIVE TASKS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
              {kpis?.total_tasks ?? (tasks?.length || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveSubTab('tickets')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'tickets' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeSubTab === 'tickets' ? '#2563eb' : '#64748b',
            fontWeight: activeSubTab === 'tickets' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Ticket size={16} />
          <span>Helpdesk Tickets ({tickets?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tasks')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'tasks' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeSubTab === 'tasks' ? '#2563eb' : '#64748b',
            fontWeight: activeSubTab === 'tasks' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <CheckSquare size={16} />
          <span>My Tasks ({tasks?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('updates')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'updates' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeSubTab === 'updates' ? '#2563eb' : '#64748b',
            fontWeight: activeSubTab === 'updates' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Clock size={16} />
          <span>Work Updates Feed ({updates?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('docs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'docs' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeSubTab === 'docs' ? '#2563eb' : '#64748b',
            fontWeight: activeSubTab === 'docs' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <BookOpen size={16} />
          <span>Knowledge & Quick Reference</span>
        </button>
      </div>

      {/* SUB-TAB 1: HELPDESK TICKETS */}
      {activeSubTab === 'tickets' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Assigned Helpdesk Tickets (Read-Only)
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Tickets fetched live from Freshdesk mapped to responder ID {agent?.external_helpdesk_agent_id ? `#${agent.external_helpdesk_agent_id}` : 'N/A'}.
              </p>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  style={{ padding: '6px 10px 6px 30px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {/* Multi-Status Filter */}
              <MultiStatusFilter
                selectedStatuses={ticketStatuses}
                onChange={setTicketStatuses}
              />

              {/* Priority Filter */}
              <select
                value={ticketPriorityFilter}
                onChange={e => setTicketPriorityFilter(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="ALL">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {(ticketSearch || ticketStatuses.length > 0 || ticketPriorityFilter !== 'ALL') && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setTicketSearch('');
                    setTicketStatuses([]);
                    setTicketPriorityFilter('ALL');
                  }}
                  style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>


          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Ticket #</th>
                  <th>Subject</th>
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
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      <Inbox size={32} style={{ margin: '0 auto 8px auto', color: '#94a3b8' }} />
                      <p style={{ fontWeight: 600, margin: 0 }}>No tickets found for this agent.</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                        Ensure the user profile has the correct Helpdesk Agent ID mapped.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(tk => (
                    <tr 
                      key={tk.ticket_id} 
                      onClick={() => setSelectedTicket(tk)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: '700', color: '#2563eb' }}>#{tk.ticket_id}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 500 }}>{tk.subject}</span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>{tk.requester_name || 'Customer'}</td>
                      <td><PriorityBadge priority={tk.priority} /></td>
                      <td><StatusBadge status={tk.status} /></td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{tk.updated_at ? tk.updated_at.split('T')[0] : 'N/A'}</td>
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
      )}

      {/* SUB-TAB 2: MY TASKS */}
      {activeSubTab === 'tasks' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Internal Task Management
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Local tasks, migrations, and operational maintenance for {agent?.full_name}.
              </p>
            </div>

            {/* Filter & Add Task */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={e => setTaskSearch(e.target.value)}
                  style={{ padding: '6px 10px 6px 30px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <select
                value={taskStatusFilter}
                onChange={e => setTaskStatusFilter(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>

              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
              >
                <Plus size={14} />
                <span>New Task</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Category</th>
                  <th style={{ width: '90px' }}>Priority</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th>Due Date</th>
                  <th style={{ width: '180px' }}>Progress</th>
                  <th style={{ width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto', color: '#94a3b8' }} />
                      <p style={{ fontWeight: 600, margin: 0 }}>No tasks found.</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Click "New Task" to create one.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(tsk => (
                    <tr key={tsk.task_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{tsk.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {tsk.task_id} • {tsk.project}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>{tsk.category}</td>
                      <td><PriorityBadge priority={tsk.priority} /></td>
                      <td><StatusBadge status={tsk.status} /></td>
                      <td style={{ fontSize: '0.8rem', color: tsk.is_overdue ? '#dc2626' : '#475569', fontWeight: tsk.is_overdue ? 700 : 400 }}>
                        {tsk.due_date} {tsk.is_overdue && '⚠️'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${tsk.completion_pct}%`, background: '#2563eb', height: '100%' }}></div>
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>{tsk.completion_pct}%</span>
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingTask(tsk);
                            setTaskModalOpen(true);
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MY UPDATES (Work updates feed) */}
      {activeSubTab === 'updates' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Append-Only Work Log Stream
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Permanent audit trail of all actions and notes logged by {agent?.full_name}.
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search update logs..."
                value={updateSearch}
                onChange={e => setUpdateSearch(e.target.value)}
                style={{ padding: '6px 10px 6px 30px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '220px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredUpdates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                <Clock size={32} style={{ margin: '0 auto 8px auto', color: '#94a3b8' }} />
                <p style={{ fontWeight: 600, margin: 0 }}>No updates logged yet for this agent.</p>
              </div>
            ) : (
              filteredUpdates.map((item, idx) => (
                <div key={idx} style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '0.88rem' }}>[{item.type}] {item.id}</span>
                      <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.85rem' }}>{item.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={item.status} />
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.timestamp}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#334155', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                    {item.update_text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: KNOWLEDGE & DOCS */}
      {activeSubTab === 'docs' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            Quick Reference Technical Knowledge
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '20px' }}>
            Standard operating procedures and runbooks for resolving recurring issues.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                Freshdesk Status Calculation Rules
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Status durations calculate the elapsed time in days each ticket spends in Open, In Progress, and Pending states.
              </p>
            </div>

            <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                Strict Read-Only Integration Policy
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                The CASCO portal only issues GET requests to Freshdesk. No ticket assignments, closes, or public notes are written back.
              </p>
            </div>

            <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                Workload Attention Thresholds
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Overdue indicates SLA breached tickets. Critical indicates $\ge 3$ High/Critical tickets or $\ge 25$ total open queue items.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <TicketDetailModal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        onAddUpdateClick={() => {
          setUpdateModalTicket(selectedTicket);
          setSelectedTicket(null);
        }}
      />

      <AddTicketUpdateModal
        isOpen={!!updateModalTicket}
        onClose={() => setUpdateModalTicket(null)}
        ticket={updateModalTicket}
        onUpdateAdded={() => {
          fetchAgentDetails();
        }}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        user={agent ? { user_id: agent.user_id, full_name: agent.full_name } : user}
        onTaskSaved={() => {
          fetchAgentDetails();
        }}
      />
    </div>
  );
};
