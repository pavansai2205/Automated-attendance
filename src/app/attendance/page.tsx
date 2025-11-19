'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import InstructorAttendanceTaker from "@/components/instructor-attendance-taker";
import StudentAttendanceCheckin from "@/components/student-attendance-checkin";
import { AuthGuard } from "@/components/auth-guard";
import { useUser, useDoc, useFirestore } from '@/firebase';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

function AttendanceContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isLoading = isUserLoading || isUserDataLoading;
  
  if (isLoading || !userData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const role = userData?.roleId;

 return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 lg:p-6">
          {role === 'instructor' ? <InstructorAttendanceTaker /> : <StudentAttendanceCheckin />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AttendancePage() {
  return (
    <AuthGuard>
      <AttendanceContent />
    </AuthGuard>
  );
}
