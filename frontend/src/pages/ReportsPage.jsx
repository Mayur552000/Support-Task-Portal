import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart3, Download, Users, CheckCircle, Clock } from 'lucide-react';

export const ReportsPage = () => {
  const [workload, setWorkload] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [resW, resS] = await Promise.all([
        api.get('/reports/agent'),
        api.get('/reports/summary')
      ]);
      setWorkload(resW.data || []);
      setSummary(resS.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>Management Reports & Analytics</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Agent workload distribution, update activity, and resolution summaries.
          </p>
        </div>
      </div>

      {/* AGENT WORKLOAD SUMMARY */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Agent Workload Breakdown</h3>
          <span className="badge badge-open">Active Team Roster</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Role</th>
                <th>Open Tickets</th>
                <th>Open Tasks</th>
                <th>Overdue Tasks</th>
                <th>Total Work Updates</th>
                <th>Completed Items</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading workload report...</td></tr>
              ) : (
                workload.map(row => (
                  <tr key={row.agent_id}>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>{row.agent_name}</td>
                    <td><span className="badge badge-open">{row.role}</span></td>
                    <td style={{ fontWeight: '600', color: '#2563eb' }}>{row.open_tickets}</td>
                    <td style={{ fontWeight: '600', color: '#2563eb' }}>{row.open_tasks}</td>
                    <td style={{ fontWeight: '700', color: row.overdue_tasks > 0 ? '#ef4444' : '#475569' }}>
                      {row.overdue_tasks}
                    </td>
                    <td style={{ fontWeight: '600' }}>{row.total_updates}</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>{row.completed_items}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SYSTEM METRICS SUMMARY */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>Ticket Status Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(summary.tickets.by_status).map(([st, count]) => (
                <div key={st} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <span>{st}</span>
                  <span style={{ fontWeight: '700', color: '#2563eb' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>Task Status Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(summary.tasks.by_status).map(([st, count]) => (
                <div key={st} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <span>{st}</span>
                  <span style={{ fontWeight: '700', color: '#2563eb' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
