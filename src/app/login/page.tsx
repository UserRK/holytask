import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/')

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: '#0f1117' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="flex w-full flex-col items-stretch">
            <div className="flex h-4 items-center justify-between" style={{ backgroundColor: '#2e3347' }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-2.5 w-2.5" style={{ backgroundColor: '#0f1117' }} />
              ))}
            </div>
            <div className="my-6 text-center" style={{ backgroundColor: '#1a1d27' }}>
              <h1 className="text-3xl font-bold tracking-widest" style={{ color: '#e2e8f0', fontFamily: 'var(--font-inter), sans-serif' }}>
                HOLYTASK
              </h1>
              <p className="mt-2 text-xs tracking-widest" style={{ color: '#7c86a0' }}>
                AI-powered task tracker
              </p>
            </div>
            <div className="flex h-4 items-center justify-between" style={{ backgroundColor: '#2e3347' }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-2.5 w-2.5" style={{ backgroundColor: '#0f1117' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Sign in */}
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/' })
          }}
        >
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1a1d27', border: '1px solid #2e3347', color: '#e2e8f0' }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-center text-xs" style={{ color: '#4a5568' }}>
          By signing in you agree to our Terms of Service
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
