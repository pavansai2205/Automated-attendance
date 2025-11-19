'use client';

import { useUser, useDoc, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'instructor';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!user || !firestore || !requiredRole) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore, requiredRole]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (requiredRole && !isUserDocLoading && userData) {
        if (userData.roleId !== requiredRole) {
            // If role does not match, redirect to home/dashboard
            router.push('/');
        }
    }
  }, [requiredRole, userData, isUserDocLoading, router]);


  // Show loading indicator while we're checking for the user
  if (isUserLoading || !user || (requiredRole && isUserDocLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If a required role is specified, but the user data doesn't match,
  // we show a loader while redirecting to avoid flashing content.
  if (requiredRole && userData?.roleId !== requiredRole) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  // If we have a user (and role check has passed), render the children
  return <>{children}</>;
}
