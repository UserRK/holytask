import { nanoid } from 'nanoid'
import { getDb } from './db'
import type { AgentRun } from '@/types'

export interface AgentStep {
  tool: string
  input: unknown
  output: unknown
}

export interface CreateAgentRun {
  type: 'prioritize' | 'decompose'
  input_snapshot: unknown
  steps: AgentStep[]
  output: unknown
  latency_ms: number
}

export function createAgentRun(data: CreateAgentRun): AgentRun {
  const db = getDb()
  const now = Date.now()
  const run: AgentRun = {
    id: nanoid(),
    type: data.type,
    input_snapshot: JSON.stringify(data.input_snapshot),
    steps: JSON.stringify(data.steps),
    output: JSON.stringify(data.output),
    latency_ms: data.latency_ms,
    accepted: null,
    created_at: now,
  }

  db.prepare(`
    INSERT INTO agent_runs (id, type, input_snapshot, steps, output, latency_ms, accepted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(run.id, run.type, run.input_snapshot, run.steps, run.output, run.latency_ms, run.accepted, run.created_at)

  return run
}

export function recordAcceptance(id: string, accepted: boolean): void {
  const db = getDb()
  db.prepare('UPDATE agent_runs SET accepted = ? WHERE id = ?').run(accepted ? 1 : 0, id)
}

export function getRecentRuns(limit = 10): AgentRun[] {
  const db = getDb()
  return db.prepare('SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?').all(limit) as AgentRun[]
}
