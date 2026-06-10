const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getLatestSnapshot: () => ipcRenderer.invoke('get-latest-snapshot'),
  getSnapshots: () => ipcRenderer.invoke('get-snapshots'),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  onShowSetup: (callback) => ipcRenderer.on('show-setup', callback),
  onMonitoringStateChanged: (callback) => ipcRenderer.on('monitoring-state-changed', (event, isActive) => callback(isActive)),
  onSnapshotUpdate: (callback) => ipcRenderer.on('snapshot-update', (event, data) => callback(data)),
  onDbStatus: (callback) => ipcRenderer.on('db-status', (event, status) => callback(status)),
  deleteSnapshots: () => ipcRenderer.invoke('delete-snapshots'),
  testDb: () => ipcRenderer.invoke('test-db'),

  
  createTask: (data) => ipcRenderer.invoke('create-task', data),
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  updateTask: (id, data) => ipcRenderer.invoke('update-task', id, data),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),

  
  createNote: (data) => ipcRenderer.invoke('create-note', data),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  updateNote: (id, data) => ipcRenderer.invoke('update-note', id, data),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),

  
  sendNotification: (opts) => ipcRenderer.invoke('send-notification', opts),

  
  updateSnapshotTags: (id, tags) => ipcRenderer.invoke('update-snapshot-tags', id, tags),
  getSnapshotsByTag: (tag) => ipcRenderer.invoke('get-snapshots-by-tag', tag),

  
  searchAll: (query) => ipcRenderer.invoke('search-all', query),

  
  generateDigestNow: () => ipcRenderer.invoke('generate-digest-now'),
  onDigestGenerated: (callback) => ipcRenderer.on('digest-generated', (event, msg) => callback(msg)),

  
  getFileActivity: () => ipcRenderer.invoke('get-file-activity'),
  getHourlyActivity: () => ipcRenderer.invoke('get-hourly-activity'),
  getDailyCommits: () => ipcRenderer.invoke('get-daily-commits')
});
