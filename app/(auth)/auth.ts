import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createGuestUser, getUser } from '@/lib/db/queries';
import { authConfig } from './auth.config';
import { DUMMY_PASSWORD } from '@/lib/constants';
import type { DefaultJWT } from 'next-auth/jwt';

export type UserType = 'guest' | 'regular';
export type UserRole = 'admin' | 'user';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
      role?: UserRole;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    role?: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    role?: UserRole;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        console.log('Authorize called with email:', email);

        try {
          const users = await getUser(email);
          console.log('Users found:', users.length);

          if (users.length === 0) {
            console.log('User not found, comparing with dummy password');
            await compare(password, DUMMY_PASSWORD);
            return null;
          }

          const [user] = users;

          if (!user.password) {
            console.log('User has no password, comparing with dummy password');
            await compare(password, DUMMY_PASSWORD);
            return null;
          }

          console.log('Comparing passwords');
          console.log('User password hash length:', user.password.length);
          const passwordsMatch = await compare(password, user.password);
          console.log('Passwords match:', passwordsMatch);

          if (!passwordsMatch) return null;

          console.log('Login successful for user:', user.email);
          return { ...user, type: 'regular' };
        } catch (error) {
          console.error('Error in authorize function:', error);
          throw error;
        }
      },
    }),
    Credentials({
      id: 'guest',
      credentials: {},
      async authorize() {
        try {
          console.log('Guest authorize function called');
          const [guestUser] = await createGuestUser();
          console.log('Guest user created:', guestUser.email);
          return { ...guestUser, type: 'guest' };
        } catch (error) {
          console.error('Error creating guest user:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
        session.user.role = token.role;
      }

      return session;
    },
  },
});
