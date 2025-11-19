'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, ArrowRight } from 'lucide-react';
import type { AttendanceStatus } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { handleSummarizeTrends } from '@/app/actions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Student, AttendanceRecord } from '@/lib/types';

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

export default function DashboardPage() {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const firestore = useFirestore();

  // 1. Fetch all students in realtime
  const studentsQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('roleId', '==', 'student')), [firestore]);
  const { data: studentsData, isLoading: isLoadingStudents } = useCollection<Omit<Student, 'attendanceHistory' | 'attendanceStatus'>>(studentsQuery);

  // 2. Fetch today's attendance records in realtime
  const { start: startOfToday, end: endOfToday } = getDayRange(new Date());
  const attendanceQuery = useMemoFirebase(() => query(
      collection(firestore, 'attendanceRecords'),
      where('timestamp', '>=', Timestamp.fromDate(startOfToday)),
      where('timestamp', '<=', Timestamp.fromDate(endOfToday))
  ), [startOfToday, endOfToday, firestore]);
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


  const presentStudents = studentsWithAttendance.filter(s => s.attendanceStatus === 'Present').length;
  const totalStudents = studentsWithAttendance.length;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;

  const onSummarize = () => {
    startTransition(async () => {
      setError('');
      setSummary('');
       if (!attendanceRecords || attendanceRecords.length === 0) {
        setError('No attendance data available to summarize.');
        return;
      }
      const result = await handleSummarizeTrends("CS101", JSON.stringify(attendanceRecords));
      if (result.success) {
        setSummary(result.summary);
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };
  
    // This is mock data for now. A real implementation would query historical data.
    const chartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        }).reverse();

        return last7Days.map(date => {
            const present = Math.floor(Math.random() * (totalStudents > 0 ? totalStudents : 10 - 2)) + 2;
            const absent = (totalStudents > 0 ? totalStudents : 10) - present;
            return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Present: present,
            Absent: absent,
            };
        });
    }, [totalStudents]);


  const isLoading = isLoadingStudents || isLoadingAttendance;


  return (
    <div className="grid gap-4 md:gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Overall Attendance</CardTitle>
            <CardDescription>Today's attendance rate</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold">{attendancePercentage}%</span>
                </div>
                <Progress value={attendancePercentage} className="mt-2" />
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students Present</CardTitle>
            <CardDescription>Total students marked present</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-3xl font-bold">{presentStudents}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students Absent</CardTitle>
            <CardDescription>Total students marked absent</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-3xl font-bold">{totalStudents - presentStudents}</div>}
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="text-primary" />
              <span>AI-Powered Insights</span>
            </CardTitle>
            <CardDescription>Get a summary of attendance trends.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary && <p className="text-sm text-foreground/80 mb-4">{summary}</p>}
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <Button onClick={onSummarize} disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {isPending ? 'Analyzing...' : 'Summarize Trends'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
            <CardDescription>Mock attendance data</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Roll</CardTitle>
            <CardDescription>Live attendance status for all students.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className='flex justify-center items-center h-40'><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
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
    </div>
  );
}
