'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  CheckCircle,
  Camera,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';


const allMenuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/attendance', label: 'Attendance', icon: Camera, roles: ['instructor'] },
  { href: '/timetable', label: 'Timetable', icon: CalendarDays, roles: ['instructor'] },
  { href: '/students', label: 'Students', icon: Users, roles: ['instructor'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['instructor'] },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc(userDocRef);

  const role = userData?.roleId;

  if (!user || !role) return null; // Don't render sidebar if user or role is not loaded

  const menuItems = allMenuItems.filter(item => {
    if (!item.roles) return true; // Item is for all roles
    return item.roles.includes(role);
  });

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <CheckCircle className="size-8 text-primary" />
          <h1 className="text-xl font-semibold text-sidebar-foreground">
            AttendX
          </h1>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
