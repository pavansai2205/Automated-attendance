'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import StudentDetailPage from '@/components/student-detail-page';
import { AuthGuard } from '@/components/auth-guard';

export default function Page({ params }: { params: { studentId: string } }) {
  return (
    <AuthGuard requiredRole="instructor">
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
    </AuthGuard>
  );
}
