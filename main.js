const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { runMigration, getRecentSnapshots, deleteSnapshots, testConnection, createTask, getTasks, updateTask, deleteTask, createNote, getNotes, updateNote, deleteNote, updateSnapshotTags, searchAll, getSnapshotsByTag, getFileActivity, getHourlyActivity } = require('./db');
const { generateDigest } = require('./digest');

const store = new Store({
  defaults: {
    workspacePath: '',

    
    provider: 'ollama',
    ollamaModel: 'llama3.2',
    geminiApiKey: '',

    
    activeProviderId: 'default-ollama',
    providers: [
      {
        id: 'default-ollama',
        name: 'Ollama',
        kind: 'ollama',
        enabled: true,
        baseUrl: 'http://127.0.0.1:11434',
        apiKey: '',
        model: 'llama3.2'
      },
      {
        id: 'default-gemini',
        name: 'Gemini',
        kind: 'gemini',
        enabled: false,
        baseUrl: '',
        apiKey: '',
        model: 'gemini-2.0-flash'
      }
    ],

    postgresConnectionString: '',
    snapshotInterval: 60,
    isPaused: false,
    hasCompletedSetup: false,
    startOnBoot: false,
    theme: 'light',
    dailyDigestEnabled: false,
    dailyDigestHour: 18,
    dailyDigestMinute: 0

  }
});

