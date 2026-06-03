# HOLYTASK — AI-powered Task Tracker

Task tracker for engineering teams with an embedded AI agent layer that eliminates daily planning friction.

## Quick Start

```bash
git clone <repo-url>
cd holytasker
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first run, 10 realistic seed tasks are inserted automatically.

**To enable AI features:** Open **Settings** (top right) → AI Providers → paste your [Anthropic API key](https://console.anthropic.com) → Save → set as Active. No `.env` file required. Without a key, the app runs normally but all AI buttons are disabled with a tooltip explaining what's needed.

## Architecture

```
Next.js App Router (full-stack monorepo)
├── src/app/
│   ├── api/tasks/                 GET (filter+sort), POST
│   ├── api/tasks/[id]/            GET, PATCH, DELETE
│   ├── api/tasks/[id]/subtasks/   GET, POST
│   ├── api/tasks/[id]/comments/   GET, POST (thread comments)
│   ├── api/tasks/[id]/reactions/  GET, POST, DELETE (emoji reactions)
│   ├── api/subtasks/[id]/         PATCH (toggle), DELETE
│   ├── api/comments/[id]/         PATCH, DELETE
│   ├── api/comments/[id]/reactions/ GET, POST, DELETE
│   ├── api/ai/prioritize/         Prioritization agent
│   ├── api/ai/decompose/          Decomposition agent (+ /confirm)
│   ├── api/ai/chat/               Streaming AI chat
│   ├── api/ai/runs/[id]/accept/   Record accept/dismiss
│   ├── api/assignees/             Distinct assignee names from tasks
│   ├── api/settings/ai/           AI provider key management
│   └── api/integrations/slack/    Slack OAuth + send message
├── src/lib/
│   ├── db.ts                      SQLite singleton (better-sqlite3)
│   ├── tasks.ts / subtasks.ts     CRUD functions
│   ├── agent-runs.ts              Agent run step-level logging
│   ├── aiSettings.ts              Per-user AI provider preferences
│   ├── llm.ts                     Unified streaming client (5 providers)
│   ├── seed.ts                    10 realistic seed tasks
│   └── agents/
│       ├── tools.ts               Tool implementations (pure functions)
│       ├── prioritize.ts          Prioritization agent loop
│       └── decompose.ts           Decomposition agent loop
└── src/components/
    ├── TaskCard.tsx               Task list item with progress bar
    ├── TaskDetail.tsx             Task detail panel (inline editing)
    ├── TaskThread.tsx             Comment thread with reactions
    ├── ChatPanel.tsx              AI assistant chat (streaming)
    ├── PrioritizePanel.tsx        AI prioritization UI
    └── DecomposePanel.tsx         AI decomposition UI
```

## Storage: SQLite via better-sqlite3

**Why SQLite:** Persistent across restarts, no external server, synchronous API (cleaner code at this scale), full SQL for filtering and sorting. Database lives at `data/devlog.db`.

**Schema includes:**
- `tasks` — core task data with status, priority, assignee
- `subtasks` — checklist items with cascade delete
- `agent_runs` — every AI agent execution with step-level tool call tracing
- `task_comments` — threaded discussion on tasks
- `task_reactions` / `comment_reactions` — emoji reactions
- `ai_settings` — per-user AI provider API keys and active selection
- `user_integrations` — Slack OAuth tokens

**Limitations:** Not suitable for horizontal scaling (single-writer). Production path: PostgreSQL.

## AI Features

### A. Prioritization Agent

Analyzes all active tasks and recommends what to work on today with explicit reasoning. **Genuine multi-step agent, not a single LLM call:**

1. `list_active_tasks` → all todo/in-progress tasks
2. `score_task(id)` for each → server computes `age_hours × priority_weight × status_weight`
3. `get_task_details(id)` for top candidates → full context including subtasks
4. Returns top-3 ranked with per-task reasoning + overall summary

**Key design:** Scoring is deterministic on the server — avoids hallucinated math. The LLM receives pre-computed scores and provides human-readable reasoning. Every run logged to `agent_runs` with all tool calls, latency, and user acceptance.

### B. Decomposition Agent

Generates structured subtasks from a task title and description. **Two-branch flow based on clarity assessment:**

**Vague task (clarity score < 0.65):**
→ `get_task_details` → `assess_clarity` → returns clarifying questions → user answers → retry → `get_similar_tasks` → generate → `validate_subtasks` → preview

**Clear task (clarity score ≥ 0.65):**
→ `get_task_details` → `assess_clarity` → `get_similar_tasks` → generate → `validate_subtasks` → preview

The 0.65 threshold is deliberately conservative: it triggers only when description is missing key signals (action verbs, technical scope, acceptance criteria). The conditional branch is the core proof of agentness — not just a linear sequence of calls.

**Preview before write:** subtasks shown as editable list. DB write happens only after explicit user confirmation.

### C. Status Update Generator

Generates a concise async Slack-style update from the current task state. Accessible via **Send to Slack → ✦ Generate status update**. **Multi-step agent:**

1. `get_task_details` → title, description, status, priority, assignee
2. `get_subtask_progress` → how many subtasks done vs. remaining
3. `get_recent_comments` → latest thread context (blockers, notes)
4. Composes a 2-4 line update with appropriate emoji and tone

Example output: *"🔄 Working on JWT refresh token rotation — 5/8 subtasks done. Currently implementing the token revocation logic. On track for today."*

### D. AI Chat Assistant (Custom)

Embedded streaming chat in the right panel. Has full context of all tasks at every message — status, priority, age, subtask progress. Useful for: standup updates, "what's blocked?", "explain task X", writing subtask acceptance criteria.

Built with Anthropic streaming API (`streamChatCompletion`). Supports 5 providers via settings: Anthropic, OpenAI, Groq, Mistral, Google Gemini.

## Extended Features (beyond brief scope)

Built after the core requirements were met:

- **Task comments** — threaded discussion with emoji reactions on each task
- **Send to Slack** — posts formatted task summary to any Slack channel or DM
- **Multi-provider AI** — configure API keys for 5 LLM providers in Settings; one active at a time

## Environment Variables

**No environment variables are required to run the app.** The app runs in single-user mode out of the box — no login, no setup.

To configure via `.env.local` instead of the Settings UI (see `.env.example`):
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` — required for Slack OAuth integration
- `ANTHROPIC_API_KEY` — optional alternative to configuring the key in Settings UI

## Known Limitations

- **Single-writer SQLite** — acceptable for stated scope (one user, local dev)
- **No real-time sync** — list refreshes on mutations, not WebSocket
- **Clarity assessment is heuristic** — keyword-based, not semantic. May trigger clarification for edge-case tasks near the 0.65 threshold. Acknowledged trade-off documented in `AGENT_LOG.md`
- **AI latency 3-10s** — loading states shown throughout
- **Single-user mode** — no auth required; the app works for one user out of the box
