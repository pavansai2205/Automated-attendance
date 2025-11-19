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
import { Camera, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { AttendanceRecord } from '@/lib/types';

export default function StudentDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const attendanceQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('studentId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(5) // Fetch last 5 records
    );
  }, [user, firestore]);

  const { data: attendanceHistory, isLoading } = useCollection<AttendanceRecord>(attendanceQuery);

  const latestRecord = useMemo(() => {
    if (!attendanceHistory || attendanceHistory.length === 0) return null;
    return attendanceHistory[0];
  }, [attendanceHistory]);

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

  const statusInfo = getStatusInfo(latestRecord?.status || 'None');

  return (
    <div className="grid gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.displayName || user?.email}!</CardTitle>
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
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/attendance">
                  <Camera className="mr-2" />
                  Go to Attendance Check-in
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </CardContent>
      </Card>
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
              {attendanceHistory && attendanceHistory.length > 0 ? (
                attendanceHistory.map((record) => (
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
    </div>
  );
}
