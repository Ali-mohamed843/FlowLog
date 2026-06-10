import React, { useState, useEffect } from 'react';

const INTERVAL_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' }
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM` }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') }));

const OLLAMA_MODELS = ['llama3.2', 'llama3.1', 'mistral', 'phi3', 'phi3:mini', 'gemma2', 'codellama', 'qwen2.5'];

function Settings({ settings, onSave, onRefreshSnapshots }) {
  const [workspacePath, setWorkspacePath] = useState(settings.workspacePath || '');

  const [activeProviderId, setActiveProviderId] = useState(settings.activeProviderId || 'default-ollama');
  const [providers, setProviders] = useState(settings.providers || []);

  
  const [provider, setProvider] = useState(settings.provider || 'ollama');
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaModel || 'llama3.2');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');

  
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');

  const [postgresConnectionString, setPostgresConnectionString] = useState(settings.postgresConnectionString || '');
  const [snapshotInterval, setSnapshotInterval] = useState(settings.snapshotInterval || 60);
  const [intervalMode, setIntervalMode] = useState('preset');
  const [customInterval, setCustomInterval] = useState(String(settings.snapshotInterval || 60));
  const [startOnBoot, setStartOnBoot] = useState(settings.startOnBoot || false);
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(settings.dailyDigestEnabled || false);
  const [dailyDigestHour, setDailyDigestHour] = useState(settings.dailyDigestHour || 18);
  const [dailyDigestMinute, setDailyDigestMinute] = useState(settings.dailyDigestMinute || 0);
  const [showKey, setShowKey] = useState(false);
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [digestStatus, setDigestStatus] = useState(null);

  useEffect(() => {
    setWorkspacePath(settings.workspacePath || '');

    setActiveProviderId(settings.activeProviderId || 'default-ollama');
    setProviders(settings.providers || []);

    
    setProvider(settings.provider || 'ollama');
    setOllamaModel(settings.ollamaModel || 'llama3.2');
    setGeminiApiKey(settings.geminiApiKey || '');

    
    const customP = (settings.providers || []).find(p => p.kind === 'openai');
    if (customP) {
      setCustomApiUrl(customP.baseUrl || '');
      setCustomApiKey(customP.apiKey || '');
      setCustomModel(customP.model || '');
    }

    setPostgresConnectionString(settings.postgresConnectionString || '');
    setSnapshotInterval(settings.snapshotInterval || 60);
    setCustomInterval(String(settings.snapshotInterval || 60));
    setIntervalMode(INTERVAL_OPTIONS.some(o => o.value === (settings.snapshotInterval || 60)) ? 'preset' : 'custom');
    setStartOnBoot(settings.startOnBoot || false);
    setDailyDigestEnabled(settings.dailyDigestEnabled || false);
    setDailyDigestHour(settings.dailyDigestHour || 18);
    setDailyDigestMinute(settings.dailyDigestMinute || 0);
  }, [settings]);

  const handleBrowse = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder) setWorkspacePath(folder);
  };

  const handleSave = async () => {
    const customP = {
      id: 'default-custom',
      name: 'Custom API',
      kind: 'openai',
      enabled: provider === 'custom',
      baseUrl: customApiUrl,
      apiKey: customApiKey,
      model: customModel
    };

    
    const builtProviders = [
      { id: 'default-ollama', name: 'Ollama', kind: 'ollama', enabled: provider === 'ollama', baseUrl: 'http://127.0.0.1:11434', apiKey: '', model: ollamaModel },
      { id: 'default-gemini', name: 'Gemini', kind: 'gemini', enabled: provider === 'gemini', baseUrl: '', apiKey: geminiApiKey, model: 'gemini-2.0-flash' },
      customP
    ];

    const nextActiveProviderId = provider === 'custom' ? 'default-custom' : (provider === 'ollama' ? 'default-ollama' : 'default-gemini');

    await onSave({
      workspacePath,
      activeProviderId: nextActiveProviderId,
      providers: builtProviders,
      provider,
      ollamaModel,
      geminiApiKey,
      postgresConnectionString,
      snapshotInterval,
      startOnBoot,
      dailyDigestEnabled,
      dailyDigestHour,
      dailyDigestMinute
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerateDigest = async () => {
    setDigestStatus('Generating...');
    const result = await window.electronAPI.generateDigestNow();
    if (result.ok) {
      setDigestStatus(`Digest saved (${result.count} snapshots)`);
    } else {
      setDigestStatus(result.error || 'Failed');
    }
    setTimeout(() => setDigestStatus(null), 4000);
  };

  const handleDeleteAll = async () => {
    try {
      await window.electronAPI.deleteSnapshots();
      onRefreshSnapshots();
    } catch (err) {
      console.error('Failed to delete snapshots:', err);
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-primary mb-1.5">Workspace folder</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1 font-mono text-sm"
            value={workspacePath}
            onChange={(e) => setWorkspacePath(e.target.value)}
            placeholder="C:\Users\you\projects\..."
          />
          <button className="btn-ghost text-sm" onClick={handleBrowse}>Browse</button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1.5">AI provider</label>
        <div className="flex gap-2">
          <button
            className={`flex-1 btn text-sm ${provider === 'ollama' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProvider('ollama')}
          >
            Ollama
          </button>
          <button
            className={`flex-1 btn text-sm ${provider === 'gemini' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProvider('gemini')}
          >
            Gemini
          </button>
          <button
            className={`flex-1 btn text-sm ${provider === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProvider('custom')}
          >
            Custom API
          </button>
        </div>
      </div>

      {provider === 'ollama' && (
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Ollama model</label>
          <select
            className="input"
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
          >
            {OLLAMA_MODELS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="text-xs text-secondary mt-1">
            Pull it first: <code className="font-mono text-accent">ollama pull {ollamaModel}</code>
          </p>
        </div>
      )}

      {provider === 'gemini' && (
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Gemini API key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className="input font-mono text-sm pr-10"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIza..."
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
              onClick={() => setShowKey(!showKey)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showKey ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </>
                )}
              </svg>
            </button>
          </div>
          <p className="text-xs text-secondary mt-1">
            Get a free key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent hover:underline">aistudio.google.com</a>
          </p>
        </div>
      )}

      {provider === 'custom' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Base URL</label>
            <input
              type="text"
              className="input font-mono text-sm"
              value={customApiUrl}
              onChange={(e) => setCustomApiUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-secondary mt-1">The API endpoint (e.g. OpenAI, Anthropic via proxy, local LLM)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showCustomKey ? 'text' : 'password'}
                className="input font-mono text-sm pr-10"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                onClick={() => setShowCustomKey(!showCustomKey)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showCustomKey ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Model</label>
            <input
              type="text"
              className="input font-mono text-sm"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="gpt-4o, claude-3-sonnet, etc."
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-primary mb-1.5">PostgreSQL connection string</label>
        <input
          type="text"
          className="input font-mono text-sm"
          value={postgresConnectionString}
          onChange={(e) => setPostgresConnectionString(e.target.value)}
          placeholder="postgresql://localhost:5432/devcontext"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1.5">Snapshot interval</label>
        <div className="flex gap-2">
          <select
            className="input"
            value={intervalMode === 'custom' ? 'custom' : snapshotInterval}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setIntervalMode('custom');
                setSnapshotInterval(Number(customInterval) || 60);
              } else {
                setIntervalMode('preset');
                setSnapshotInterval(Number(e.target.value));
              }
            }}
            style={{ maxWidth: 200 }}
          >
            {INTERVAL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            <option value="custom">Custom...</option>
          </select>
          {intervalMode === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="input"
                style={{ width: 100 }}
                value={customInterval}
                onChange={(e) => setCustomInterval(e.target.value)}
                min={1}
              />
              <span className="text-xs text-secondary">seconds</span>
              <button
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => setSnapshotInterval(Number(customInterval) || 60)}
              >
                Set
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={dailyDigestEnabled}
              onChange={(e) => setDailyDigestEnabled(e.target.checked)}
            />
            <div className={`w-10 rounded-full transition-colors ${dailyDigestEnabled ? 'bg-accent' : 'bg-gray-300'}`} style={{ height: '22px', width: '40px' }}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${dailyDigestEnabled ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} style={{ marginTop: '3px' }} />
            </div>
          </div>
          <span className="text-sm text-primary">Daily digest</span>
        </label>
      </div>

      {dailyDigestEnabled && (
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Digest time</label>
          <div className="flex gap-2 items-center">
            <select className="input" style={{ width: 120 }} value={dailyDigestHour} onChange={(e) => setDailyDigestHour(Number(e.target.value))}>
              {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
            <span className="text-secondary text-sm">:</span>
            <select className="input" style={{ width: 80 }} value={dailyDigestMinute} onChange={(e) => setDailyDigestMinute(Number(e.target.value))}>
              {MINUTES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button className="btn-ghost text-sm" onClick={handleGenerateDigest} disabled={digestStatus === 'Generating...'}>
              Generate now
            </button>
          </div>
          {digestStatus && (
            <p className="text-xs mt-1" style={{ color: digestStatus === 'Generating...' ? 'var(--text-secondary)' : 'var(--success)' }}>
              {digestStatus}
            </p>
          )}
          <p className="text-xs text-secondary mt-1">Auto-generates a daily summary note tagged "daily-digest" at the set time</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={startOnBoot}
              onChange={(e) => setStartOnBoot(e.target.checked)}
            />
            <div className={`w-10 rounded-full transition-colors ${startOnBoot ? 'bg-accent' : 'bg-gray-300'}`} style={{ height: '22px', width: '40px' }}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${startOnBoot ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} style={{ marginTop: '3px' }} />
            </div>
          </div>
          <span className="text-sm text-primary">Start with system</span>
        </label>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-card-border">
        <button
          className="btn-danger text-sm"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete all snapshots
        </button>
        <button
          className="btn-primary text-sm flex items-center gap-1.5"
          onClick={handleSave}
        >
          {saved && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          {saved ? 'Saved' : 'Save settings'}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-card rounded shadow-xl p-6 max-w-sm mx-4 border border-card-border">
            <h3 className="text-base font-semibold text-primary mb-2">Delete all snapshots?</h3>
            <p className="text-sm text-secondary mb-5">This will permanently delete all context snapshots for this workspace. This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger text-sm" onClick={handleDeleteAll}>Delete all</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
