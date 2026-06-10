const { Pool } = require('pg');

const pools = {};

function getPool(connectionString) {
  if (!pools[connectionString]) {
    pools[connectionString] = new Pool({ connectionString, max: 1 });
  }
  return pools[connectionString];
}

async function runMigration(connectionString) {
  try {
    const p = getPool(connectionString);
    await p.query(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        summary TEXT NOT NULL,
        most_active_file TEXT,
        git_branch TEXT,
        git_diff_summary TEXT,
        recent_commands TEXT,
        workspace_path TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_snapshots_workspace ON snapshots(workspace_path);

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date TIMESTAMPTZ,
        workspace_path TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_path);

      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title TEXT DEFAULT '',
        content TEXT NOT NULL,
        workspace_path TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_path);

      ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);
    return true;
  } catch (err) {
    console.error('Migration failed:', err.message);
    return false;
  }
}

async function saveSnapshot(connectionString, data) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `INSERT INTO snapshots (summary, most_active_file, git_branch, git_diff_summary, recent_commands, workspace_path, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [data.summary, data.most_active_file, data.git_branch, data.git_diff_summary, data.recent_commands, data.workspace_path, data.tags || []]
    );
    return result.rows[0];
  } catch (err) {
    console.error('saveSnapshot failed:', err.message);
    return null;
  }
}

async function getRecentSnapshots(connectionString, workspacePath, limit = 50) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `SELECT id, created_at, summary, most_active_file, git_branch, git_diff_summary, recent_commands, tags
       FROM snapshots
       WHERE workspace_path = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [workspacePath, limit]
    );
    return result.rows;
  } catch (err) {
    console.error('getRecentSnapshots failed:', err.message);
    return [];
  }
}

async function deleteSnapshots(connectionString, workspacePath) {
  try {
    const p = getPool(connectionString);
    await p.query('DELETE FROM snapshots WHERE workspace_path = $1', [workspacePath]);
    return true;
  } catch (err) {
    console.error('deleteSnapshots failed:', err.message);
    return false;
  }
}

async function testConnection(connectionString) {
  try {
    const p = getPool(connectionString);
    await p.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

 

async function createTask(connectionString, data) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, workspace_path, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [data.title, data.description || '', data.status || 'pending', data.priority || 'medium', data.due_date || null, data.workspace_path, data.tags || []]
    );
    return result.rows[0];
  } catch (err) {
    console.error('createTask failed:', err.message);
    return null;
  }
}

async function getTasks(connectionString, workspacePath) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `SELECT id, title, description, status, priority, due_date, created_at, updated_at, tags
       FROM tasks WHERE workspace_path = $1 ORDER BY
         CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
         CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         created_at DESC`,
      [workspacePath]
    );
    return result.rows;
  } catch (err) {
    console.error('getTasks failed:', err.message);
    return [];
  }
}

async function updateTask(connectionString, id, data) {
  try {
    const p = getPool(connectionString);
    const sets = []; const vals = []; let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (['title', 'description', 'status', 'priority', 'due_date', 'tags'].includes(key)) {
        sets.push(`${key} = $${idx++}`);
        vals.push(value);
      }
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = NOW()`);
    vals.push(id);
    const result = await p.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, updated_at`,
      vals
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('updateTask failed:', err.message);
    return null;
  }
}

async function deleteTask(connectionString, id) {
  try {
    const p = getPool(connectionString);
    await p.query('DELETE FROM tasks WHERE id = $1', [id]);
    return true;
  } catch (err) {
    console.error('deleteTask failed:', err.message);
    return false;
  }
}

 

async function createNote(connectionString, data) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `INSERT INTO notes (title, content, workspace_path, tags)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [data.title || '', data.content, data.workspace_path, data.tags || []]
    );
    return result.rows[0];
  } catch (err) {
    console.error('createNote failed:', err.message);
    return null;
  }
}

async function getNotes(connectionString, workspacePath) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `SELECT id, title, content, created_at, updated_at, tags
       FROM notes WHERE workspace_path = $1
       ORDER BY created_at DESC`,
      [workspacePath]
    );
    return result.rows;
  } catch (err) {
    console.error('getNotes failed:', err.message);
    return [];
  }
}

async function updateNote(connectionString, id, data) {
  try {
    const p = getPool(connectionString);
    const sets = []; const vals = []; let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (['title', 'content', 'tags'].includes(key)) {
        sets.push(`${key} = $${idx++}`);
        vals.push(value);
      }
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = NOW()`);
    vals.push(id);
    const result = await p.query(
      `UPDATE notes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, updated_at`,
      vals
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('updateNote failed:', err.message);
    return null;
  }
}

