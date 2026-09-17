import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { StickyNote, Plus, Trash2, Save } from 'lucide-react';

export const PersonalNotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeNoteId, setActiveNoteId] = useState(null);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notes');
      setNotes(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const url = activeNoteId ? `/notes?note_id=${activeNoteId}` : '/notes';
      await api.post(url, { title, content });
      setTitle('');
      setContent('');
      setActiveNoteId(null);
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      if (activeNoteId === noteId) {
        setTitle('');
        setContent('');
        setActiveNoteId(null);
      }
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectNote = (n) => {
    setActiveNoteId(n.note_id);
    setTitle(n.title);
    setContent(n.content);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>Personal Agent Notes</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Private agent scratchpad for work notes, IP lists, and shift reminders.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => { setActiveNoteId(null); setTitle(''); setContent(''); }}>
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* NOTES LIST */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Saved Notes</h3>
          {loading ? (
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading notes...</div>
          ) : notes.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No personal notes created yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notes.map(n => (
                <div
                  key={n.note_id}
                  onClick={() => handleSelectNote(n)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: activeNoteId === n.note_id ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${activeNoteId === n.note_id ? '#2563eb' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#0f172a' }}>{n.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{n.updated_at}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(n.note_id); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NOTE EDITOR */}
        <div className="card">
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Note Title</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bottomline Server Credentials & IP Checklist"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Note Content</label>
              <textarea
                className="form-control"
                rows={12}
                placeholder="Type private agent notes here..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                <span>{activeNoteId ? 'Update Note' : 'Save Note'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
