const chokidar = require('chokidar');
const path = require('path');

function createFileWatcher(workspacePath) {
  const fileMap = new Map();

  function addFile(filePath) {
    const now = new Date().toISOString();
    if (fileMap.has(filePath)) {
      const entry = fileMap.get(filePath);
      entry.lastModified = now;
      entry.editCount += 1;
    } else {
      fileMap.set(filePath, { path: filePath, lastModified: now, editCount: 1 });
    }
  }

  const watcher = chokidar.watch(workspacePath, {
    ignored: [
      /(^|[\/\\])node_modules([\/\\]|$)/,
      /(^|[\/\\])\.git([\/\\]|$)/,
      /(^|[\/\\])dist([\/\\]|$)/,
      /(^|[\/\\])build([\/\\]|$)/,
      /(^|[\/\\])__pycache__([\/\\]|$)/,
      /\.git/
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  });

  watcher.on('change', addFile);
  watcher.on('add', addFile);

  function getFilesData() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recentlyModified = [];

    for (const [filePath, data] of fileMap.entries()) {
      if (data.lastModified >= fiveMinAgo) {
        recentlyModified.push(data);
      }
    }

    recentlyModified.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

    const mostActiveFile = recentlyModified.length > 0
      ? recentlyModified.reduce((a, b) => a.editCount > b.editCount ? a : b).path
      : null;

    return { recentlyModified, mostActiveFile };
  }

  function getRecentFiles() {
    return getFilesData();
  }

  function close() {
    watcher.close();
    fileMap.clear();
  }

  return { getRecentFiles, close };
}

module.exports = { createFileWatcher };
