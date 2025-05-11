'use server';

import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/app/(auth)/auth';

/**
 * Role-based access control middleware
 * Use this on server components to check if the user has the required role
 * @param requiredRole - The role required to access the resource
 * @returns A function that throws a redirect if the user doesn't have the required role
 */
export async function requireRole(requiredRole: UserRole) {
  const session = await auth();

  // Not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  const userWithRole = session.user as { role?: UserRole };

  // User doesn't have the required role
  if (
    userWithRole.role !== requiredRole &&
    !(requiredRole === 'user' && userWithRole.role === 'admin')
  ) {
    // Admins can access user routes, but users cannot access admin routes
    redirect('/');
  }
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const session = await auth();
    return (session?.user as { role?: UserRole })?.role === 'admin' || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Middleware to protect admin routes
 * Will redirect to home page if the user is not an admin
 */
export async function requireAdmin() {
  return requireRole('admin');
}
