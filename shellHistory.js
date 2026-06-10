const fs = require('fs');
const path = require('path');
const os = require('os');

function readHistoryLines(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').filter(line => line.trim().length > 0);
    }
  } catch (err) {
    
  }
  return [];
}

function parseZshHistory(lines) {
  return lines.map(line => {
    const match = line.match(/^:\s*\d+:\d+;(.+)/);
    return match ? match[1].trim() : line.trim();
  }).filter(Boolean);
}

function filterCommandsForWorkspace(commands, workspacePath) {
  if (!workspacePath || !Array.isArray(commands)) return commands || [];

  const normWs = workspacePath.replace(/\\/g, '/').toLowerCase();

  
  const kept = commands.filter((cmd) => {
    if (!cmd || typeof cmd !== 'string') return false;
    const c = cmd.replace(/\\/g, '/').toLowerCase();

    
    return c.includes(normWs) || c.includes(`cd ${normWs}`) || c.includes(`cd\"${workspacePath}`.toLowerCase());
  });

  
  return kept;
}

function getRecentCommands({ workspacePath } = {}) {
  const home = os.homedir();
  let commands = [];

  
  const zshHistoryPath = path.join(home, '.zsh_history');
  let lines = readHistoryLines(zshHistoryPath);
  if (lines.length > 0) {
    commands = parseZshHistory(lines);
    return filterCommandsForWorkspace(commands.slice(-100), workspacePath).slice(-15);
  }

  
  const bashHistoryPath = path.join(home, '.bash_history');
  lines = readHistoryLines(bashHistoryPath);
  if (lines.length > 0) {
    commands = lines;
    return filterCommandsForWorkspace(commands.slice(-100), workspacePath).slice(-15);
  }

  
  const psHistoryPath = path.join(
    process.env.APPDATA || '',
    'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt'
  );
  lines = readHistoryLines(psHistoryPath);
  if (lines.length > 0) {
    commands = lines;
    return filterCommandsForWorkspace(commands.slice(-100), workspacePath).slice(-15);
  }

  return [];
}


module.exports = { getRecentCommands };
