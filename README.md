# 🧠 FlowLog

> Your coding session has memory now.

FlowLog is a desktop app that runs silently in your system tray and automatically 
captures your mental working state every 60 seconds. When you return from any 
interruption — a call, a meeting, lunch — you see one plain-English paragraph 
telling you exactly where you were and what you were thinking.

No manual notes. No copy-pasting. It just works.

---

## The Problem

You are deep in debugging something hard. Your phone rings.
You come back 20 minutes later and spend another 20 minutes
rebuilding what was in your head.

VS Code remembers your open files.
Git remembers your code.
**Nothing remembers what you were thinking.**

FlowLog fixes that.

---

## What It Generates

> *"You were debugging the token refresh race condition in auth.js on branch 
> feature/auth-fix. You had just added a console.log on line 47 and were about 
> to check whether the Redis session was expiring too early. You had already 
> ruled out the database query — it was returning the correct data. Your last 
> commands were: npm run dev, git diff src/auth.js, node test-redis.js"*

Generated automatically from your real signals — open files, git diff, 
recent terminal commands, and file edit frequency. No file contents are 
ever sent to any API.

---

## Screenshots

> Add your screenshots here

---

## Features

### Core
- **Automatic context snapshots** — captures your working state every 
  60 seconds with no input required
- **Plain-English summaries** — AI writes a readable paragraph, not a 
  technical log
- **System tray app** — runs silently in the background, one click to 
  see your context
- **Signals captured**: recently modified files, git diff/status/branch/log, 
  last 15 shell commands

### AI Providers
- **Multi-provider support** — Gemini (free, 1500 req/day), OpenAI, 
  or Ollama running fully offline
- **Automatic fallback chain** — if your primary provider fails, 
  FlowLog tries the next one automatically
- **Provider config system** — configure multiple providers with a 
  single active provider, switchable from Settings

### Productivity
- **Tasks tab** — add tasks with title and priority (low / medium / high), 
  check off completed tasks, inline edit, delete with desktop notification
- **Notes tab** — quick notes with Shift+Enter to save, inline editing, 
  show more/less for long notes, desktop notification on save
- **Search tab** — searches across snapshots, tasks, and notes 
  simultaneously using PostgreSQL full-text search, results grouped by type
- **Tags** — add colored tag pills to any snapshot, task, or note; 
  filter history by tag with one click
- **Daily digest** — at a configurable time (default 6:00 PM), AI reads 
  everything you captured that day and writes a summary, saved automatically 
  as a tagged note; manual "Generate now" button in Settings

### Activity & Insights
- **Most-edited files** — bar chart of your most active files this week
- **Active hours** — 24-hour chart showing when you code most
- **Git commits** — commit frequency over the last 14 days
- All charts built with Recharts with tooltips and gridlines

### Customization
- **7 themes** — Light, Dark, Sepia, Nord, Forest, Sunset, Red — 
  persisted in config, switchable from the sidebar footer
- **Snapshot interval** — 30s, 1m, 2m, 5m, 10m, 30m, 1h, or type 
  any custom value in seconds
- **Startup toggle** — optionally launch with your operating system

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron.js |
| UI | React + Tailwind CSS |
| Charts | Recharts |
| Database | PostgreSQL |
| File watching | chokidar |
| Git integration | simple-git |
| AI — Gemini | @google/generative-ai |
| AI — OpenAI | openai |
| AI — Local | Ollama (HTTP API) |
| Config storage | electron-store |
| Shell history | zsh / bash / PowerShell |

---

## Quick Start

### Requirements
- Node.js 18 or higher
- PostgreSQL database (local or free cloud: [neon.tech](https://neon.tech) 
  or [supabase.com](https://supabase.com))
- At least one AI provider:
  - **Gemini** (recommended — free): get a key at [aistudio.google.com](https://aistudio.google.com)
  - **OpenAI**: get a key at [platform.openai.com](https://platform.openai.com)
  - **Ollama** (fully offline): install at [ollama.com](https://ollama.com)

### Install

```bash
git clone https://github.com/yourusername/FlowLog
cd  FlowLog
npm install
npm start
```

The setup wizard will guide you through the rest on first launch.

---

## Setup Wizard

FlowLog walks you through 4 steps on first launch:

**Step 1 — Workspace**
Choose the folder where you code. FlowLog will watch this folder.

**Step 2 — AI Provider**
Choose Gemini (free), OpenAI, or Ollama. You can add more providers 
in Settings later and configure a fallback chain.

**Step 3 — Database**
Enter your PostgreSQL connection string. 
Example: `postgresql://localhost:5432/FlowLog`
FlowLog creates the required tables automatically.

**Step 4 — Ready**
Monitoring starts. Your first context snapshot appears in 60 seconds.

---

## AI Provider Configuration

FlowLog supports multiple providers configured as an array. 
The `activeProviderId` controls which one is used first. If that 
provider fails, FlowLog automatically tries the others in order.

Example config (stored in your system's app data folder):

```json
{
  "providers": [
    {
      "id": "gemini-free",
      "kind": "gemini",
      "apiKey": "YOUR_GEMINI_KEY",
      "model": "gemini-2.0-flash"
    },
    {
      "id": "ollama-local",
      "kind": "ollama",
      "baseUrl": "http://localhost:11434",
      "model": "llama3.2"
    }
  ],
  "activeProviderId": "gemini-free"
}
```

Supported `kind` values: `gemini`, `openai`, `ollama`

---

## Themes

Switch themes from the color swatches in the sidebar footer.

| Theme | Description |
|---|---|
| Light | Clean white, blue accent |
| Dark | Dark slate, comfortable for night coding |
| Sepia | Warm paper tones, easy on the eyes |
| Nord | Arctic blues and greys |
| Forest | Muted greens, calm and focused |
| Sunset | Warm oranges and amber |
| Red | High contrast red accent |

Your theme choice is saved automatically.

---

## Privacy

FlowLog is built with privacy as a hard constraint:

- **No file contents are ever sent to any AI provider** — only file 
  names, git diff statistics, and shell command strings
- **All snapshots stored locally** in your own PostgreSQL database
- **Ollama support** means you can run fully offline with zero 
  data leaving your machine
- **No telemetry, no analytics, no tracking** of any kind

---

## Contributing

Pull requests are welcome.

Good first contributions:
- Additional AI provider support (Anthropic Claude, Mistral, Groq)
- VS Code extension for deeper file context
- Export snapshots as markdown or PDF
- Additional chart types in the Activity tab
- New themes

Please open an issue before starting large changes.

---

## License

MIT — free to use, modify, and distribute.

---

**If this saves you time every day, please give it a ⭐ — it helps other 
developers find it.**