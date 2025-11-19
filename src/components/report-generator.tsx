'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Loader2, FileText, CalendarIcon } from 'lucide-react';
import { handleGenerateReport } from '@/app/actions';
import type { Course, ReportData, AttendanceStatus } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  courseId: z.string().min(1, 'Please select a course.'),
  dateRange: z
    .object({
      from: z.date(),
      to: z.date(),
    })
    .refine(data => data.from && data.to, 'Please select a date range.'),
});

const statusVariant: { [key in AttendanceStatus]: 'default' | 'destructive' | 'secondary' } = {
  Present: 'default',
  Absent: 'destructive',
  Late: 'secondary',
};

export default function ReportGenerator() {
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [reportData, setReportData] = useState<ReportData[] | null>(null);
  const [courseName, setCourseName] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: '',
    },
  });

  const coursesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'courses'), where('instructorId', '==', user.uid));
  }, [user, firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      setReportData(null);
      const selectedCourse = courses?.find(c => c.id === values.courseId);
      if (!selectedCourse) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not find selected course.' });
          return;
      }
      setCourseName(selectedCourse.name);

      const result = await handleGenerateReport(values.courseId, values.dateRange.from, values.dateRange.to);

      if (result.success) {
        if (result.report.length === 0) {
             toast({ title: 'No Data Found', description: 'There is no attendance data for the selected course and date range.' });
        }
        setReportData(result.report);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to generate report.',
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText />
                <span>Attendance Report Generator</span>
              </CardTitle>
              <CardDescription>
                Select a course and date range to generate an attendance report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCourses}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCourses ? (
                          <SelectItem value="loading" disabled>Loading courses...</SelectItem>
                        ) : (
                          courses?.map(course => (
                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date range</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className="pl-3 text-left font-normal"
                          >
                            {field.value?.from ? (
                              field.value.to ? (
                                <>
                                  {format(field.value.from, 'LLL dd, y')} -{' '}
                                  {format(field.value.to, 'LLL dd, y')}
                                </>
                              ) : (
                                format(field.value.from, 'LLL dd, y')
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={field.value?.from}
                          selected={field.value}
                          onSelect={field.onChange}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2" />
                )}
                {isPending ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      {isPending && (
          <div className='flex justify-center items-center h-40'>
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className='ml-2'>Generating your report...</p>
          </div>
      )}

      {reportData && (
          <Card>
              <CardHeader>
                  <CardTitle>Attendance Report for {courseName}</CardTitle>
                  <CardDescription>
                      {format(form.getValues('dateRange.from'), 'LLL dd, y')} - {format(form.getValues('dateRange.to'), 'LLL dd, y')}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? reportData.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row.studentName}</TableCell>
                                <TableCell>{row.date}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className='text-center text-muted-foreground'>
                                    No attendance records found for this period.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                  </Table>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
