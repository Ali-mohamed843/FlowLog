import React, { useState, useEffect } from 'react';

function Tasks({ dbConnected, workspacePath }) {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('medium');

  useEffect(() => {
    if (dbConnected) loadTasks();
  }, [dbConnected, workspacePath]);

  const loadTasks = async () => {
    const t = await window.electronAPI.getTasks();
    setTasks(t || []);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await window.electronAPI.createTask({ title: newTitle.trim(), priority: newPriority, workspace_path: workspacePath });
    setNewTitle('');
    loadTasks();
    window.electronAPI.sendNotification({ title: 'Task added', body: newTitle.trim() });
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    await window.electronAPI.updateTask(task.id, { status: nextStatus });
    loadTasks();
    if (nextStatus === 'done') {
      window.electronAPI.sendNotification({ title: 'Task completed', body: task.title });
    }
  };

  const handleDelete = async (id) => {
    await window.electronAPI.deleteTask(id);
    loadTasks();
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority || 'medium');
  };

  const handleSaveEdit = async (id) => {
    if (!editTitle.trim()) return;
    await window.electronAPI.updateTask(id, { title: editTitle.trim(), priority: editPriority });
    setEditingId(null);
    loadTasks();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  if (!dbConnected) {
    return (
      <div className="card text-center py-12">
        <p className="text-secondary">Connect a database in Settings to use Tasks.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="Add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <select
          className="input w-auto"
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          style={{ width: 100 }}
        >
          <option value="low">Low</option>
          <option value="medium">Med</option>
          <option value="high">High</option>
        </select>
        <button className="btn-primary" onClick={handleAdd} disabled={!newTitle.trim()}>Add</button>
      </div>

      <div className="space-y-1.5">
        {tasks.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-secondary text-sm">No tasks yet. Add one above.</p>
          </div>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="card !p-3 flex items-center gap-3"
            style={{ opacity: task.status === 'done' ? 0.55 : 1 }}
          >
            <button
              onClick={() => handleToggleStatus(task)}
              style={{
                width: 20, height: 20, borderRadius: 6, border: '2px solid var(--text-secondary)',
                background: task.status === 'done' ? 'var(--accent)' : 'transparent',
                cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s'
              }}
            >
              {task.status === 'done' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === task.id ? (
                <div className="flex gap-2" style={{ alignItems: 'center' }}>
                  <input className="input flex-1" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                  <select className="input" style={{ width: 90 }} value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Med</option>
                    <option value="high">High</option>
                  </select>
                  <button className="btn-primary" onClick={() => handleSaveEdit(task.id)}>Save</button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      color: 'var(--text-primary)', fontSize: 14
                    }}
                  >
                    {task.title}
                  </span>
                  {task.priority === 'high' && (
                    <span className="metadata-pill" style={{ backgroundColor: 'var(--danger)', color: '#FFF', fontSize: 10 }}>High</span>
                  )}
                  {task.priority === 'medium' && (
                    <span className="metadata-pill" style={{ fontSize: 10 }}>Med</span>
                  )}
                  {task.priority === 'low' && (
                    <span className="metadata-pill" style={{ fontSize: 10 }}>Low</span>
                  )}
                </div>
              )}
            </div>

            {editingId !== task.id && (
              <button
                onClick={() => handleStartEdit(task)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: 4, borderRadius: 6
                }}
                title="Edit task"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => handleDelete(task.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', padding: 4, borderRadius: 6
              }}
              title="Delete task"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Tasks;
