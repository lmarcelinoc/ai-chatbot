import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
    error: '/login', // Error page that displays authentication errors
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return false; // Redirect to login page by default
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
