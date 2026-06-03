import { getDb } from './db'
import { nanoid } from 'nanoid'

export interface AiSetting {
  id: string
  user_id: string
  provider: string
  api_key: string
  model: string
  is_active: number
  created_at: number
}

export function getAiSettings(userId: string): AiSetting[] {
  const db = getDb()
  return db.prepare(`SELECT * FROM ai_settings WHERE user_id = ? ORDER BY created_at ASC`).all(userId) as AiSetting[]
}

export function getActiveAiSetting(userId: string): AiSetting | null {
  const db = getDb()
  return (db.prepare(`SELECT * FROM ai_settings WHERE user_id = ? AND is_active = 1`).get(userId) as AiSetting) ?? null
}

export function upsertAiSetting(userId: string, provider: string, apiKey: string, model: string): AiSetting {
  const db = getDb()
  const existing = db.prepare(`SELECT * FROM ai_settings WHERE user_id = ? AND provider = ?`).get(userId, provider) as AiSetting | undefined

  if (existing) {
    db.prepare(`UPDATE ai_settings SET api_key = ?, model = ? WHERE id = ?`).run(apiKey, model, existing.id)
    return { ...existing, api_key: apiKey, model }
  }

  const now = Date.now()
  const id = nanoid()
  db.prepare(`
    INSERT INTO ai_settings (id, user_id, provider, api_key, model, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(id, userId, provider, apiKey, model, now)

  return { id, user_id: userId, provider, api_key: apiKey, model, is_active: 0, created_at: now }
}

export function activateAiSetting(userId: string, provider: string): void {
  const db = getDb()
  db.transaction(() => {
    db.prepare(`UPDATE ai_settings SET is_active = 0 WHERE user_id = ?`).run(userId)
    db.prepare(`UPDATE ai_settings SET is_active = 1 WHERE user_id = ? AND provider = ?`).run(userId, provider)
  })()
}

export function deleteAiSetting(userId: string, provider: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM ai_settings WHERE user_id = ? AND provider = ?`).run(userId, provider)
}
