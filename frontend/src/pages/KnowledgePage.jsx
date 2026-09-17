import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BookOpen, FileText, Upload, Search, Download, Trash2, CheckCircle2, ChevronRight } from 'lucide-react';

export const KnowledgePage = () => {
  const [activeSubTab, setActiveSubTab] = useState('docs'); // docs or kb
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const [docs, setDocs] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Troubleshooting');
  const [docDesc, setDocDesc] = useState('');
  const [docVersion, setDocVersion] = useState('1.0');
  const [docTags, setDocTags] = useState('');

  const categories = [
    'QAD', 'Progress 4GL', 'EDI', 'NiceLabel', 'Bottomline',
    'SQL', 'Interfaces', 'Business Processes', 'Troubleshooting', 'Support Procedures'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'docs') {
        const params = new URLSearchParams();
        if (categoryFilter) params.append('category', categoryFilter);
        if (search) params.append('search', search);
        const res = await api.get(`/documents?${params.toString()}`);
        setDocs(res.data || []);
      } else {
        const params = new URLSearchParams();
        if (categoryFilter) params.append('category', categoryFilter);
        if (search) params.append('search', search);
        const res = await api.get(`/knowledge?${params.toString()}`);
        setKbArticles(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab, categoryFilter, search]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', docTitle);
      formData.append('category', docCategory);
      formData.append('description', docDesc);
      formData.append('version', docVersion);
      formData.append('tags', docTags);

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadModalOpen(false);
      setDocTitle('');
      setDocDesc('');
      fetchData();
    } catch (err) {
      alert('Upload failed: ' + (err.userMessage || 'Check server permissions.'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>Knowledge & Documentation Repository</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            System guides, interface specs, and standard troubleshooting knowledge articles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeSubTab === 'docs' && (
            <button className="btn btn-primary" onClick={() => setUploadModalOpen(true)}>
              <Upload size={16} />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB TAB NAV */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeSubTab === 'docs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('docs')}
        >
          <FileText size={16} />
          <span>Documentation Index</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'kb' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('kb')}
        >
          <BookOpen size={16} />
          <span>Troubleshooting Knowledge Base</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder={activeSubTab === 'docs' ? "Search documentation..." : "Search troubleshooting KB articles..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            className="btn btn-outline-primary"
            onClick={() => { setCategoryFilter(''); setSearch(''); }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* DOCUMENTATION VIEW */}
      {activeSubTab === 'docs' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document ID</th>
                  <th>Title & Description</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading documentation...</td></tr>
                ) : docs.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No documentation files found matching criteria.</td></tr>
                ) : (
                  docs.map(doc => (
                    <tr key={doc.doc_id}>
                      <td style={{ fontWeight: '700', color: '#2563eb' }}>{doc.doc_id}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{doc.description}</div>
                      </td>
                      <td><span className="badge badge-open">{doc.category}</span></td>
                      <td style={{ fontWeight: '600' }}>v{doc.version}</td>
                      <td style={{ fontSize: '0.85rem' }}>{doc.uploaded_by_name}</td>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{doc.uploaded_date}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => alert(`Opening ${doc.title}`)}>
                          <Download size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KNOWLEDGE BASE VIEW */}
      {activeSubTab === 'kb' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {loading ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading KB articles...</div>
          ) : kbArticles.length === 0 ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No Knowledge Base articles found.</div>
          ) : (
            kbArticles.map(art => (
              <div key={art.article_id} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '700', color: '#2563eb' }}>[{art.article_id}]</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{art.title}</h3>
                  </div>
                  <span className="badge badge-open">{art.category}</span>
                </div>

                <div style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong>Problem Summary:</strong> {art.problem_summary}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  {/* Validation Checks */}
                  <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>VALIDATION CHECKS</h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {art.validation_checks.map((chk, i) => <li key={i}>{chk}</li>)}
                    </ul>
                  </div>

                  {/* Solution Steps */}
                  <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>SOLUTION STEPS</h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: '#1e3a8a', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {art.solution_steps.map((stp, i) => <li key={i}>{stp}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>Upload Technical Document</h3>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Document Title *</label>
                  <input type="text" className="form-control" value={docTitle} onChange={e => setDocTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select className="form-control" value={docCategory} onChange={e => setDocCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea className="form-control" rows={3} value={docDesc} onChange={e => setDocDesc(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input type="text" className="form-control" placeholder="e.g. SMTP, Bottomline, Production" value={docTags} onChange={e => setDocTags(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setUploadModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Upload Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
