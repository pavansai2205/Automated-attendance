'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import StudentDetailPage from '@/components/student-detail-page';
import { useUser } from "@/firebase";
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Page({ params }: { params: { studentId: string } }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
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
          <StudentDetailPage studentId={params.studentId} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    