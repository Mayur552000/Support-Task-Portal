/**
 * Central Freshdesk Ticket Status Configuration for CASCO IT Portal
 * Maps numeric codes, display labels, logical groupings (unresolved vs resolved),
 * and UI badge color classes.
 */

export const FRESHDESK_STATUS_DEFINITIONS = [
  {
    code: 2,
    label: 'Open',
    group: 'unresolved',
    badgeClass: 'badge-open',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  {
    code: 11,
    label: 'Assigned',
    group: 'unresolved',
    badgeClass: 'badge-open',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  {
    code: 9,
    label: 'In Progress',
    group: 'unresolved',
    badgeClass: 'badge-progress',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a'
  },
  {
    code: 10,
    label: 'Hold',
    group: 'unresolved',
    badgeClass: 'badge-pending',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa'
  },
  {
    code: 14,
    label: 'AB Approval Pending',
    group: 'unresolved',
    badgeClass: 'badge-pending',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#e9d5ff'
  },
  {
    code: 15,
    label: 'CAB Approval Pending',
    group: 'unresolved',
    badgeClass: 'badge-pending',
    color: '#9333ea',
    bgColor: '#faf5ff',
    borderColor: '#f3e8ff'
  },
  {
    code: 9001,
    label: 'Wait Customer',
    group: 'unresolved',
    badgeClass: 'badge-pending',
    color: '#c026d3',
    bgColor: '#fdf4ff',
    borderColor: '#f5d0fe'
  },
  {
    code: 9002,
    label: 'Wait User',
    group: 'unresolved',
    badgeClass: 'badge-pending',
    color: '#4f46e5',
    bgColor: '#eef2ff',
    borderColor: '#c7d2fe'
  },
  {
    code: 9003,
    label: 'Pending Review',
    group: 'unresolved',
    badgeClass: 'badge-pending',
    color: '#0891b2',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc'
  },
  {
    code: 3,
    label: 'Pending',
    group: 'unresolved',
    badgeClass: 'badge-pending',
    color: '#db2777',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8'
  },
  {
    code: 4,
    label: 'Resolved',
    group: 'resolved',
    badgeClass: 'badge-completed',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  {
    code: 5,
    label: 'Closed',
    group: 'resolved',
    badgeClass: 'badge-completed',
    color: '#475569',
    bgColor: '#f8fafc',
    borderColor: '#cbd5e1'
  }
];

export const UNRESOLVED_STATUSES = FRESHDESK_STATUS_DEFINITIONS
  .filter(s => s.group === 'unresolved')
  .map(s => s.label);

export const ALL_STATUS_LABELS = FRESHDESK_STATUS_DEFINITIONS.map(s => s.label);

export const getStatusConfig = (statusName) => {
  if (!statusName) return FRESHDESK_STATUS_DEFINITIONS[0];
  const sLower = String(statusName).trim().toLowerCase();
  
  const found = FRESHDESK_STATUS_DEFINITIONS.find(s => 
    s.label.toLowerCase() === sLower || 
    sLower.includes(s.label.toLowerCase()) ||
    s.label.toLowerCase().includes(sLower)
  );

  if (found) return found;

  // Fallback heuristic
  if (sLower.includes('resolved') || sLower.includes('closed')) {
    return {
      label: statusName,
      group: 'resolved',
      badgeClass: 'badge-completed',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0'
    };
  }
  if (sLower.includes('progress')) {
    return {
      label: statusName,
      group: 'unresolved',
      badgeClass: 'badge-progress',
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a'
    };
  }
  if (sLower.includes('pending') || sLower.includes('hold') || sLower.includes('wait')) {
    return {
      label: statusName,
      group: 'unresolved',
      badgeClass: 'badge-pending',
      color: '#ea580c',
      bgColor: '#fff7ed',
      borderColor: '#fed7aa'
    };
  }

  return {
    label: statusName,
    group: 'unresolved',
    badgeClass: 'badge-open',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe'
  };
};
