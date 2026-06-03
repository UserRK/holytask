import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user?.id) token.sub = user.id
      const pic = (profile as { picture?: string } | undefined)?.picture
      if (pic) token.picture = pic
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub)     session.user.id    = token.sub
        if (token.name)    session.user.name  = token.name as string
        if (token.picture) session.user.image = token.picture as string
      }
      return session
    },
  },
})
