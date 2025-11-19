'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import StudentTimetable from "@/components/student-timetable";

function StudentTimetableContent() {
 return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 lg:p-6">
          <StudentTimetable />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  return (
    <AuthGuard requiredRole="student">
      <StudentTimetableContent />
    </AuthGuard>
  );
}
