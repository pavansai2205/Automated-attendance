'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import ReportGenerator from "@/components/report-generator";

function ReportsContent() {
 return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 lg:p-6">
          <ReportGenerator />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function ReportsPage() {
    return (
        <AuthGuard requiredRole="instructor">
            <ReportsContent />
        </AuthGuard>
    )
}