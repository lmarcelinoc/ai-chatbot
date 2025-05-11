'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createUser, getUser } from '@/lib/db/queries';
import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
  error?: string;
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  console.log('Login action called');
  try {
    const email = formData.get('email');
    const password = formData.get('password');

    console.log('Email provided:', email);
    console.log(
      'Password length:',
      password ? (password as string).length : 'No password',
    );

    if (!email || !password) {
      console.error('Missing email or password');
      return {
        status: 'invalid_data',
        error: 'Email and password are required',
      };
    }

    console.log('Validating with Zod schema');
    try {
      const validatedData = authFormSchema.parse({
        email,
        password,
      });
      console.log('Validation successful');

      console.log('Attempting to sign in with credentials provider');
      try {
        const result = await signIn('credentials', {
          email: validatedData.email,
          password: validatedData.password,
          redirect: false,
        });

        console.log('Sign in result:', JSON.stringify(result, null, 2));

        if (result?.error) {
          console.error('Sign in error:', result.error);
          return {
            status: 'failed',
            error: result.error,
          };
        }

        // Successfully logged in
        console.log('Sign in successful');
        return { status: 'success' };
      } catch (signInError) {
        console.error('Error during sign in:', signInError);
        console.error(
          'Stack trace:',
          signInError instanceof Error ? signInError.stack : 'No stack trace',
        );
        return {
          status: 'failed',
          error:
            signInError instanceof Error
              ? signInError.message
              : 'Unknown error during sign in',
        };
      }
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        return {
          status: 'invalid_data',
          error: validationError.errors.map((e) => e.message).join(', '),
        };
      }
      return {
        status: 'failed',
        error: 'Validation error occurred',
      };
    }
  } catch (error) {
    console.error('Unexpected error in login action:', error);
    console.error(
      'Stack trace:',
      error instanceof Error ? error.stack : 'No stack trace',
    );
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
  error?: string;
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    await createUser(validatedData.email, validatedData.password);
    const result = await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    if (result?.error) {
      return {
        status: 'failed',
        error: result.error,
      };
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 'invalid_data',
        error: error.errors.map((e) => e.message).join(', '),
      };
    }

    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
