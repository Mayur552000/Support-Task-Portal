import React from 'react';
import { getStatusConfig } from '../../constants/statusConfig';

export const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);

  return (
    <span 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.73rem',
        fontWeight: '700',
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ fontSize: '0.65rem' }}>●</span>
      {status || 'Open'}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const p = (priority || '').toLowerCase();
  let badgeClass = 'badge-medium';
  if (p === 'low') badgeClass = 'badge-low';
  else if (p === 'medium') badgeClass = 'badge-medium';
  else if (p === 'high') badgeClass = 'badge-high';
  else if (p === 'critical') badgeClass = 'badge-critical';

  return <span className={`badge ${badgeClass}`}>{priority || 'Medium'}</span>;
};

export const WorkloadBadge = ({ status }) => {
  const s = (status || 'Normal').toLowerCase();
  let bg = '#ecfdf5';
  let color = '#065f46';
  let border = '#a7f3d0';

  if (s === 'high') {
    bg = '#fffbeb';
    color = '#b45309';
    border = '#fde68a';
  } else if (s === 'overdue') {
    bg = '#fef2f2';
    color = '#b91c1c';
    border = '#fecaca';
  } else if (s === 'critical') {
    bg = '#450a0a';
    color = '#fef2f2';
    border = '#991b1b';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`
    }}>
      ● {status || 'Normal'}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const r = (role || 'AGENT').toUpperCase();
  let bg = '#f1f5f9';
  let color = '#475569';
  if (r === 'ADMIN') {
    bg = '#eff6ff';
    color = '#1d4ed8';
  } else if (r === 'LEAD') {
    bg = '#faf5ff';
    color = '#7e22ce';
  }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: '700',
      backgroundColor: bg,
      color: color,
      border: '1px solid #cbd5e1'
    }}>
      {r}
    </span>
  );
};
