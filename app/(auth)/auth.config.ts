import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {},
  // Allow localhost and other non-production hosts during development/testing.
  // Vercel automatically sets this in production, but adding it here ensures
  // `next start` works locally without needing extra env vars.
  trustHost: true,
} satisfies NextAuthConfig;
