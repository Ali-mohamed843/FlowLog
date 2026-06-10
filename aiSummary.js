const http = require('http');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const SYSTEM_INSTRUCTION = `You are a developer context assistant. You receive raw signals about what a developer was working on.

Rules (must follow):
- Output ONLY ONE paragraph, no headings, no bullets, no quotes, no extra text. Output NOTHING else — no reasoning, no analysis, no explanation.
- Write in second person, starting with You were.
- 2-4 sentences total, max 90 words.
- Do NOT invent commands, tasks, or tool usage that are not present in the input.
- Only mention terminal commands if the provided commands array is non-empty.
- If commands are empty, do not mention terminal commands at all.
- If mostActiveFile is missing, don't claim you were editing it.

Content focus:
- What you were working on (use mostActiveFile + recentlyModified).
- Likely next step (based on git diff/stat/status when available, otherwise based on files).
- What you already did (edits count + diff status).

Be specific, but only from provided signals.`;

function buildUserMessage(signals) {
  const recentlyModified = (signals.recentlyModified || [])
    .map(f => `${f.path} (${f.editCount} edits)`)
    .join(', ');

  const commands = (signals.commands || []).filter(Boolean);

  return [
    `Recently modified files: ${recentlyModified || 'N/A'}`,
    `Most edited file: ${signals.mostActiveFile || 'N/A'}`,
    `Git branch: ${signals.branch || 'N/A'}`,
    `Git diff summary: ${signals.diffStat || 'N/A'}`,
    `Recent commits: ${(signals.recentCommits || []).join(', ') || 'N/A'}`,
    `Git status: ${signals.statusShort || 'N/A'}`,
    `Last 15 terminal commands: ${commands.length > 0 ? commands.join(', ') : ''}`,
    `Time of capture: ${signals.timestamp || new Date().toISOString()}`
  ].join('\n');
}

function buildTemplateSummary(signals) {
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const file = signals.mostActiveFile ? signals.mostActiveFile.split(/[/\\]/).pop() : null;
  const branch = signals.branch;
  const edits = signals.recentlyModified?.length || 0;
  const diffStat = signals.diffStat;
  const commands = (signals.commands || []).filter(Boolean);
  const recentCommits = signals.recentCommits || [];

  let summary = `At ${time}, you were working on ${file || 'a file'}`;
  if (branch) summary += ` on branch ${branch}`;
  summary += `. You had made ${edits} recent file change${edits === 1 ? '' : 's'}`;
  if (diffStat) summary += ` with uncommitted changes: ${diffStat}`;

  if (commands.length > 0) {
    summary += ` Your recent terminal commands included: ${commands.slice(0, 3).join(', ')}.`;
  }

  if (recentCommits.length > 0) {
    summary += ` Latest commit: ${recentCommits[0]}.`;
  }

  return summary.trim();
}

async function callOllama(model, prompt, systemInstruction) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model,
      prompt,
      system: systemInstruction || SYSTEM_INSTRUCTION,
      stream: false,
      options: { num_predict: systemInstruction ? 300 : 200, temperature: 0.3 }
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(json.error));
          else resolve((json.response || '').trim());
        } catch {
          reject(new Error('Failed to parse Ollama response: ' + body.substring(0, 200)));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Cannot connect to Ollama — ' + e.message)));
    req.write(data);
    req.end();
  });
}

async function callGemini(apiKey, prompt) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_INSTRUCTION
  });
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return text;
}

