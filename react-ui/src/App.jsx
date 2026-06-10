import React, { useState, useEffect, useCallback } from 'react';
import LatestContext from './components/LatestContext';
import History from './components/History';
import Settings from './components/Settings';
import Tasks from './components/Tasks';
import Notes from './components/Notes';
import Search from './components/Search';
import Activity from './components/Activity';
import SetupWizard from './components/SetupWizard';

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'nord', label: 'Nord' },
  { id: 'forest', label: 'Forest' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'red', label: 'Red' }
];

function App() {
  const [activeTab, setActiveTab] = useState('latest');
  const [settings, setSettings] = useState(null);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s);
      if (s.theme) setTheme(s.theme);
    });
    refreshSnapshots();

    window.electronAPI.onOpenSettings(() => setActiveTab('settings'));
    window.electronAPI.onShowSetup(() => setShowSetup(true));
    window.electronAPI.onMonitoringStateChanged((isActive) => {
      setSettings(prev => prev ? { ...prev, isPaused: !isActive } : prev);
    });
    window.electronAPI.onSnapshotUpdate((data) => {
      if (data) {
        setLatestSnapshot(data);
        setSnapshots(prev => [data, ...prev].slice(0, 50));
      }
    });
    window.electronAPI.onDbStatus((status) => setDbConnected(status));
  }, []);

  const refreshSnapshots = useCallback(async () => {
    const s = await window.electronAPI.getLatestSnapshot();
    if (s) setLatestSnapshot(s);
    const list = await window.electronAPI.getSnapshots();
    if (list) setSnapshots(list);
  }, []);

  const handleSaveSettings = async (newSettings) => {
    await window.electronAPI.saveSettings(newSettings);
    setSettings(prev => prev ? { ...prev, ...newSettings } : newSettings);
    if (newSettings.theme) setTheme(newSettings.theme);
  };

  const handleThemeChange = async (themeId) => {
    setTheme(themeId);
    await window.electronAPI.saveSettings({ theme: themeId });
    setSettings(prev => prev ? { ...prev, theme: themeId } : prev);
  };

  if (showSetup) {
    return <SetupWizard onComplete={() => {
      setShowSetup(false);
      window.electronAPI.getSettings().then((s) => {
        setSettings(s);
        if (s.theme) setTheme(s.theme);
      });
    }} />;
  }

  if (!settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 14 }}>
        Loading...
      </div>
    );
  }

  const tabs = [
    { id: 'latest', label: 'Latest', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'activity', label: 'Activity', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { id: 'tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'notes', label: 'Notes', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-surface)' }}>
      {!dbConnected && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--danger)', color: '#FFFFFF', fontSize: 13, textAlign: 'center', padding: '6px 16px' }}>
          Database not connected — check your connection string in Settings
        </div>
      )}

      <div className="sidebar" style={{ paddingTop: dbConnected ? 0 : 32 }}>
        <div style={{ padding: '20px 16px 16px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>FlowLog</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {settings.isPaused ? 'Paused' : 'Active'}
          </p>
        </div>

        <nav style={{ flex: 1, padding: '0 8px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`btn-sidebar ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                title={t.label}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: theme === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  backgroundColor: t.id === 'light' ? '#F8FAFC' :
                    t.id === 'dark' ? '#1E293B' :
                    t.id === 'sepia' ? '#F5E6CC' :
                    t.id === 'nord' ? '#E5E9F0' :
                    t.id === 'forest' ? '#E0EDE0' :
                    t.id === 'sunset' ? '#FDEEE2' :
                    '#FEE2E2'
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ padding: '8px 16px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: settings.isPaused ? '#94A3B8' : 'var(--success)',
            flexShrink: 0
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {settings.isPaused ? 'Paused' : 'Monitoring'}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {activeTab === 'latest' && (
            <LatestContext snapshot={latestSnapshot} onSnapshotUpdate={setLatestSnapshot} />
          )}
          {activeTab === 'history' && (
            <History snapshots={snapshots} />
          )}
          {activeTab === 'activity' && (
            <Activity dbConnected={dbConnected} />
          )}
          {activeTab === 'tasks' && (
            <Tasks dbConnected={dbConnected} workspacePath={settings.workspacePath} />
          )}
          {activeTab === 'notes' && (
            <Notes dbConnected={dbConnected} workspacePath={settings.workspacePath} />
          )}
          {activeTab === 'search' && (
            <Search dbConnected={dbConnected} />
          )}
          {activeTab === 'settings' && (
            <Settings
              settings={settings}
              onSave={handleSaveSettings}
              onRefreshSnapshots={refreshSnapshots}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
