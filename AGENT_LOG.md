# AGENT_LOG — Working with Claude Code on HOLYTASK

**Agent used:** Claude Code (claude-sonnet-4-6) via VS Code extension  
**Honesty over polish — this is a real account of what happened.**

---

## How the collaboration worked

The entire project was built through an ongoing conversation with Claude Code. I didn't write a single file from scratch — instead I gave prompts, reviewed what the agent produced, redirected when it was wrong, and made decisions the agent couldn't make. The agent did the typing; the thinking was collaborative.

This log documents that process honestly.

---

## Phase 1: Analysis before writing a line of code

**What I asked:** Analyze the brief PDF and produce a deep technical analysis. Then I also showed it a separate ChatGPT-generated analysis of the same brief and asked it to synthesize both into a single unified roadmap.

**What the agent did well:**  
Produced a clear synthesis with concrete decisions: SQLite over JSON-file (synchronous, no server, full SQL), `better-sqlite3` over Prisma (no build step, simpler at this scale), implement A+B agents not all four (C degrades to one-shot summarization without multi-step behavior). It also proposed the key architectural idea: deterministic server-side scoring + LLM reasoning on top, rather than asking the LLM to do the math.

**What I had to steer:**  
The agent initially wanted to implement all four AI features from the brief. I pushed back — scoped it to A+B with the argument that quality over quantity matters more for this evaluation. The agent agreed and adjusted the roadmap.

---

## Phase 2: Scaffold and data layer

**What I asked:** Scaffold Next.js, install dependencies, build the DB schema and CRUD layer.

**What the agent generated correctly on the first attempt:**
- SQLite singleton with WAL mode and foreign key enforcement (`db.ts`)
- All Zod schemas and TypeScript types
- Full CRUD for tasks and subtasks including `createSubtasksBatch()` for agent writes
- `agent_runs` table with step-level tracing — this was my idea but the agent implemented it cleanly
- 10 realistic seed tasks with varied ages, priorities, statuses

**Where I had to fix things:**  
Zod v4 (which was installed) renamed `.errors[0]` to `.issues[0]`. The agent used training data from Zod v3. TypeScript caught it — I fixed all route files. The agent didn't know about this API change and wouldn't have caught it without the compiler.

---

## Phase 3: AI agents — the core of the project

**What I asked:** "Build the prioritization and decomposition agents with tool-calling loops."

**What the agent got right:**  
The Anthropic tool-calling loop pattern (`while stop_reason === 'tool_use'`) was correct on the first attempt. The agent understood the protocol without me explaining it. The structured output parsing with JSON regex fallback was a good defensive pattern I didn't ask for — the agent added it on its own.

**Where I intervened:**

*Prioritization agent:* The scoring formula (`age_hours × priority_weight × status_weight`) was specified by me in the roadmap before the agent wrote a line. I deliberately did not leave this to the agent — it's the kind of decision that should be made by a human, not generated. The agent implemented it correctly once specified.

*Decomposition agent:* The `tool_assess_clarity` heuristic was initially too aggressive — it triggered clarification questions for tasks with more than 30 characters in description, which was far too sensitive. I loosened the threshold to 20 chars minimum and tuned the keyword matching after testing against the seed tasks.

The clarity threshold of 0.65 was also set by me based on trade-off analysis. The agent didn't choose this number.

I also had to add a `userClarification` check to prevent double-clarification loops where the agent would ask the same questions twice if a user had already answered.

---

## Phase 4: API routes

**What I asked:** Create all API routes.

**What worked:** The agent generated clean route handlers with proper Zod validation at boundaries, 404s for missing resources, and correct HTTP semantics on the first pass.

**What I changed:** Nothing structural. The Zod `.issues` fix from Phase 2 applied here too.

---

## Phase 5: UI — initial version

**What I asked:** Build the two-column layout, TaskCard, TaskDetail, CreateTaskModal, PrioritizePanel, DecomposePanel.

**What the agent generated:**  
The initial UI worked but was rough. A single column, simple list, basic card components. PrioritizePanel showed results inline below the button, DecomposePanel had a working clarification → preview → confirm flow.

**Where I had to iterate heavily:**  
The layout went through many iterations in conversation. I directed the agent to:
- Switch to a two-column layout (task list left, task detail right, AI chat right)  
- Move from overlay panels to inline panels
- Make the header sticky
- Add filter/sort controls that don't scroll
- Redesign description as a tile with hover actions

