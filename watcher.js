const { BrowserWindow } = require('electron');
const { createFileWatcher } = require('./fileWatcher');
const { getGitInfo } = require('./gitWatcher');
const { getRecentCommands } = require('./shellHistory');
const { generateContextSummary } = require('./aiSummary');
const { runMigration, saveSnapshot, getRecentSnapshots, testConnection } = require('./db');

let intervalId = null;
let fileWatcher = null;
let isRunning = false;
let tickTimeout = null;

async function watcherTick(store, updateTooltip) {
  const workspacePath = store.get('workspacePath');
  
  const providers = store.get('providers') || [];
  const activeProviderId = store.get('activeProviderId');

  
  const enabledProviders = providers.filter(p => p && p.enabled);
  const active = enabledProviders.find(p => p.id === activeProviderId) || enabledProviders[0] || null;

  const connStr = store.get('postgresConnectionString');

  if (!workspacePath || store.get('isPaused')) return;

  const startTime = Date.now();

  try {
    const fileData = fileWatcher ? fileWatcher.getRecentFiles() : { recentlyModified: [], mostActiveFile: null };
    const gitInfo = await getGitInfo(workspacePath);
    const commands = getRecentCommands({ workspacePath });

    console.log(`Tick: active=${active?.id || 'none'} files=${fileData.recentlyModified.length} git="${gitInfo.branch || 'no-repo'}" cmds=${commands.length}`);

    const signals = {
      recentlyModified: fileData.recentlyModified,
      mostActiveFile: fileData.mostActiveFile,
      branch: gitInfo.branch,
      diffStat: gitInfo.diffStat,
      recentCommits: gitInfo.recentCommits,
      statusShort: gitInfo.statusShort,
      commands,
      timestamp: new Date().toISOString()
    };

    const summary = await generateContextSummary({
      providerConfig: active,
      fallbackProviderConfigs: enabledProviders,
      signals
    });

    console.log(`Summary (${Date.now() - startTime}ms): ${(summary || '').substring(0, 80)}...`);

    const snapshotData = {
      summary,
      most_active_file: signals.mostActiveFile || '',
      git_branch: signals.branch || '',
      git_diff_summary: signals.diffStat || '',
      recent_commands: (commands || []).join('\n'),
      workspace_path: workspacePath
    };

    let dbOk = null;
    if (connStr) {
      const saved = await saveSnapshot(connStr, snapshotData);
      if (saved) {
        snapshotData.id = saved.id;
        snapshotData.created_at = saved.created_at;
        dbOk = true;
      } else {
        dbOk = false;
      }
    }

    snapshotData.created_at = snapshotData.created_at || new Date().toISOString();

    updateTooltip(`FlowLog — Last saved: ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);

    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send('snapshot-update', snapshotData);
      win.webContents.send('db-status', dbOk !== false);
    }
  } catch (err) {
    console.error('Watcher tick error:', err);
  }
}

function scheduleNextTick(store, updateTooltip) {
  if (!isRunning) return;
  const intervalSec = store.get('snapshotInterval', 60);
  tickTimeout = setTimeout(() => {
    watcherTick(store, updateTooltip).finally(() => {
      scheduleNextTick(store, updateTooltip);
    });
  }, intervalSec * 1000);
}

function startWatcher(store, updateTooltip) {
  if (tickTimeout) clearTimeout(tickTimeout);
  if (intervalId) clearInterval(intervalId);
  if (isRunning) return;

  const workspacePath = store.get('workspacePath');
  if (!workspacePath) return;

  const connStr = store.get('postgresConnectionString');

  if (fileWatcher) fileWatcher.close();
  fileWatcher = createFileWatcher(workspacePath);

  isRunning = true;

  if (connStr) {
    runMigration(connStr).then((success) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send('db-status', success);
      }
    });
  }

  watcherTick(store, updateTooltip).finally(() => {});
  scheduleNextTick(store, updateTooltip);
}

function stopWatcher() {
  if (tickTimeout) { clearTimeout(tickTimeout); tickTimeout = null; }
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  isRunning = false;
}

module.exports = function initWatcher(mainStore, updateTooltip) {
  const ws = mainStore.get('workspacePath');
  if (ws && mainStore.get('hasCompletedSetup')) {
    startWatcher(mainStore, updateTooltip);
  }

  return {
    start: () => startWatcher(mainStore, updateTooltip),
    stop: stopWatcher
  };
};

