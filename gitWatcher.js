const simpleGit = require('simple-git');

async function getGitInfo(workspacePath) {
  const result = {
    branch: '',
    diffStat: '',
    recentCommits: [],
    statusShort: ''
  };

  try {
    const git = simpleGit(workspacePath);

    const isRepo = await git.checkIsRepo();
    if (!isRepo) return result;

    const [branchResult, diffResult, logResult, statusResult] = await Promise.all([
      git.branch(),
      git.diff(['--stat']),
      git.log(['--oneline', '-5']),
      git.status()
    ]);

    result.branch = branchResult.current;
    result.diffStat = diffResult.diff || null;
    result.recentCommits = logResult.all.map(c => `${c.hash.substring(0, 7)} ${c.message}`);
    result.statusShort = statusResult.files.map(f => `${f.working_dir} ${f.path}`).join('\n') || '';

    return result;
  } catch (err) {
    console.error('gitWatcher error:', err.message);
    return result;
  }
}

module.exports = { getGitInfo };