async function deleteNote(connectionString, id) {
  try {
    const p = getPool(connectionString);
    await p.query('DELETE FROM notes WHERE id = $1', [id]);
    return true;
  } catch (err) {
    console.error('deleteNote failed:', err.message);
    return false;
  }
}

 

async function updateSnapshotTags(connectionString, id, tags) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `UPDATE snapshots SET tags = $1 WHERE id = $2 RETURNING id`,
      [tags, id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('updateSnapshotTags failed:', err.message);
    return null;
  }
}

async function getSnapshotsByTag(connectionString, workspacePath, tag) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `SELECT id, created_at, summary, most_active_file, git_branch, git_diff_summary, recent_commands, tags
       FROM snapshots WHERE workspace_path = $1 AND $2 = ANY(tags)
       ORDER BY created_at DESC LIMIT 50`,
      [workspacePath, tag]
    );
    return result.rows;
  } catch (err) {
    console.error('getSnapshotsByTag failed:', err.message);
    return [];
  }
}

 

async function searchAll(connectionString, workspacePath, query) {
  try {
    const p = getPool(connectionString);
    const like = `%${query}%`;

    const snapshots = await p.query(
      `SELECT id, created_at, summary AS preview, tags, 'snapshot' AS type
       FROM snapshots WHERE workspace_path = $1 AND (summary ILIKE $2 OR most_active_file ILIKE $2)
       ORDER BY created_at DESC LIMIT 20`,
      [workspacePath, like]
    );

    const tasks = await p.query(
      `SELECT id, created_at, title AS preview, tags, 'task' AS type
       FROM tasks WHERE workspace_path = $1 AND (title ILIKE $2 OR description ILIKE $2)
       ORDER BY created_at DESC LIMIT 10`,
      [workspacePath, like]
    );

    const notes = await p.query(
      `SELECT id, created_at, LEFT(content, 200) AS preview, tags, 'note' AS type
       FROM notes WHERE workspace_path = $1 AND (title ILIKE $2 OR content ILIKE $2)
       ORDER BY created_at DESC LIMIT 10`,
      [workspacePath, like]
    );

    return {
      snapshots: snapshots.rows,
      tasks: tasks.rows,
      notes: notes.rows
    };
  } catch (err) {
    console.error('searchAll failed:', err.message);
    return { snapshots: [], tasks: [], notes: [] };
  }
}

 

async function getFileActivity(connectionString, workspacePath) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `SELECT most_active_file, COUNT(*)::int AS count
       FROM snapshots
       WHERE workspace_path = $1 AND most_active_file IS NOT NULL AND most_active_file != ''
       GROUP BY most_active_file
       ORDER BY count DESC
       LIMIT 10`,
      [workspacePath]
    );
    return result.rows;
  } catch (err) {
    console.error('getFileActivity failed:', err.message);
    return [];
  }
}

async function getHourlyActivity(connectionString, workspacePath) {
  try {
    const p = getPool(connectionString);
    const result = await p.query(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
       FROM snapshots
       WHERE workspace_path = $1
       GROUP BY hour
       ORDER BY hour`,
      [workspacePath]
    );
    
    const map = {};
    for (const r of result.rows) map[r.hour] = r.count;
    const full = [];
    for (let h = 0; h < 24; h++) full.push({ hour: h, count: map[h] || 0 });
    return full;
  } catch (err) {
    console.error('getHourlyActivity failed:', err.message);
    return [];
  }
}

module.exports = { runMigration, saveSnapshot, getRecentSnapshots, deleteSnapshots, testConnection, createTask, getTasks, updateTask, deleteTask, createNote, getNotes, updateNote, deleteNote, updateSnapshotTags, searchAll, getSnapshotsByTag, getFileActivity, getHourlyActivity };
