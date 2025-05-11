'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { useEffect, useState } from 'react';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { login, type LoginActionState } from '../actions';
import { useSession } from 'next-auth/react';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [state, formAction] = useFormState<LoginActionState, FormData>(login, {
    status: 'idle',
  });

  const { update: updateSession } = useSession();

  useEffect(() => {
    console.log('Login state changed:', state.status, state.error);

    if (state.status === 'failed') {
      setIsSubmitting(false);
      console.error('Authentication failed:', state.error);
      toast({
        type: 'error',
        description: state.error || 'Invalid credentials!',
      });
    } else if (state.status === 'invalid_data') {
      setIsSubmitting(false);
      console.error('Invalid data submitted:', state.error);
      toast({
        type: 'error',
        description: state.error || 'Failed validating your submission!',
      });
    } else if (state.status === 'success') {
      console.log('Authentication successful');
      setIsSuccessful(true);

      console.log('Updating session...');
      updateSession();
      console.log('Session update called');

      // Add a delay to ensure session is updated before navigation
      console.log('Setting timeout for navigation...');
      setTimeout(() => {
        console.log('Navigating to home page...');
        router.push('/');
      }, 1000); // Increased timeout for more reliable session update
    }
  }, [state.status, state.error, router, updateSession]);

  const handleSubmit = (formData: FormData) => {
    console.log('Submitting login form with email:', formData.get('email'));

    // Debug credentials
    console.log('Email:', formData.get('email'));
    console.log(
      'Password length:',
      formData.get('password')
        ? (formData.get('password') as string).length
        : 'No password',
    );

    setEmail(formData.get('email') as string);
    setIsSubmitting(true);

    console.log('Calling form action...');
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </SubmitButton>
        </AuthForm>
      </div>
    </div>
  );
}
