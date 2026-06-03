'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, TaskStatusType, Subtask } from '@/types'
import { TaskCard } from '@/components/TaskCard'
import { CreateTaskModal } from '@/components/CreateTaskModal'
import { TaskDetail } from '@/components/TaskDetail'
import { PrioritizePanel } from '@/components/PrioritizePanel'
import { ChatPanel } from '@/components/ChatPanel'
import { SettingsModal } from '@/components/SettingsModal'

type FilterStatus = 'all' | TaskStatusType
type SortMode = 'date' | 'priority'

const STATUS_TABS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [subtaskMeta, setSubtaskMeta] = useState<Record<string, { total: number; completed: number }>>({})
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [sort, setSort] = useState<SortMode>('date')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [priorityRanks, setPriorityRanks] = useState<Record<string, number>>({})
  const [showSettings, setShowSettings] = useState(false)
  const [chatMessage, setChatMessage] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  const loadTasks = useCallback(async () => {
    if (isFirstLoad.current) {
      setLoading(true)
      isFirstLoad.current = false
    }
    const res = await fetch(`/api/tasks?status=${filter}&sort=${sort}`)
    if (res.ok) {
      const data: Task[] = await res.json()
      setTasks(data)

      const metas: Record<string, { total: number; completed: number }> = {}
      await Promise.all(
        data.map(async t => {
          const r = await fetch(`/api/tasks/${t.id}/subtasks`)
          if (r.ok) {
            const subs: Subtask[] = await r.json()
            metas[t.id] = { total: subs.length, completed: subs.filter(s => s.completed).length }
          }
        })
      )
      setSubtaskMeta(metas)
    }
    setLoading(false)
  }, [filter, sort])

  useEffect(() => { loadTasks() }, [loadTasks])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowCreate(true)
      }
      if (e.key === 'Escape') {
        setShowCreate(false)
        setSelectedTask(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleTaskClick(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (task) setSelectedTask(task)
  }

  const filtered = tasks
    .filter(t => search.trim() === '' || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ra = priorityRanks[a.id] ?? 999
      const rb = priorityRanks[b.id] ?? 999
      return ra - rb
    })

  const sortLabel = sort === 'date' ? '↓ Newest first' : '↓ Highest priority'

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#22252f' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: '#2a2d3a', backgroundColor: '#1c1e26' }}>
        <div className="flex items-center gap-4">
          <span style={{ color: 'var(--text)', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: '18px' }}>HOLYTASK</span>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <SettingsIcon />
          Settings
        </button>
      </header>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Task list */}
        <div
          className="flex flex-col flex-shrink-0"
          style={{ width: '460px', borderRight: '1px solid #2a2d3a', backgroundColor: '#22252f', overflow: 'hidden' }}
        >
          {/* Fixed top — filters */}
          <div className="p-4 space-y-3 border-b flex-shrink-0" style={{ borderColor: '#2a2d3a' }}>
            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {loading ? '...' : `${filtered.length} of ${tasks.length}`}
              </span>

              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: filter === tab.value ? '#6366f1' : 'transparent',
                      color: filter === tab.value ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
                <button
                  onClick={() => setSort(s => s === 'date' ? 'priority' : 'date')}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                  title={sortLabel}
                >
                  {sort === 'date' ? '↓ Date' : '↓ Priority'}
                </button>
              </div>
            </div>

            {/* Add task + AI Prioritize row */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ flex: '1', backgroundColor: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.4)', color: '#818cf8' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = '#6366f1' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                title="Ctrl+N"
              >
                <span>+</span>
                <span>Add task</span>
              </button>
              <PrioritizePanel
                onTaskClick={handleTaskClick}
                onApply={ranks => setPriorityRanks(ranks)}
              />
              {Object.keys(priorityRanks).length > 0 && (
                <button
                  onClick={() => setPriorityRanks({})}
                  className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none' }}
                  title="Clear priority ranks"
                >
                  ✕
                </button>
              )}
            </div>

          </div>

          {/* Scrollable task list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">{search ? '🔍' : '📝'}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {search ? `No results for "${search}"` : 'No tasks yet'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'Try a different search term' : 'Use the Add task button above'}
                </p>
              </div>
            ) : (
              filtered.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  subtaskCount={subtaskMeta[task.id]?.total ?? 0}
                  completedSubtaskCount={subtaskMeta[task.id]?.completed ?? 0}
                  onClick={() => setSelectedTask(task)}
                  isSelected={selectedTask?.id === task.id}
                  rank={priorityRanks[task.id]}
                />
              ))
            )}
          </div>
        </div>

        {/* MIDDLE — Task detail */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1e2029' }}>
          {selectedTask ? (
            <TaskDetail
              key={selectedTask.id}
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onUpdated={loadTasks}
              onDeleted={() => { loadTasks(); setSelectedTask(null) }}
              onSendToChat={msg => setChatMessage(msg)}
              rank={priorityRanks[selectedTask.id]}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '40px', opacity: 0.2 }}>✦</span>
              <p className="text-sm">Click any task to open it</p>
              <p className="text-xs" style={{ opacity: 0.6 }}>Ctrl+N to create a new one</p>
            </div>
          )}
        </div>

        {/* RIGHT — AI Chat */}
        <ChatPanel
          pendingMessage={chatMessage}
          onPendingConsumed={() => setChatMessage(null)}
        />
      </div>

      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={loadTasks} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