Each of these was a back-and-forth — I'd describe what I wanted, the agent would implement, I'd look at the result and refine. Several things were reverted after trying them (e.g. making subtasks smaller width-wise — I reversed it after seeing it didn't make sense for the use case).

---

## Phase 6: Product decisions I made during development

Several features that aren't in the original brief emerged from product thinking during development. I proposed them, the agent implemented:

**AI Chat panel (Custom AI feature D):**  
I proposed this as the "custom idea" — a streaming chat with full task context in the right panel. The agent built the streaming architecture correctly using Anthropic's SDK. The system prompt that loads all tasks dynamically at each request was my design decision.

**Status Update Generator (Feature C):**  
Initially I said C degrades to one-shot. But then I implemented it properly — a 3-step agent that reads task details, subtask progress, and thread comments before composing the update. Placed in the Slack send modal as "Generate status update" button. This is genuinely multi-step and contextual.

**Send to Slack:**  
I designed the feature scope. The agent built the OAuth flow, the Slack API integration, and the send modal with Slack Block Kit formatting.

**Thread comments and emoji reactions:**  
I proposed organizing task discussion as a thread similar to HolyFrame (another project of mine). The agent implemented it, but I redesigned the visual approach several times — flat thread vs. nested, tiles vs. list rows, where the form appears. We went back and forth probably 5-6 times on this before settling on the current design.

**AI Provider settings:**  
I proposed allowing users to configure multiple AI providers (Anthropic, OpenAI, Groq, Mistral, Google) through the app UI rather than requiring an .env file. The agent built the settings panel, the unified LLM client (`lib/llm.ts`), and the DB-backed key storage. Later I asked it to route all agents through this system so the app works without any .env configuration.

---

## Phase 7: Design iterations

The visual design went through significant changes driven by my direction:

- Dark color scheme — I specified the exact palette values
- Three-column layout (list / detail / chat) — my proposal
- Description tile with hover actions (edit/reply/emoji) inspired by HolyFrame
- Inline editing instead of edit mode (click-to-edit pattern)
- Priority rank badges with gold/silver/bronze gradient in task header — my idea
- Chain animation on last subtask completion (HolyFrame-inspired)

The agent implemented all of these correctly once I described what I wanted. It rarely got the first attempt exactly right visually — I'd say "make it smaller", "move it to the right", "revert" multiple times per feature.

---

## Where the agent was genuinely useful

- **Boilerplate generation** — route handlers, DB queries, Zod schemas: correct on the first attempt, consistently
- **Agent loop pattern** — the Anthropic tool-use protocol was understood and implemented correctly without explanation
- **Consistency** — naming conventions, error handling patterns, TypeScript types stayed consistent across 60+ files
- **Speed** — what would have taken me days to type took hours of conversation
- **Code audit** — when I asked it to audit the project for dead code and issues, it found a real unused import, duplicate constants, and unsafe non-null assertions

---

## Where I had to intervene or override

- **Zod v4 API change** — the agent's training data reflected Zod v3; TypeScript caught this, I fixed it
- **Clarity heuristic tuning** — the generated threshold was too aggressive; I tuned it manually
- **Scoring formula** — I specified this, the agent implemented it
- **Layout decisions** — every major layout change required explicit direction from me
- **Scope management** — the agent would have implemented more features if I hadn't explicitly stopped it and said "we're done, prepare for submission"
- **Reversions** — I reverted probably 8-10 changes after seeing them in the browser (subtask width, assignee field removal, various positioning experiments)

---

## What I deliberately did NOT delegate

- Architecture decisions (SQLite, better-sqlite3, agent-loop pattern)
- The scoring formula in the prioritization agent
- The clarity threshold (0.65) in the decomposition agent
- Product decisions about what features to build
- The decision to implement API key management in-app instead of via .env
- Scope control — what's in, what's out

---

## Honest summary

The agent is extremely good at implementation once a decision is made. It's not good at making product decisions, knowing when to stop, or understanding which trade-offs matter for a specific evaluation context. Every significant design or product decision in this project was mine. Every file was typed by the agent.

The collaboration worked like this: I thought, directed, reviewed, and rejected. The agent typed, followed instructions, and flagged technical issues (TypeScript errors, API changes). Neither of us could have done it as well alone — I would have spent 3x the time typing, the agent would have built something that looks good but lacks product thinking.
