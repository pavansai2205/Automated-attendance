'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import TimetablePage from "@/components/timetable-page";
import { useUser, useDoc, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';

function TimetableContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (userData?.roleId === 'student') {
        router.replace('/timetable/student');
    }
  }, [userData, router]);

  const isLoading = isUserLoading || isUserDocLoading;

  if (isLoading || !userData || userData.roleId === 'student') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
 
  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 lg:p-6">
          <TimetablePage />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <TimetableContent />
    </AuthGuard>
  );
}