function httpRequest(urlStr, headers, body, timeout) {
  const parsedUrl = new URL(urlStr);
  const mod = parsedUrl.protocol === 'https:' ? https : http;
  const opts = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    timeout
  };
  return new Promise((resolve, reject) => {
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON response')); }
        } else {
          reject(new Error(`API ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(body);
    req.end();
  });
}

async function callOpenAICompatible(baseUrl, apiKey, model, prompt) {
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 500
  });

  const json = await httpRequest(url, { 'Authorization': `Bearer ${apiKey}` }, body, 60000);
  let content = (json.choices?.[0]?.message?.content || '').trim();
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return content;
}

function safeTrimParagraph(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.trim();
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const idx = t.lastIndexOf('You were');
  if (idx >= 0) t = t.substring(idx);
  return t.replace(/\s*\n\s*/g, ' ').trim();
}

async function generateContextSummary({ providerConfig, fallbackProviderConfigs, signals, provider, geminiApiKey, ollamaModel } = {}) {
  const userMessage = buildUserMessage(signals || {});

  const chain = [providerConfig, ...(fallbackProviderConfigs || [])].filter(Boolean);

  for (const p of chain) {
    try {
      if (!p || p.enabled === false) continue;

      if (p.kind === 'ollama') {
        const model = p.model || ollamaModel;
        if (!model) continue;
        const out = await callOllama(model, userMessage);
        if (out) return safeTrimParagraph(out);
      }

      if (p.kind === 'gemini') {
        const apiKey = p.apiKey || geminiApiKey;
        if (!apiKey) continue;
        const out = await callGemini(apiKey, userMessage);
        if (out) return safeTrimParagraph(out);
      }

      if (p.kind === 'openai' || p.kind === 'custom') {
        const baseUrl = p.baseUrl;
        const apiKey = p.apiKey;
        const model = p.model;
        if (!baseUrl || !apiKey || !model) continue;
        const out = await callOpenAICompatible(baseUrl, apiKey, model, userMessage);
        if (out) return safeTrimParagraph(out);
      }
    } catch (err) {
      console.error(`${p?.kind || 'provider'} error:`, err.message);
    }
  }

  
  return buildTemplateSummary(signals || {});
}


 

const DIGEST_SYSTEM = `You are a developer daily digest assistant. You receive all context snapshots from a developer's day.

Write a 2-4 sentence summary of what the developer accomplished today. Focus on:
- What files/projects they worked on
- What they achieved or changed
- Overall progress

Be concise and direct. Write in second person ("You worked on..."). Do not use markdown or bullet points. Just one or two paragraphs.`;

function buildDigestPrompt(snapshots) {
  const lines = snapshots.map((s, i) => {
    const t = new Date(s.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    let line = `[${t}] ${s.summary}`;
    if (s.most_active_file) line += ` (file: ${s.most_active_file})`;
    if (s.git_branch) line += ` [branch: ${s.git_branch}]`;
    return line;
  });
  return `Here are the developer's context snapshots from today:\n\n${lines.join('\n')}\n\nSummarize what they accomplished today.`;
}

async function generateDaySummary({ providerConfig, fallbackProviderConfigs, snapshots, geminiApiKey, ollamaModel }) {
  const prompt = buildDigestPrompt(snapshots || []);

  const chain = [providerConfig, ...(fallbackProviderConfigs || [])].filter(Boolean);

  for (const p of chain) {
    try {
      if (!p || p.enabled === false) continue;

      if (p.kind === 'ollama') {
        const model = p.model || ollamaModel;
        if (!model) continue;
        const out = await callOllama(model, prompt, DIGEST_SYSTEM);
        if (out) return safeTrimParagraph(out);
      }

      if (p.kind === 'gemini') {
        const apiKey = p.apiKey || geminiApiKey;
        if (!apiKey) continue;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction: DIGEST_SYSTEM
        });
        const result = await model.generateContent(prompt);
        let out = result.response.text().trim();
        out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (out) return safeTrimParagraph(out);
      }

      if (p.kind === 'openai' || p.kind === 'custom') {
        const baseUrl = p.baseUrl;
        const apiKey = p.apiKey;
        const model = p.model;
        if (!baseUrl || !apiKey || !model) continue;
        const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
        const body = JSON.stringify({ model, messages: [{ role: 'system', content: DIGEST_SYSTEM }, { role: 'user', content: prompt }], temperature: 0.3, max_tokens: 500 });
        const json = await httpRequest(url, { 'Authorization': `Bearer ${apiKey}` }, body, 60000);
        let out = (json.choices?.[0]?.message?.content || '').trim();
        out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (out) return safeTrimParagraph(out);
      }
    } catch (err) {
      console.error(`${p?.kind || 'provider'} digest error:`, err.message);
    }
  }

  return null;
}

module.exports = { generateContextSummary, generateDaySummary };

