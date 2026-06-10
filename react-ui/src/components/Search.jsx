import React, { useState, useRef } from 'react';

function Search({ dbConnected }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  const handleSearch = async () => {
    if (!query.trim() || !dbConnected) return;
    setSearching(true);
    const r = await window.electronAPI.searchAll(query.trim());
    setResults(r);
    setSearching(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (!dbConnected) {
    return (
      <div className="card text-center py-12">
        <p className="text-secondary">Connect a database in Settings to search.</p>
      </div>
    );
  }

  const total = results ? results.snapshots.length + results.tasks.length + results.notes.length : 0;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          className="input flex-1"
          placeholder="Search snapshots, tasks, notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button className="btn-primary" onClick={handleSearch} disabled={!query.trim() || searching}>
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {results && total > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-secondary font-medium">{total} result{total !== 1 ? 's' : ''} for "{query}"</p>

          {results.snapshots.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Snapshots ({results.snapshots.length})
              </h3>
              <div className="space-y-2">
                {results.snapshots.map((s) => (
                  <div key={'s' + s.id} className="card !p-3">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {s.preview && s.preview.length > 200 ? s.preview.slice(0, 200) + '...' : s.preview}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-secondary">{formatTime(s.created_at)}</span>
                      {s.tags && s.tags.length > 0 && s.tags.map(t => (
                        <span key={t} className="metadata-pill" style={{ fontSize: 10 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.tasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Tasks ({results.tasks.length})
              </h3>
              <div className="space-y-1.5">
                {results.tasks.map((t) => (
                  <div key={'t' + t.id} className="card !p-3 flex items-center gap-3">
                    <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{t.preview}</span>
                    {t.tags && t.tags.length > 0 && t.tags.map(tag => (
                      <span key={tag} className="metadata-pill" style={{ fontSize: 10 }}>{tag}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.notes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Notes ({results.notes.length})
              </h3>
              <div className="space-y-2">
                {results.notes.map((n) => (
                  <div key={'n' + n.id} className="card !p-3">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {n.preview}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-secondary">{formatTime(n.created_at)}</span>
                      {n.tags && n.tags.length > 0 && n.tags.map(tag => (
                        <span key={tag} className="metadata-pill" style={{ fontSize: 10 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!results && (
        <div className="card text-center py-12">
          <p className="text-secondary text-sm">
            {query ? 'Press Enter or click Search' : 'Type a query above to search across all your data'}
          </p>
        </div>
      )}
    </div>
  );
}

export default Search;
