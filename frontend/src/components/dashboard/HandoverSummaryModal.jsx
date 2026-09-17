import React, { useState } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';

export const HandoverSummaryModal = ({ isOpen, onClose, tickets = [], tasks = [], user }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const openTickets = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  const openTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  let summaryText = `==================================================\n`;
  summaryText += `CASCO IT SUPPORT HANDOVER SUMMARY - ${dateStr}\n`;
  summaryText += `Agent: ${user?.full_name || 'Agent'} (${user?.external_helpdesk_agent_id})\n`;
  summaryText += `==================================================\n\n`;

  summaryText += `--- OPEN HELPDESK TICKETS (${openTickets.length}) ---\n`;
  if (openTickets.length === 0) {
    summaryText += `No active open tickets.\n`;
  } else {
    openTickets.forEach(t => {
      const lastUpdate = t.updates && t.updates.length > 0 ? t.updates[t.updates.length - 1] : null;
      summaryText += `• Ticket: [${t.ticket_id}] ${t.subject}\n`;
      summaryText += `  Priority: ${t.priority} | Status: ${t.status}\n`;
      summaryText += `  Last Update: ${lastUpdate ? lastUpdate.update_text : 'No internal update logged'}\n`;
      summaryText += `  Next Action: ${lastUpdate?.next_action || 'Pending agent review'}\n`;
      summaryText += `  Follow-up Date: ${lastUpdate?.follow_up_date || 'N/A'}\n`;
      summaryText += `  Blocker: ${t.status === 'Pending' || t.status === 'Blocked' ? 'YES - Awaiting external resolution' : 'None'}\n\n`;
    });
  }

  summaryText += `--- OPEN INTERNAL TASKS (${openTasks.length}) ---\n`;
  if (openTasks.length === 0) {
    summaryText += `No active open tasks.\n`;
  } else {
    openTasks.forEach(t => {
      summaryText += `• Task: [${t.task_id}] ${t.title}\n`;
      summaryText += `  Project: ${t.project} | Category: ${t.category}\n`;
      summaryText += `  Priority: ${t.priority} | Status: ${t.status} (${t.completion_pct}% complete)\n`;
      summaryText += `  Due Date: ${t.due_date} ${t.is_overdue ? '[OVERDUE]' : ''}\n\n`;
    });
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} />
            <h3>Generate Shift Handover Summary</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
            Auto-generated shift handover report summarizing open tickets, status, last updates, next action items, and blockers.
          </p>

          <textarea
            className="form-control"
            value={summaryText}
            readOnly
            rows={14}
            style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#f8fafc', color: '#0f172a', lineHeight: 1.4 }}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Handover Summary'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
