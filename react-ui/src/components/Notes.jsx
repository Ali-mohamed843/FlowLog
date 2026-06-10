import React, { useState, useEffect } from 'react';

function Notes({ dbConnected, workspacePath }) {
  const [notes, setNotes] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    if (dbConnected) loadNotes();
  }, [dbConnected, workspacePath]);

  const loadNotes = async () => {
    const n = await window.electronAPI.getNotes();
    setNotes(n || []);
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    const firstLine = newContent.trim().split('\n')[0].slice(0, 60);
    await window.electronAPI.createNote({ title: firstLine, content: newContent.trim(), workspace_path: workspacePath });
    setNewContent('');
    loadNotes();
    window.electronAPI.sendNotification({ title: 'Note saved', body: firstLine });
  };

  const handleDelete = async (id) => {
    await window.electronAPI.deleteNote(id);
    loadNotes();
  };

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id) => {
    if (!editContent.trim()) return;
    const firstLine = editContent.trim().split('\n')[0].slice(0, 60);
    await window.electronAPI.updateNote(id, { title: firstLine, content: editContent.trim() });
    setEditingId(null);
    loadNotes();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      handleAdd();
    }
  };

  if (!dbConnected) {
    return (
      <div className="card text-center py-12">
        <p className="text-secondary">Connect a database in Settings to use Notes.</p>
      </div>
    );
  }

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const SHOW_LEN = 250;

  return (
    <div>
      <div className="mb-4">
        <textarea
          className="input"
          rows={3}
          placeholder="Write a note... (Shift+Enter to save)"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
        <div className="flex justify-end mt-2">
          <button className="btn-primary" onClick={handleAdd} disabled={!newContent.trim()}>Add note</button>
        </div>
      </div>

      <div className="space-y-2">
        {notes.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-secondary text-sm">No notes yet.</p>
          </div>
        )}
        {notes.map((note) => {
          const isExpanded = expandedIds.has(note.id);
          const isLong = note.content.length > SHOW_LEN;

          return (
            <div key={note.id} className="card !p-4">
              {editingId === note.id ? (
                <div>
                  <textarea
                    className="input"
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                    style={{ resize: 'vertical', fontFamily: 'inherit', maxHeight: 300, overflowY: 'auto' }}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                    <button className="btn-primary" onClick={() => handleSaveEdit(note.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                    {isLong && !isExpanded ? note.content.slice(0, SHOW_LEN) + '...' : note.content}
                  </div>
                  {isLong && (
                    <button
                      onClick={() => toggleExpanded(note.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--accent)', padding: '4px 0', fontSize: 13, fontWeight: 500
                      }}
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-card-border" style={{ opacity: 0.6 }}>
                    <span className="text-xs text-secondary">
                      {new Date(note.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleStartEdit(note)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-secondary)', padding: 4, borderRadius: 6, fontSize: 12
                        }}
                        title="Edit note"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-secondary)', padding: 4, borderRadius: 6, fontSize: 12
                        }}
                        title="Delete note"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Notes;
