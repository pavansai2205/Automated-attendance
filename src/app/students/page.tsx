'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import StudentListPageContent from "@/components/student-list-page-content";

export default function StudentsPage() {
  return (
    <AuthGuard requiredRole="instructor">
      <SidebarProvider>
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <SidebarInset>
          <AppHeader />
          <main className="p-4 lg:p-6">
            <StudentListPageContent />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
