import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export const AddTicketUpdateModal = ({ isOpen, onClose, ticket, onUpdateAdded }) => {
  const [updateText, setUpdateText] = useState('');
  const [status, setStatus] = useState(ticket?.status || 'In Progress');
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!updateText.trim()) {
      setError('Please enter update description text.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post(`/tickets/${ticket.ticket_id}/updates`, {
        update_text: updateText,
        status: status,
        next_action: nextAction || null,
        follow_up_date: followUpDate || null
      });

      onUpdateAdded(res.data);
      setUpdateText('');
      setNextAction('');
      setFollowUpDate('');
      onClose();
    } catch (err) {
      setError(err.userMessage || 'Unable to save update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Add Internal Work Update - {ticket.ticket_id}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>Work Update Description *</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="e.g. Checked SMTP configuration on server. Found firewall socket timeout..."
                value={updateText}
                onChange={e => setUpdateText(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Ticket Status</label>
                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending / Blocked</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Follow-up Date (Optional)</label>
                <input
                  type="date"
                  className="form-control"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Next Action Item (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Escalate to network operations for firewall rule review"
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              Note: This update will be recorded strictly in the CASCO Portal Excel database. It will <strong>NOT</strong> modify or post comments to the external Helpdesk.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={16} />
              <span>{submitting ? 'Saving...' : 'Save Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