let tray = null;
let mainWindow = null;
let watcherControl = null;
let lastDigestDate = '';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 700,
    show: true,
    resizable: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'react-ui', 'build', 'index.html'));

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[Renderer] ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Window load failed: ${errorDescription} (${errorCode})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded successfully');
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTrayIcon() {
  const fs = require('fs');
  const { createEyeIconBuffer } = require('./icon');
  const iconPath = path.join(app.getPath('userData'), 'tray-icon.png');
  let img;
  try {
    const pngBuffer = createEyeIconBuffer(32);
    fs.writeFileSync(iconPath, pngBuffer);
    img = nativeImage.createFromPath(iconPath);
    console.log('Tray icon from file:', iconPath, img.isEmpty() ? 'EMPTY' : 'OK');
  } catch (err) {
    console.error('Tray icon fallback to buffer:', err.message);
    img = nativeImage.createFromBuffer(createEyeIconBuffer(32));
  }
  if (img.isEmpty()) {
    console.error('Tray icon is empty, using fallback');
    const { createEyeIconBuffer } = require('./icon');
    img = nativeImage.createFromBuffer(createEyeIconBuffer(32));
  }
  tray = new Tray(img);

  const isPaused = store.get('isPaused');
  updateTrayContextMenu(isPaused);

  tray.setToolTip('DevContext — Active');

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function updateTrayContextMenu(isPaused) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Context',
      click: () => {
        if (mainWindow) mainWindow.show();
      }
    },
    {
      label: isPaused ? 'Resume Monitoring' : 'Pause Monitoring',
      click: () => {
        const newState = !store.get('isPaused');
        store.set('isPaused', newState);
        updateTrayContextMenu(newState);
        if (newState) {
          tray.setToolTip('FlowLog — Paused');
        } else {
  tray.setToolTip('FlowLog — Active');
        }
        if (mainWindow) mainWindow.webContents.send('monitoring-state-changed', !newState);
      }
    },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('open-settings');
          mainWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function updateTrayTooltip(text) {
  if (tray) {
    tray.setToolTip(text);
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

app.whenReady().then(() => {
  createMainWindow();
  createTrayIcon();

  watcherControl = require('./watcher')(store, updateTrayTooltip);

  
  const digestScheduler = setInterval(async () => {
    const enabled = store.get('dailyDigestEnabled');
    if (!enabled) return;

    const conn = store.get('postgresConnectionString');
    if (!conn) return;

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (lastDigestDate === todayKey) return; 

    const h = store.get('dailyDigestHour');
    const m = store.get('dailyDigestMinute');
    if (now.getHours() !== h || now.getMinutes() !== m) return;

    console.log('Generating daily digest...');
    lastDigestDate = todayKey;

    try {
      const result = await generateDigest({
        store,
        providerConfig: (store.get('providers') || []).find(p => p.id === store.get('activeProviderId')),
        fallbackProviderConfigs: (store.get('providers') || []).filter(p => p.id !== store.get('activeProviderId')),
        geminiApiKey: store.get('geminiApiKey'),
        ollamaModel: store.get('ollamaModel')
      });

      if (result && result.text) {
        const ws = store.get('workspacePath');
        await createNote(conn, {
          title: `Daily Digest — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          content: result.text,
          workspace_path: ws,
          tags: ['daily-digest']
        });

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('digest-generated', `Daily digest saved (${result.count} snapshots)`);
        }
      }
    } catch (err) {
      console.error('Digest generation failed:', err.message);
    }
  }, 60000);

  if (!store.get('hasCompletedSetup')) {
    mainWindow.show();
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('show-setup');
    });
  } else {
    startDbAndMigration();
  }
});

async function startDbAndMigration() {
  const conn = store.get('postgresConnectionString');
  if (conn) {
    const ok = await runMigration(conn);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('db-status', ok);
    }
  }
}

app.on('window-all-closed', () => {
  
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (typeof digestScheduler !== 'undefined') clearInterval(digestScheduler);
});

ipcMain.handle('get-settings', () => {
  return {
    workspacePath: store.get('workspacePath'),
    provider: store.get('provider'),
    ollamaModel: store.get('ollamaModel'),
    geminiApiKey: store.get('geminiApiKey'),

    activeProviderId: store.get('activeProviderId'),
    providers: store.get('providers'),

    postgresConnectionString: store.get('postgresConnectionString'),
    snapshotInterval: store.get('snapshotInterval'),
    isPaused: store.get('isPaused'),
    hasCompletedSetup: store.get('hasCompletedSetup'),
    startOnBoot: store.get('startOnBoot'),
    theme: store.get('theme'),
    dailyDigestEnabled: store.get('dailyDigestEnabled'),
    dailyDigestHour: store.get('dailyDigestHour'),
    dailyDigestMinute: store.get('dailyDigestMinute')
  };
});

ipcMain.handle('save-settings', async (event, settings) => {
  
  for (const [key, value] of Object.entries(settings)) {
    store.set(key, value);
  }

  
  if (!settings.providers || !Array.isArray(settings.providers)) {
    const providers = [
      {
        id: 'default-ollama',
        name: 'Ollama',
        kind: 'ollama',
        enabled: settings.provider === 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        apiKey: '',
        model: settings.ollamaModel || 'llama3.2'
      },
      {
        id: 'default-gemini',
        name: 'Gemini',
        kind: 'gemini',
        enabled: settings.provider === 'gemini',
        baseUrl: '',
        apiKey: settings.geminiApiKey || '',
        model: 'gemini-2.0-flash'
      }
    ];

    store.set('providers', providers);
    store.set('activeProviderId', settings.provider === 'ollama' ? 'default-ollama' : 'default-gemini');
  }


  if (settings.hasOwnProperty('startOnBoot')) {
    app.setLoginItemSettings({
      openAtLogin: settings.startOnBoot
    });
  }

  if (watcherControl) {
    watcherControl.stop();
    watcherControl.start();
  }

  if (settings.postgresConnectionString || settings.hasCompletedSetup) {
    startDbAndMigration();
  }

  return true;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-latest-snapshot', async () => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return null;
  const rows = await getRecentSnapshots(conn, ws, 1);
  return rows.length > 0 ? rows[0] : null;
});

ipcMain.handle('get-snapshots', async () => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return [];
  return await getRecentSnapshots(conn, ws, 50);
});

ipcMain.handle('delete-snapshots', async () => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return false;
  return await deleteSnapshots(conn, ws);
});

ipcMain.handle('test-db', async () => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return false;
  return await testConnection(conn);
});

 

ipcMain.handle('create-task', async (event, data) => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return null;
  return await createTask(conn, data);
});

ipcMain.handle('get-tasks', async () => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return [];
  return await getTasks(conn, ws);
});

ipcMain.handle('update-task', async (event, id, data) => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return null;
  return await updateTask(conn, id, data);
});

ipcMain.handle('delete-task', async (event, id) => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return false;
  return await deleteTask(conn, id);
});

 

ipcMain.handle('create-note', async (event, data) => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return null;
  return await createNote(conn, data);
});

ipcMain.handle('get-notes', async () => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return [];
  return await getNotes(conn, ws);
});

ipcMain.handle('update-note', async (event, id, data) => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return null;
  return await updateNote(conn, id, data);
});

ipcMain.handle('delete-note', async (event, id) => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return false;
  return await deleteNote(conn, id);
});

 

ipcMain.handle('send-notification', async (event, { title, body }) => {
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    const n = new Notification({ title, body });
    n.show();
    return true;
  }
  return false;
});

 

ipcMain.handle('update-snapshot-tags', async (event, id, tags) => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return null;
  return await updateSnapshotTags(conn, id, tags);
});

ipcMain.handle('get-snapshots-by-tag', async (event, tag) => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return [];
  return await getSnapshotsByTag(conn, ws, tag);
});

 

ipcMain.handle('search-all', async (event, query) => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn || !query || query.trim().length === 0) return { snapshots: [], tasks: [], notes: [] };
  return await searchAll(conn, ws, query.trim());
});

 

ipcMain.handle('generate-digest-now', async () => {
  const conn = store.get('postgresConnectionString');
  if (!conn) return { ok: false, error: 'No database connection' };
  try {
    const result = await generateDigest({
      store,
      providerConfig: (store.get('providers') || []).find(p => p.id === store.get('activeProviderId')),
      fallbackProviderConfigs: (store.get('providers') || []).filter(p => p.id !== store.get('activeProviderId')),
      geminiApiKey: store.get('geminiApiKey'),
      ollamaModel: store.get('ollamaModel')
    });

    if (result && result.text) {
      const ws = store.get('workspacePath');
      await createNote(conn, {
        title: `Daily Digest — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        content: result.text,
        workspace_path: ws,
        tags: ['daily-digest']
      });
      return { ok: true, count: result.count };
    }
    return { ok: false, error: 'No snapshots today' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

 

const simpleGit = require('simple-git');

ipcMain.handle('get-file-activity', async () => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return [];
  return await getFileActivity(conn, ws);
});

ipcMain.handle('get-hourly-activity', async () => {
  const ws = store.get('workspacePath');
  const conn = store.get('postgresConnectionString');
  if (!ws || !conn) return [];
  return await getHourlyActivity(conn, ws);
});

ipcMain.handle('get-daily-commits', async () => {
  const ws = store.get('workspacePath');
  if (!ws) return [];
  try {
    const git = simpleGit(ws);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return [];

    
    const since = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
    const log = await git.log(['--after', since, '--format=%H|%ai|%s']);
    const dayCount = {};
    for (const c of log.all) {
      const day = c.date.split('T')[0];
      dayCount[day] = (dayCount[day] || 0) + 1;
    }

    
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      result.push({ date: key, label, count: dayCount[key] || 0 });
    }
    return result;
  } catch (err) {
    console.error('getDailyCommits failed:', err.message);
    return [];
  }
});
