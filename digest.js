const { getRecentSnapshots } = require('./db');
const { generateDaySummary } = require('./aiSummary');

function formatDigestNote(snapshots) {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const files = [...new Set(snapshots.map(s => s.most_active_file).filter(Boolean))];
  const branches = [...new Set(snapshots.map(s => s.git_branch).filter(Boolean))];

  let text = `Daily Digest — ${date}\n`;
  text += `${'─'.repeat(40)}\n\n`;
  text += `Snapshots today: ${snapshots.length}\n`;
  if (files.length > 0) text += `Files: ${files.join(', ')}\n`;
  if (branches.length > 0) text += `Branches: ${branches.join(', ')}\n`;

  return text.trim();
}

async function generateDigest({ store, providerConfig, fallbackProviderConfigs, geminiApiKey, ollamaModel }) {
  const conn = store.get('postgresConnectionString');
  const ws = store.get('workspacePath');
  if (!conn || !ws) return null;

  const snapshots = await getRecentSnapshots(conn, ws, 200);

  
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todaySnapshots = snapshots.filter(s => new Date(s.created_at) >= todayStart);

  if (todaySnapshots.length === 0) return null;

  let digestText = formatDigestNote(todaySnapshots);

  try {
    const dayProvider = providerConfig || fallbackProviderConfigs?.[0];
    const aiDigest = await generateDaySummary({
      providerConfig: dayProvider,
      fallbackProviderConfigs,
      snapshots: todaySnapshots,
      geminiApiKey,
      ollamaModel
    });

    if (aiDigest) {
      const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const files = [...new Set(todaySnapshots.map(s => s.most_active_file).filter(Boolean))];
      const branches = [...new Set(todaySnapshots.map(s => s.git_branch).filter(Boolean))];
      digestText = `Daily Digest — ${date}\n${'─'.repeat(40)}\n\n${aiDigest}\n\nSnapshots today: ${todaySnapshots.length}\n`;
      if (files.length > 0) digestText += `Files: ${files.join(', ')}\n`;
      if (branches.length > 0) digestText += `Branches: ${branches.join(', ')}\n`;
    }
  } catch (err) {
    console.error('AI digest failed, using template:', err.message);
  }

  return { text: digestText, count: todaySnapshots.length };
}

module.exports = { generateDigest };
