'use client';

import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import FaceRegistration from "@/components/face-registration";
import { doc } from "firebase/firestore";
import { AuthGuard } from "@/components/auth-guard";

function SettingsContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const isLoading = isUserLoading || isUserDocLoading;
  const role = userData?.roleId;

  if (isLoading || !user) {
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
        <main className="p-4 lg:p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your application settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>General settings will be implemented here.</p>
            </CardContent>
          </Card>
          {role === 'student' && <FaceRegistration />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}
