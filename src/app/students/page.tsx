import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import StudentListPageContent from "@/components/student-list-page-content";

// This is now a Server Component, which is more stable for Next.js routing.
export default function StudentsPage() {
  return (
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
  );
}
