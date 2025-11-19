'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowRight } from 'lucide-react';
import type { AttendanceStatus, Student } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { AttendanceRecord } from '@/lib/types';
import { Button } from './ui/button';

const statusVariant: { [key in AttendanceStatus]: "default" | "destructive" | "secondary" } = {
  Present: 'default',
  Absent: 'destructive',
  Late: 'secondary',
};

// Helper to get start and end of day
const getDayRange = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

export default function StudentListPageContent() {
  const firestore = useFirestore();

  // 1. Fetch all students in realtime
  const studentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('roleId', '==', 'student'));
  }, [firestore]);
  const { data: studentsData, isLoading: isLoadingStudents } = useCollection<Omit<Student, 'attendanceHistory' | 'attendanceStatus'>>(studentsQuery);

  // 2. Fetch today's attendance records in realtime
  const todayRange = useMemo(() => getDayRange(new Date()), []);
  const attendanceQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'attendanceRecords'),
        where('timestamp', '>=', Timestamp.fromDate(todayRange.start)),
        where('timestamp', '<=', Timestamp.fromDate(todayRange.end))
      )
  }, [firestore, todayRange]);
  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  
  // 3. Combine students and their attendance status
  const studentsWithAttendance = useMemo(() => {
    if (!studentsData) return [];
    
    return studentsData.map(student => {
      const record = attendanceRecords?.find(r => r.studentId === student.id);
      const status: AttendanceStatus = record ? (record.status as AttendanceStatus) : 'Absent';
      const avatarUrl = student.faceTemplate || `https://i.pravatar.cc/150?u=${student.id}`;
      return {
        ...student,
        name: `${student.firstName} ${student.lastName}`,
        avatar: avatarUrl,
        attendanceStatus: status,
      };
    });
  }, [studentsData, attendanceRecords]);

  const isLoading = isLoadingStudents || isLoadingAttendance;


  return (
    <div className="grid gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>A list of all registered students in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className='flex justify-center items-center h-40'><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Today's Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsWithAttendance.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage asChild src={student.avatar}>
                              <Image src={student.avatar} alt={student.name} width={40} height={40} data-ai-hint="person portrait" />
                            </AvatarImage>
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {student.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.id}</TableCell>
                       <TableCell className="text-muted-foreground">{student.email}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[student.attendanceStatus]}>{student.attendanceStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/students/${student.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
