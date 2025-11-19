'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import ProfilePage from "@/components/profile-page";

function ProfileContent() {
 return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 lg:p-6">
          <ProfilePage />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
