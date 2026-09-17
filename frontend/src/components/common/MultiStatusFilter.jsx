import React, { useState, useRef, useEffect } from 'react';
import { 
  FRESHDESK_STATUS_DEFINITIONS, 
  UNRESOLVED_STATUSES, 
  ALL_STATUS_LABELS 
} from '../../constants/statusConfig';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export const MultiStatusFilter = ({ selectedStatuses = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isAllUnresolvedSelected = () => {
    if (selectedStatuses.length !== UNRESOLVED_STATUSES.length) return false;
    return UNRESOLVED_STATUSES.every(s => selectedStatuses.includes(s));
  };

  const isAllSelected = () => {
    return selectedStatuses.length === ALL_STATUS_LABELS.length;
  };

  const handleToggleStatus = (statusLabel) => {
    if (selectedStatuses.includes(statusLabel)) {
      onChange(selectedStatuses.filter(s => s !== statusLabel));
    } else {
      onChange([...selectedStatuses, statusLabel]);
    }
  };

  const handleSelectAllUnresolved = () => {
    if (isAllUnresolvedSelected()) {
      onChange([]);
    } else {
      onChange([...UNRESOLVED_STATUSES]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected()) {
      onChange([]);
    } else {
      onChange([...ALL_STATUS_LABELS]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Filtered status definitions for search
  const filteredDefinitions = FRESHDESK_STATUS_DEFINITIONS.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Label for trigger button
  const getButtonLabel = () => {
    if (selectedStatuses.length === 0) return 'All Statuses';
    if (isAllUnresolvedSelected()) return 'All Unresolved';
    if (isAllSelected()) return 'All Statuses (12)';
    if (selectedStatuses.length === 1) return selectedStatuses[0];
    return `Status: ${selectedStatuses.length} selected`;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '7px 12px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          background: selectedStatuses.length > 0 ? '#eff6ff' : '#ffffff',
          color: selectedStatuses.length > 0 ? '#1d4ed8' : '#334155',
          fontSize: '0.83rem',
          fontWeight: selectedStatuses.length > 0 ? 600 : 500,
          cursor: 'pointer',
          minWidth: '160px'
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {getButtonLabel()}
        </span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          width: '260px',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          zIndex: 1000,
          padding: '8px 0',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          {/* Quick Action Header */}
          <div style={{ padding: '0 10px 8px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search statuses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  fontSize: '0.78rem',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSelectAllUnresolved}
                style={{
                  padding: '3px 7px',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  border: '1px solid #bfdbfe',
                  background: isAllUnresolvedSelected() ? '#dbeafe' : '#f0f9ff',
                  color: '#1d4ed8',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All Unresolved
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  padding: '3px 7px',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  padding: '3px 7px',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  border: '1px solid #fee2e2',
                  background: '#fef2f2',
                  color: '#dc2626',
                  cursor: 'pointer'
                }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Status List with Checkboxes */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px 0' }}>
            {filteredDefinitions.map(s => {
              const isChecked = selectedStatuses.includes(s.label);
              return (
                <label
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    color: '#1e293b',
                    cursor: 'pointer',
                    background: isChecked ? '#f8fafc' : 'transparent',
                    userSelect: 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isChecked ? '#f8fafc' : 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleStatus(s.label)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                  <span style={{ flex: 1, fontWeight: isChecked ? 600 : 400 }}>{s.label}</span>
                  {s.group === 'resolved' && (
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>Resolved</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
