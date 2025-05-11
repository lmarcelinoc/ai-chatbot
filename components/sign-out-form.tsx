'use client';

import { signOut } from '@/app/(auth)/auth';

export const SignOutForm = () => {
  const handleSignOut = async () => {
    await signOut({
      redirectTo: '/',
    });
  };

  return (
    <form action={handleSignOut} className="w-full">
      <button
        type="submit"
        className="w-full text-left px-1 py-0.5 text-red-500"
      >
        Sign out
      </button>
    </form>
  );
};
