import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import api from '../services/api';
import { StatusBadge, PriorityBadge } from '../components/common/StatusBadge';
import { TaskModal } from '../components/tasks/TaskModal';
import { Search, Download, Plus, CheckSquare, Calendar } from 'lucide-react';

export const MyTasksPage = () => {
  const { user } = useContext(AuthContext);
  const { taskFilter, setTaskFilter } = useContext(AppContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (taskFilter.status) params.append('status', taskFilter.status);
      if (taskFilter.priority) params.append('priority', taskFilter.priority);
      if (taskFilter.category) params.append('category', taskFilter.category);
      if (taskFilter.search) params.append('search', taskFilter.search);

      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [taskFilter]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (taskFilter.status) params.append('status', taskFilter.status);
    if (taskFilter.priority) params.append('priority', taskFilter.priority);
    if (taskFilter.search) params.append('search', taskFilter.search);

    window.open(`http://localhost:8000/api/tasks/export?${params.toString()}`, '_blank');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>Internal Task Management</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Track independent internal support tasks, progress percentages, and due dates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={15} />
            <span>Export to Excel</span>
          </button>

          <button className="btn btn-primary" onClick={() => { setSelectedTask(null); setTaskModalOpen(true); }}>
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search tasks..."
              value={taskFilter.search}
              onChange={e => setTaskFilter(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <select
            className="form-control"
            value={taskFilter.status}
            onChange={e => setTaskFilter(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending / Blocked</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            className="form-control"
            value={taskFilter.priority}
            onChange={e => setTaskFilter(prev => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          <select
            className="form-control"
            value={taskFilter.category}
            onChange={e => setTaskFilter(prev => ({ ...prev, category: e.target.value }))}
          >
            <option value="">All Categories</option>
            <option value="Software Upgrade">Software Upgrade</option>
            <option value="Performance Optimization">Performance Optimization</option>
            <option value="Troubleshooting">Troubleshooting</option>
            <option value="Database Maintenance">Database Maintenance</option>
          </select>

          <button
            className="btn btn-outline-primary"
            onClick={() => setTaskFilter({ status: '', priority: '', category: '', search: '' })}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* TASK DATA TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Title & Description</th>
                <th>Project & Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Completion %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading tasks...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No tasks found matching active criteria.</td></tr>
              ) : (
                tasks.map(tsk => (
                  <tr key={tsk.task_id} onClick={() => { setSelectedTask(tsk); setTaskModalOpen(true); }}>
                    <td style={{ fontWeight: '700', color: '#2563eb' }}>{tsk.task_id}</td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{tsk.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tsk.description}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{tsk.project}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tsk.category}</div>
                    </td>
                    <td><PriorityBadge priority={tsk.priority} /></td>
                    <td><StatusBadge status={tsk.status} /></td>
                    <td style={{ fontSize: '0.82rem', color: tsk.is_overdue ? '#ef4444' : '#475569', fontWeight: tsk.is_overdue ? 'bold' : 'normal' }}>
                      {tsk.due_date} {tsk.is_overdue && '(Overdue)'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden', width: '80px' }}>
                          <div style={{ width: `${tsk.completion_pct}%`, background: tsk.completion_pct === 100 ? '#10b981' : '#2563eb', height: '100%' }}></div>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>{tsk.completion_pct}%</span>
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setSelectedTask(tsk); setTaskModalOpen(true); }}
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

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={selectedTask}
        onTaskSaved={() => fetchTasks()}
        user={user}
      />
    </div>
  );
};
