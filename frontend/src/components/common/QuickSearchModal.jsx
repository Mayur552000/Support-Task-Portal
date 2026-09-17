import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import api from '../../services/api';
import { Search, X, Ticket, CheckSquare, FileText, BookOpen, Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const QuickSearchModal = () => {
  const { searchModalOpen, setSearchModalOpen, setActiveTab, navigateToTicketsWithFilter } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setLoading(true);
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/search?query=${encodeURIComponent(query)}`);
          setResults(res.data.results || []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  if (!searchModalOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'Ticket': return <Ticket size={16} color="#2563eb" />;
      case 'Task': return <CheckSquare size={16} color="#10b981" />;
      case 'Update': return <Clock size={16} color="#f59e0b" />;
      case 'Document': return <FileText size={16} color="#8b5cf6" />;
      case 'Knowledge Base': return <BookOpen size={16} color="#06b6d4" />;
      default: return <Search size={16} />;
    }
  };

  const handleSelectResult = (item) => {
    setSearchModalOpen(false);
    if (item.type === 'Ticket' || item.type === 'Update') {
      navigateToTicketsWithFilter({ search: item.id });
    } else if (item.type === 'Task') {
      setActiveTab('tasks');
    } else if (item.type === 'Document') {
      setActiveTab('docs');
    } else if (item.type === 'Knowledge Base') {
      setActiveTab('kb');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setSearchModalOpen(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <Search size={20} color="#64748b" />
          <input
            type="text"
            className="form-control"
            placeholder="Global search across Tickets, Tasks, Updates, Docs & KB..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            style={{ border: 'none', boxShadow: 'none', fontSize: '1rem' }}
          />
          <button onClick={() => setSearchModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '420px', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Searching CASCO Portal repository...</div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
              {query.length < 2 ? 'Type at least 2 characters to search across all portal entities.' : 'No matching results found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectResult(res)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
                      {getIcon(res.type)}
                      <span>{res.title}</span>
                    </div>
                    <span className="badge badge-open" style={{ fontSize: '0.7rem' }}>{res.type}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', paddingLeft: '24px' }}>{res.snippet}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
