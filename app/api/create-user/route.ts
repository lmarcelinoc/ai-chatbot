import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createUser, getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    // Get credentials from request body
    const { email, password } = await request.json();

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUsers = await getUser(email);
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 },
      );
    }

    // Create the user
    await createUser(email, password);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        user: { email },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 },
    );
  }
}
