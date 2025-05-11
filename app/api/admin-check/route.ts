import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export async function GET() {
  try {
    const session = await auth();

    // Return session and admin status
    const response = {
      isAuthenticated: !!session,
      isAdmin: (session?.user as { role?: string })?.role === 'admin',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 },
    );
  }
}
