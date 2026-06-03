import { z } from 'zod'

export const TaskStatus = z.enum(['todo', 'in-progress', 'done'])
export const TaskPriority = z.enum(['low', 'medium', 'high'])

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  status: TaskStatus,
  priority: TaskPriority,
  assignee: z.string().default(''),
  created_at: z.number(),
  updated_at: z.number(),
})

export const SubtaskSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  title: z.string().min(1),
  completed: z.number().int().min(0).max(1),
  created_at: z.number(),
})

export const AgentRunSchema = z.object({
  id: z.string(),
  type: z.enum(['prioritize', 'decompose']),
  input_snapshot: z.string(),
  steps: z.string(),
  output: z.string(),
  latency_ms: z.number().nullable(),
  accepted: z.number().nullable(),
  created_at: z.number(),
})

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).default(''),
  status: TaskStatus.default('todo'),
  priority: TaskPriority.default('medium'),
  assignee: z.string().max(100).default(''),
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  assignee: z.string().max(100).optional(),
})

export const TaskFilterSchema = z.object({
  status: z.enum(['all', 'todo', 'in-progress', 'done']).default('all'),
  sort: z.enum(['priority', 'date']).default('date'),
})

export type Task = z.infer<typeof TaskSchema>
export type Subtask = z.infer<typeof SubtaskSchema>
export type AgentRun = z.infer<typeof AgentRunSchema>
export type CreateTask = z.infer<typeof CreateTaskSchema>
export type UpdateTask = z.infer<typeof UpdateTaskSchema>
export type TaskFilter = z.infer<typeof TaskFilterSchema>
export type TaskStatusType = z.infer<typeof TaskStatus>
export type TaskPriorityType = z.infer<typeof TaskPriority>

export const PRIORITY_ORDER: Record<TaskPriorityType, number> = {
  high: 3,
  medium: 2,
  low: 1,
}
