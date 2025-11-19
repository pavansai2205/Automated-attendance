'use client';

import { useState, useTransition } from 'react';
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
import { course, getAttendanceDataForChart } from '@/lib/data';
import type { AttendanceStatus } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { handleSummarizeTrends } from '@/app/actions';

const chartData = getAttendanceDataForChart();

const statusVariant: { [key in AttendanceStatus]: "default" | "destructive" | "secondary" } = {
  Present: 'default',
  Absent: 'destructive',
  Late: 'secondary',
};

export default function DashboardPage() {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const students = course.students;
  const presentStudents = students.filter(s => s.attendanceStatus === 'Present').length;
  const totalStudents = students.length;
  const attendancePercentage = Math.round((presentStudents / totalStudents) * 100);

  const onSummarize = () => {
    startTransition(async () => {
      setError('');
      setSummary('');
      const result = await handleSummarizeTrends();
      if (result.success) {
        setSummary(result.summary);
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Overall Attendance</CardTitle>
            <CardDescription>Today's attendance rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{attendancePercentage}%</span>
            </div>
            <Progress value={attendancePercentage} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students Present</CardTitle>
            <CardDescription>Total students marked present</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{presentStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students Absent</CardTitle>
            <CardDescription>Total students marked absent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{students.filter(s => s.attendanceStatus === 'Absent').length}</div>
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
            <CardDescription>Attendance for {course.name}</CardDescription>
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
            <CardDescription>Attendance status for all students in {course.name}.</CardDescription>
          </CardHeader>
          <CardContent>
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
                {students.map((student) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
