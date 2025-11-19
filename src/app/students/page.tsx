'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import StudentListPage from "@/components/student-list-page";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { doc } from "firebase/firestore";

export default function StudentsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const isLoading = isUserLoading || isUserDocLoading;
  const role = userData?.roleId;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (role && role !== 'instructor') {
        router.push('/');
      }
    }
  }, [user, role, isLoading, router]);


  if (isLoading || !user || role !== 'instructor') {
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
          <StudentListPage />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
