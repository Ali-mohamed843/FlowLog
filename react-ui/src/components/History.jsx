import React, { useState } from 'react';

const TAG_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#F97316', '#14B8A6'];

function tagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function formatGroupLabel(dateStr) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const d = new Date(dateStr);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function History({ snapshots, onTagFilter }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filterTag, setFilterTag] = useState(null);

  const allTags = [...new Set(snapshots.flatMap(s => s.tags || []))].sort();

  const filtered = filterTag
    ? snapshots.filter(s => s.tags && s.tags.includes(filterTag))
    : snapshots;

  const grouped = {};
  for (const s of filtered) {
    const label = formatGroupLabel(s.created_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(s);
  }

  const handleTagClick = (tag) => {
    setFilterTag(filterTag === tag ? null : tag);
    if (onTagFilter) onTagFilter(filterTag === tag ? null : tag);
  };

  if (snapshots.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-secondary">No snapshots recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-secondary mr-1">Tags:</span>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className="metadata-pill"
              style={{
                backgroundColor: filterTag === tag ? tagColor(tag) : (tagColor(tag) + '22'),
                color: filterTag === tag ? '#FFF' : tagColor(tag),
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s'
              }}
            >
              {tag}
              {filterTag === tag && ' ×'}
            </button>
          ))}
        </div>
      )}

      {filterTag && (
        <p className="text-xs text-secondary">
          Filtered by tag: <strong>{filterTag}</strong> — <a href="#" onClick={(e) => { e.preventDefault(); setFilterTag(null); }} style={{ color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer' }}>clear</a>
        </p>
      )}

      {Object.entries(grouped).length === 0 && filterTag ? (
        <div className="card text-center py-8">
          <p className="text-secondary text-sm">No snapshots with tag "{filterTag}"</p>
        </div>
      ) : (
        Object.entries(grouped).map(([label, items]) => (
          <div key={label}>
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">{label}</h3>
            <div className="space-y-2">
              {items.map((snap) => {
                const isExpanded = expandedId === snap.id;
                const firstSentence = snap.summary.split(/\.|\n/)[0] + '.';

                return (
                  <div
                    key={snap.id}
                    className="card !p-4 cursor-pointer hover:border-accent/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-secondary font-medium">
                            {new Date(snap.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          {snap.most_active_file && (
                            <span className="text-xs text-accent font-mono truncate">{snap.most_active_file}</span>
                          )}
                          {snap.git_branch && (
                            <span className="text-xs text-secondary font-mono">{snap.git_branch}</span>
                          )}
                        </div>
                        <p className={`text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {isExpanded ? snap.summary : firstSentence}
                        </p>
                        {snap.tags && snap.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {snap.tags.map(t => (
                              <span
                                key={t}
                                className="metadata-pill"
                                style={{
                                  backgroundColor: tagColor(t) + '22',
                                  color: tagColor(t),
                                  fontSize: 10,
                                  fontWeight: 500
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`text-secondary shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default History;
