'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { toast } from '@/components/toast';
import { AlertCircle, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

// Removed server action import
// import { login, type LoginActionState } from '../actions';
import { useSession } from 'next-auth/react';

// Define the actual form/logic component
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { update: updateSession, status: sessionStatus } = useSession();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // Call client-side signIn directly
      const result = await signIn('credentials', {
        redirect: false, // We handle redirect manually after checking the result
        email: email,
        password: password,
        // callbackUrl // Optional: Let signIn handle redirect? Test without first.
      });

      if (result?.error) {
        // Handle errors returned by signIn (e.g., wrong password)
        console.error('SignIn Error:', result.error);
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password.');
        } else {
          // Use a generic message or potentially map other specific errors
          setError(`Login failed: ${result.error}`);
        }
        setLoading(false);
      } else if (result?.ok) {
        // SignIn was successful internally, cookies should be set.
        // NOW perform the redirect using Next.js router.
        console.log('SignIn successful, redirecting to:', callbackUrl);
        router.push(callbackUrl);
        // No need to setLoading(false) here as we are navigating away
      } else {
        // Handle unexpected non-error, non-ok result
        console.error('Unexpected SignIn Result:', result);
        setError('Login failed for an unknown reason.');
        setLoading(false);
      }
    } catch (error) {
      // Catch network errors or other exceptions during signIn
      console.error('Login Process Exception:', error);
      setError('An error occurred during login. Please try again.');
      setLoading(false);
    }
    // Remove finally block if setLoading handled in all branches
  };

  // Return the JSX for the form
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
        <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Use your email and password to sign in
        </p>
      </div>
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            required
            id="email"
            placeholder="email@example.com"
            autoComplete="email"
            name="email"
            type="email"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {/* Add forgot password link if needed */}
            {/* <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot Password?</Link> */}
          </div>
          <Input
            required
            id="password"
            placeholder="Password"
            name="password"
            type="password"
          />
        </div>
        <SubmitButton isSuccessful={false}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Login
        </SubmitButton>
        <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
          {"Don't have an account? "}
          <Link
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            href="/register"
          >
            Register
          </Link>
        </p>
        {/* Keep Guest Login if applicable */}
        <div className="relative" />
      </form>
    </div>
  );
}

// The main page component now wraps LoginForm in Suspense
export default function LoginPage() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        {' '}
        {/* Simple fallback */}
        <LoginForm />
      </Suspense>
    </div>
  );
}
