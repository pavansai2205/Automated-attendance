import { notFound } from 'next/navigation';
import { getStudentById } from '@/lib/data';
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import StudentDetailPage from '@/components/student-detail-page';

export default function Page({ params }: { params: { studentId: string } }) {
  const student = getStudentById(params.studentId);

  if (!student) {
    notFound();
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 lg:p-6">
          <StudentDetailPage student={student} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
