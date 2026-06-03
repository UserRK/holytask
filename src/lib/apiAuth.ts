import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const LOCAL_USER = { id: 'local', name: 'Local User', image: null }

export async function requireUser() {
  // Single-user mode (no Google OAuth configured)
  if (!process.env.AUTH_GOOGLE_ID) {
    return { user: LOCAL_USER, error: null }
  }

  try {
    const session = await auth()
    if (session?.user?.id) {
      return {
        user: {
          id: session.user.id,
          name: session.user.name ?? 'User',
          image: session.user.image ?? null,
        },
        error: null,
      }
    }
  } catch {}

  return {
    user: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }
}
