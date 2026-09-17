import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export const TaskModal = ({ isOpen, onClose, task, onTaskSaved, user }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('Infrastructure');
  const [category, setCategory] = useState('Troubleshooting');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Open');
  const [dueDate, setDueDate] = useState('');
  const [completionPct, setCompletionPct] = useState(0);
  const [relatedTicketId, setRelatedTicketId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setProject(task.project);
      setCategory(task.category);
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.due_date);
      setCompletionPct(task.completion_pct);
      setRelatedTicketId(task.related_ticket_id || '');
    } else {
      setTitle('');
      setDescription('');
      setProject('Infrastructure');
      setCategory('Software Upgrade');
      setPriority('Medium');
      setStatus('Open');
      setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
      setCompletionPct(0);
      setRelatedTicketId('');
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (task) {
        // Edit Task
        const res = await api.put(`/tasks/${task.task_id}`, {
          status,
          completion_pct: parseInt(completionPct),
          due_date: dueDate
        });
        onTaskSaved(res.data);
      } else {
        // Create Task
        const res = await api.post('/tasks', {
          title,
          description,
          project,
          category,
          priority,
          status,
          assignee_id: user.user_id,
          assignee_name: user.full_name,
          start_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          completion_pct: parseInt(completionPct),
          related_ticket_id: relatedTicketId || null
        });
        onTaskSaved(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.userMessage || 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3>{task ? `Edit Task - ${task.task_id}` : 'Create New Internal Task'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Task Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Upgrade NiceLabel Enterprise Server to v10.4"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={!!task}
                required
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Detail task requirements, scope, and objectives..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={!!task}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Project</label>
                <input
                  type="text"
                  className="form-control"
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  disabled={!!task}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={category} onChange={e => setCategory(e.target.value)} disabled={!!task}>
                  <option value="Software Upgrade">Software Upgrade</option>
                  <option value="Performance Optimization">Performance Optimization</option>
                  <option value="Troubleshooting">Troubleshooting</option>
                  <option value="Database Maintenance">Database Maintenance</option>
                  <option value="Interface Setup">Interface Setup</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Priority</label>
                <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)} disabled={!!task}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending / Blocked</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Completion Progress ({completionPct}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={completionPct}
                  onChange={e => setCompletionPct(e.target.value)}
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>

              <div className="form-group">
                <label>Related Ticket (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. INC-10234"
                  value={relatedTicketId}
                  onChange={e => setRelatedTicketId(e.target.value)}
                  disabled={!!task}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={16} />
              <span>{submitting ? 'Saving...' : 'Save Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
