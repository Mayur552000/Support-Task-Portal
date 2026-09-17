import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { StatusBadge, PriorityBadge } from '../components/common/StatusBadge';
import { MultiStatusFilter } from '../components/common/MultiStatusFilter';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';
import { AddTicketUpdateModal } from '../components/tickets/AddTicketUpdateModal';
import { Search, Download, Filter, Plus, ShieldAlert, RefreshCw, ExternalLink, User } from 'lucide-react';

export const MyTicketsPage = () => {
  const { user } = useContext(AuthContext);
  const { ticketFilter, setTicketFilter, triggerSync, getTickets } = useContext(AppContext);
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [updateModalTicket, setUpdateModalTicket] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Fetch registered agents for filter dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setAgents(res.data || []);
      } catch (e) {
        console.warn('Failed to load user list for agent filter', e);
      }
    };
    fetchUsers();
  }, []);

  const fetchTicketList = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const filterParams = {
        priority: ticketFilter.priority,
        search: ticketFilter.search,
        agent: ticketFilter.agent
      };
      // For backend query, if single status or pass all
      if (ticketFilter.statuses && ticketFilter.statuses.length === 1) {
        filterParams.status = ticketFilter.statuses[0];
      }
      const data = await getTickets(filterParams, forceRefresh);
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketList(false);
  }, [ticketFilter.priority, ticketFilter.search, ticketFilter.agent]);

  // Client-side multi-status filtering
  const filteredTickets = tickets.filter(tk => {
    if (ticketFilter.statuses && ticketFilter.statuses.length > 0) {
      const currentStatus = tk.status || '';
      const matched = ticketFilter.statuses.some(s => s.toLowerCase() === currentStatus.toLowerCase());
      if (!matched) return false;
    }
    return true;
  });

  const handleExport = () => {
    const params = new URLSearchParams();
    if (ticketFilter.statuses && ticketFilter.statuses.length > 0) {
      params.append('status', ticketFilter.statuses.join(','));
    }
    if (ticketFilter.priority) params.append('priority', ticketFilter.priority);
    if (ticketFilter.search) params.append('search', ticketFilter.search);
    if (ticketFilter.agent) params.append('agent_id', ticketFilter.agent);

    window.open(`http://localhost:8000/api/tickets/export?${params.toString()}`, '_blank');
  };

  const handleSyncClick = async () => {
    setSyncing(true);
    await triggerSync();
    await fetchTicketList(true);
    setSyncing(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Team Helpdesk Tickets
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Live read-only Freshdesk tickets across all agents. Filter by any agent, inspect details, and append internal work logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleSyncClick} disabled={syncing}>
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing Freshdesk...' : 'Sync Freshdesk (GET)'}</span>
          </button>

          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={15} />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search Ticket #, Subject, Agent, Tag..."
              value={ticketFilter.search || ''}
              onChange={e => setTicketFilter(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          {/* Filter by Agent */}
          <select
            className="form-control"
            value={ticketFilter.agent || ''}
            onChange={e => setTicketFilter(prev => ({ ...prev, agent: e.target.value }))}
          >
            <option value="">All Agents (Entire Team)</option>
            <option value="Unassigned">Unassigned Tickets</option>
            {agents.map(a => (
              <option key={a.id || a.user_id} value={a.user_id}>
                {a.full_name} ({a.user_id})
              </option>
            ))}
            {/* Any agent names from tickets not in user list */}
            {Array.from(new Set(tickets.map(t => t.assigned_agent_name).filter(n => n && !agents.some(a => a.full_name === n) && n !== 'Unassigned'))).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Filter by Status (Multi-Select) */}
          <div>
            <MultiStatusFilter
              selectedStatuses={ticketFilter.statuses || []}
              onChange={newStatuses => setTicketFilter(prev => ({ ...prev, statuses: newStatuses }))}
            />
          </div>

          {/* Filter by Priority */}
          <select
            className="form-control"
            value={ticketFilter.priority || ''}
            onChange={e => setTicketFilter(prev => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Reset button */}
          <button
            className="btn btn-outline-primary"
            onClick={() => setTicketFilter({ statuses: [], priority: '', search: '', agent: '' })}
            style={{ whiteSpace: 'nowrap' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* TICKET DATA TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Ticket</th>
                <th>Subject</th>
                <th style={{ width: '100px' }}>Priority</th>
                <th style={{ width: '130px' }}>Status & Duration</th>
                <th>Assigned Agent</th>
                <th>Last Sync</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Work Logs</th>
                <th style={{ width: '110px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading tickets...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No tickets found matching the selected filters.</td></tr>
              ) : (
                filteredTickets.map(tk => {
                  const currentStatusDuration = tk.status_durations ? tk.status_durations[tk.status] : null;
                  return (
                    <tr key={tk.ticket_id} onClick={() => setSelectedTicket(tk)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: '700', color: '#2563eb' }}>
                        #{tk.ticket_id}
                        {tk.is_stale && (
                          <div style={{ marginTop: '2px' }}>
                            <span className="stale-badge"><ShieldAlert size={10} /> Stale</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{tk.subject}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Freshdesk Ref: #{tk.external_id}</div>
                      </td>
                      <td><PriorityBadge priority={tk.priority} /></td>
                      <td>
                        <StatusBadge status={tk.status} />
                        {currentStatusDuration !== undefined && currentStatusDuration !== null && (
                          <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: '3px', fontWeight: 600 }}>
                            ⏱ {currentStatusDuration}d in status
                          </div>
                        )}
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
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{tk.last_sync_at}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>
                        {tk.updates?.length || 0} entries
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setUpdateModalTicket(tk)}
                            title="Add internal work log"
                          >
                            <Plus size={13} /> Log
                          </button>
                          <a
                            href={`https://cascoauto.freshdesk.com/a/tickets/${tk.external_id || tk.ticket_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 7px' }}
                            title="Open ticket in Freshdesk"
                          >
                            <ExternalLink size={13} />
                          </a>
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
          fetchTicketList(true);
        }}
      />
    </div>
  );
};

