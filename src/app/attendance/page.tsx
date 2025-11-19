'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import InstructorAttendanceTaker from "@/components/instructor-attendance-taker";
import { AuthGuard } from "@/components/auth-guard";

function AttendanceContent() {
 return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 lg:p-6">
          <InstructorAttendanceTaker />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AttendancePage() {
  return (
    <AuthGuard requiredRole="instructor">
      <AttendanceContent />
    </AuthGuard>
  );
}
