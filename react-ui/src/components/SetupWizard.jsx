import React, { useState } from 'react';

const OLLAMA_MODELS = ['llama3.2', 'llama3.1', 'mistral', 'phi3', 'phi3:mini', 'gemma2', 'codellama', 'qwen2.5'];

function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [workspacePath, setWorkspacePath] = useState('');
  const [provider, setProvider] = useState('ollama');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showCustomKey, setShowCustomKey] = useState(false);

  const [postgresConnectionString, setPostgresConnectionString] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleBrowse = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder) setWorkspacePath(folder);
  };

  const handleStart = async () => {
    const nextProviders = [
      { id: 'default-ollama', name: 'Ollama', kind: 'ollama', enabled: provider === 'ollama', baseUrl: 'http://127.0.0.1:11434', apiKey: '', model: ollamaModel },
      { id: 'default-gemini', name: 'Gemini', kind: 'gemini', enabled: provider === 'gemini', baseUrl: '', apiKey: geminiApiKey, model: 'gemini-2.0-flash' },
      { id: 'default-custom', name: 'Custom API', kind: 'openai', enabled: provider === 'custom', baseUrl: customApiUrl, apiKey: customApiKey, model: customModel }
    ];

    const nextActiveProviderId = provider === 'custom' ? 'default-custom' : (provider === 'ollama' ? 'default-ollama' : 'default-gemini');

    await window.electronAPI.saveSettings({
      workspacePath,
      activeProviderId: nextActiveProviderId,
      providers: nextProviders,
      provider,
      ollamaModel,
      geminiApiKey,
      postgresConnectionString,
      hasCompletedSetup: true
    });
    onComplete();
  };


  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-primary">FlowLog</h1>
          <p className="text-sm text-secondary mt-1">Set up your FlowLog developer tracker</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s ? 'bg-accent text-white' : 'bg-panel text-secondary'}`}>
                {s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 transition-colors ${step > s ? 'bg-accent' : 'bg-panel'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold text-primary mb-1">Choose your workspace folder</h2>
              <p className="text-sm text-secondary mb-4">The folder where you code every day.</p>
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
              <div className="flex justify-end mt-6">
                <button
                  className="btn-primary text-sm"
                  disabled={!workspacePath}
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-base font-semibold text-primary mb-1">Choose your AI provider</h2>
              <p className="text-sm text-secondary mb-4">
                Ollama runs locally (free, private). Gemini uses Google's API (free tier).
              </p>
              <div className="flex gap-2 mb-4">
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
              {provider === 'ollama' && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">Model</label>
                  <select className="input" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)}>
                    {OLLAMA_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <p className="text-xs text-secondary mt-1">
                    Run: <code className="font-mono text-accent">ollama pull {ollamaModel}</code>
                  </p>
                </div>
              )}
              {provider === 'gemini' && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">API key</label>
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
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
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
                    Free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent hover:underline">aistudio.google.com</a>
                  </p>
                </div>
              )}
              {provider === 'custom' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5">Base URL</label>
                    <input type="text" className="input font-mono text-sm" value={customApiUrl} onChange={(e) => setCustomApiUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5">API Key</label>
                    <div className="relative">
                      <input type={showCustomKey ? 'text' : 'password'} className="input font-mono text-sm pr-10" value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} placeholder="sk-..." />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary" onClick={() => setShowCustomKey(!showCustomKey)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {showCustomKey ? (
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
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
                    <input type="text" className="input font-mono text-sm" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="gpt-4o, claude-3-sonnet, etc." />
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-6">
                <button className="btn-ghost text-sm" onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary text-sm" onClick={() => setStep(3)}>Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-base font-semibold text-primary mb-1">Connect your database</h2>
              <p className="text-sm text-secondary mb-4">
                You can use a local PostgreSQL database or a free cloud database from{' '}
                <a href="https://neon.tech" target="_blank" rel="noreferrer" className="text-accent hover:underline">Neon</a>{' '}
                or{' '}
                <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">Supabase</a>.
              </p>
              <input
                type="text"
                className="input font-mono text-sm"
                value={postgresConnectionString}
                onChange={(e) => setPostgresConnectionString(e.target.value)}
                placeholder="postgresql://localhost:5432/devcontext"
              />
              <div className="flex justify-between mt-6">
                <button className="btn-ghost text-sm" onClick={() => setStep(2)}>Back</button>
                <button className="btn-primary text-sm" disabled={!postgresConnectionString} onClick={() => setStep(4)}>Next</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-base font-semibold text-primary mb-1">Ready to go</h2>
              <div className="text-sm text-secondary space-y-2 mb-4">
                <p>Workspace: <span className="font-mono text-primary">{workspacePath}</span></p>
                <p>AI: <span className="font-mono text-primary">{provider === 'ollama' ? `Ollama (${ollamaModel})` : provider === 'gemini' ? 'Gemini' : `Custom API (${customModel})`}</span></p>
                <p>Database: <span className="font-mono text-primary">{postgresConnectionString.substring(0, 40)}...</span></p>
              </div>
              <button className="btn-primary text-sm w-full" onClick={handleStart}>
                Start Monitoring
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupWizard;
