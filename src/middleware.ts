import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // If Google OAuth not configured — skip auth, open access
  if (!process.env.AUTH_GOOGLE_ID) return NextResponse.next()

  const isAuth = !!req.auth
  const isLoginPage = req.nextUrl.pathname === '/login'

  if (!isAuth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
