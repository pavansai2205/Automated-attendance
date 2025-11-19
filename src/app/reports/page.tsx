'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth-guard";

export default function ReportsPage() {
  return (
    <AuthGuard>
      <SidebarProvider>
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <SidebarInset>
          <AppHeader />
          <main className="p-4 lg:p-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>View and generate reports.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Reports functionality will be implemented here.</p>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
