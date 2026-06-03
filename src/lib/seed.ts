import { getDb } from './db'
import { nanoid } from 'nanoid'

const SEED_TASKS = [
  {
    title: 'Implement JWT refresh token rotation',
    description: 'The current auth system uses long-lived JWTs without rotation. We need to implement refresh token rotation to improve security. Should update the /auth/refresh endpoint, store refresh tokens in the database with expiry, and revoke old tokens on use.',
    status: 'in-progress',
    priority: 'high',
    daysAgo: 8,
  },
  {
    title: 'Add pagination to the tasks API',
    description: 'The GET /api/tasks endpoint returns all tasks without pagination. As the dataset grows this will be slow. Implement cursor-based pagination with a limit parameter. Update the frontend to load more tasks on scroll.',
    status: 'todo',
    priority: 'medium',
    daysAgo: 5,
  },
  {
    title: 'Fix memory leak in WebSocket connection handler',
    description: 'Production monitoring shows memory usage growing over time. Suspected cause is event listeners not being removed when WebSocket connections close. Need to profile and fix.',
    status: 'todo',
    priority: 'high',
    daysAgo: 12,
  },
  {
    title: 'Write unit tests for the payment service',
    description: 'The payment service has 0% test coverage. Write unit tests for charge, refund, and webhook handling. Mock Stripe API calls.',
    status: 'todo',
    priority: 'medium',
    daysAgo: 3,
  },
  {
    title: 'Migrate user avatars to S3',
    description: 'Currently avatars are stored on the local filesystem which breaks horizontal scaling. Migrate to S3, update upload endpoint, and serve via CloudFront CDN.',
    status: 'todo',
    priority: 'low',
    daysAgo: 15,
  },
  {
    title: 'Set up error monitoring with Sentry',
    description: 'No centralized error monitoring in place. Integrate Sentry into both the Next.js frontend and the API. Configure source maps and set up alert rules for P1 errors.',
    status: 'in-progress',
    priority: 'medium',
    daysAgo: 2,
  },
  {
    title: 'Refactor database query layer',
    description: 'Direct SQL queries are scattered across multiple service files. Refactor into a repository pattern with clear separation between query logic and business logic.',
    status: 'todo',
    priority: 'low',
    daysAgo: 20,
  },
  {
    title: 'Implement rate limiting on auth endpoints',
    description: 'Auth endpoints /login and /register have no rate limiting, making them vulnerable to brute-force attacks. Add Redis-based rate limiting with configurable thresholds per IP.',
    status: 'todo',
    priority: 'high',
    daysAgo: 6,
  },
  {
    title: 'Update Node.js to v22 LTS',
    description: 'The project is running Node.js v18 which enters maintenance mode soon. Update to v22 LTS, test for compatibility issues, and update CI pipeline.',
    status: 'done',
    priority: 'medium',
    daysAgo: 1,
  },
  {
    title: 'Create onboarding documentation for new engineers',
    description: 'New engineers spend 2-3 days getting set up. Write a comprehensive onboarding doc covering local setup, architecture overview, deploy process, and common gotchas.',
    status: 'todo',
    priority: 'low',
    daysAgo: 25,
  },
]

export function seedIfEmpty() {
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) as n FROM tasks').get() as { n: number }).n
  if (count > 0) return

  const insert = db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction(() => {
    for (const t of SEED_TASKS) {
      const createdAt = Date.now() - t.daysAgo * 24 * 3_600_000
      insert.run(nanoid(), t.title, t.description, t.status, t.priority, createdAt, createdAt)
    }
  })

  insertMany()
  console.log('[seed] Inserted', SEED_TASKS.length, 'seed tasks')
}
