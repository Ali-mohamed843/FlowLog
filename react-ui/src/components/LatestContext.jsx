import React, { useState } from 'react';

const TAG_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#F97316', '#14B8A6'];

function tagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function LatestContext({ snapshot, onSnapshotUpdate }) {
  const [copied, setCopied] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleCopy = () => {
    if (snapshot && snapshot.summary) {
      navigator.clipboard.writeText(snapshot.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || !snapshot) return;
    const current = snapshot.tags || [];
    if (current.includes(tag)) { setTagInput(''); setAddingTag(false); return; }
    const next = [...current, tag];
    await window.electronAPI.updateSnapshotTags(snapshot.id, next);
    if (onSnapshotUpdate) onSnapshotUpdate({ ...snapshot, tags: next });
    setTagInput('');
    setAddingTag(false);
  };

  const handleRemoveTag = async (tag) => {
    if (!snapshot) return;
    const next = (snapshot.tags || []).filter(t => t !== tag);
    await window.electronAPI.updateSnapshotTags(snapshot.id, next);
    if (onSnapshotUpdate) onSnapshotUpdate({ ...snapshot, tags: next });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') handleAddTag();
    if (e.key === 'Escape') { setAddingTag(false); setTagInput(''); }
  };

  if (!snapshot) {
    return (
      <div className="card text-center py-12">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-panel flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </div>
        <p className="text-secondary">
          FlowLog is watching your workspace. Your first context snapshot will appear here in about 60 seconds.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card !pt-6 !pb-6 !px-6">
        <p className="text-context font-context text-primary leading-relaxed">
          {snapshot.summary}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          {snapshot.most_active_file && (
            <span className="metadata-pill font-mono text-xs">{snapshot.most_active_file}</span>
          )}
          {snapshot.git_branch && (
            <span className="metadata-pill font-mono text-xs">{snapshot.git_branch}</span>
          )}
          {snapshot.created_at && (
            <span className="metadata-pill text-xs">
              {new Date(snapshot.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>

        {(snapshot.tags && snapshot.tags.length > 0) || addingTag ? (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {(snapshot.tags || []).map(tag => (
              <span
                key={tag}
                className="metadata-pill"
                style={{
                  backgroundColor: tagColor(tag) + '22',
                  color: tagColor(tag),
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 13, lineHeight: 1 }}
                  title="Remove tag"
                >
                  &times;
                </button>
              </span>
            ))}
            {addingTag ? (
              <input
                className="input"
                style={{ width: 120, padding: '2px 8px', fontSize: 12 }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { setTimeout(() => { setAddingTag(false); setTagInput(''); }, 200); }}
                autoFocus
                placeholder="tag name"
              />
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                style={{
                  background: 'none', border: '1px dashed var(--card-border)', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: '2px 10px', borderRadius: 999, fontSize: 12
                }}
                title="Add tag"
              >
                + Tag
              </button>
            )}
          </div>
        ) : null}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-card-border">
          <button
            className="btn-primary text-sm flex items-center gap-1.5"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy paragraph
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LatestContext;
