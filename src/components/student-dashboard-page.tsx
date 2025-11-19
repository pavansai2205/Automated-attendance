'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, Clock, CalendarDays, User as UserIcon, Phone, Home, Shield } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { AttendanceRecord } from '@/lib/types';
import FaceRegistration from './face-registration';

export default function StudentDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const attendanceQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('studentId', '==', user.uid)
    );
  }, [user, firestore]);

  const { data: attendanceHistory, isLoading: isAttendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const sortedHistory = useMemo(() => {
    if (!attendanceHistory) return [];
    // Sort client-side
    return attendanceHistory.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  }, [attendanceHistory]);
  
  const latestFiveRecords = useMemo(() => sortedHistory.slice(0, 5), [sortedHistory]);

  const latestRecord = useMemo(() => {
    if (!sortedHistory || sortedHistory.length === 0) return null;
    return sortedHistory[0];
  }, [sortedHistory]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Present':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-500" />,
          text: 'You were marked Present.',
          badge: 'default',
        };
      case 'Late':
        return {
          icon: <Clock className="h-6 w-6 text-yellow-500" />,
          text: 'You were marked Late.',
          badge: 'secondary',
        };
      case 'Absent':
        return {
          icon: <Clock className="h-6 w-6 text-red-500" />,
          text: 'You were marked Absent.',
          badge: 'destructive',
        };
      default:
        return {
          icon: <Clock className="h-6 w-6 text-gray-500" />,
          text: 'No recent attendance.',
          badge: 'outline',
        };
    }
  };
  
  const isLoading = isUserDataLoading || isAttendanceLoading;
  const statusInfo = getStatusInfo(latestRecord?.status || 'None');
  const displayName = userData ? `Welcome, ${userData.firstName}!` : 'Welcome!';

  return (
    <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{displayName}</CardTitle>
            <CardDescription>Here's a summary of your attendance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Latest Attendance</CardTitle>
                {latestRecord && (
                  <Badge variant={statusInfo.badge as any}>{latestRecord.status}</Badge>
                )}
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : latestRecord ? (
                  <>
                    {statusInfo.icon}
                    <div>
                      <p className="font-semibold">{statusInfo.text}</p>
                      <p className="text-sm text-muted-foreground">
                        On {latestRecord.timestamp.toDate().toLocaleDateString()} for session{' '}
                        {latestRecord.classSessionId}
                      </p>
                    </div>
                  </>
                ) : (
                  <p>No attendance records found yet.</p>
                )}
              </CardContent>
              <CardFooter className='grid grid-cols-2 gap-2'>
                <Button asChild className="w-full">
                  <Link href="/attendance">
                    <Camera className="mr-2" />
                    Go to Attendance Check-in
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/timetable">
                    <CalendarDays className="mr-2" />
                    View Timetable
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your last 5 attendance records.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                ) : (
                <ul className="space-y-2">
                    {latestFiveRecords && latestFiveRecords.length > 0 ? (
                    latestFiveRecords.map((record) => (
                        <li
                        key={record.id}
                        className="flex justify-between items-center p-2 rounded-md even:bg-secondary"
                        >
                        <div>
                            <span>{record.timestamp.toDate().toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                            {record.classSessionId}
                            </span>
                        </div>
                        <Badge variant={getStatusInfo(record.status).badge as any}>
                            {record.status}
                        </Badge>
                        </li>
                    ))
                    ) : (
                    <p className="text-muted-foreground text-sm">No records to display.</p>
                    )}
                </ul>
                )}
            </CardContent>
            </Card>

            <FaceRegistration />
        </div>
    </div>
  );
}
