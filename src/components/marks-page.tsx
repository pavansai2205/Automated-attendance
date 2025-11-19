'use client';

import { useMemo, useState, useTransition } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, GraduationCap, Check } from 'lucide-react';
import { handleAddMark } from '@/app/actions';
import type { Course, Student, Mark } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const formSchema = z.object({
  studentId: z.string().min(1, 'Please select a student.'),
  courseId: z.string().min(1, 'Please select a course.'),
  assignmentName: z.string().min(1, 'Please enter an assignment name.'),
  score: z.coerce.number().min(0, 'Score cannot be negative.'),
  totalScore: z.coerce.number().min(1, 'Total score must be at least 1.'),
});

export default function MarksPage() {
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      courseId: '',
      assignmentName: '',
    },
  });

  const coursesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'courses'), where('instructorId', '==', user.uid));
  }, [user, firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const studentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('roleId', '==', 'student'));
  }, [firestore]);
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);
  
  const courseIds = useMemo(() => courses?.map(c => c.id) || [], [courses]);

  const recentMarksQuery = useMemo(() => {
    if (!firestore || courseIds.length === 0) return null;
    // This query is now secure, as it only asks for marks within the instructor's courses.
    return query(
        collection(firestore, 'marks'), 
        where('courseId', 'in', courseIds), 
        orderBy('timestamp', 'desc')
    );
  }, [firestore, courseIds]);

  const { data: recentMarks, isLoading: isLoadingMarks } = useCollection<Mark>(recentMarksQuery);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await handleAddMark(values.studentId, values.courseId, values.assignmentName, values.score, values.totalScore);

      if (result.success) {
        toast({
          title: 'Mark Added!',
          description: 'The new mark has been successfully recorded.',
        });
        form.reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add mark.',
        });
      }
    });
  }

  const isLoading = isLoadingCourses || isLoadingStudents || isLoadingMarks;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap />
                <span>Enter Student Marks</span>
              </CardTitle>
              <CardDescription>
                Select a student, course, and enter their mark for an assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStudents}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingStudents ? (
                          <SelectItem value="loading" disabled>Loading students...</SelectItem>
                        ) : (
                          students?.map(student => (
                            <SelectItem key={student.id} value={student.id}>{`${student.firstName} ${student.lastName}`}</SelectItem>
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
                name="assignmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Midterm Exam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="score"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Score</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 85" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="totalScore"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Score</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2" />
                )}
                {isPending ? 'Saving...' : 'Save Mark'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className='flex items-center gap-2'>
                <GraduationCap />
                <span>Recently Added Marks</span>
            </CardTitle>
            <CardDescription>
                A list of the most recently entered marks for your courses.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {(isLoading || (courseIds.length > 0 && isLoadingMarks)) ? <div className='flex justify-center items-center h-40'><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentMarks?.length > 0 ? recentMarks.map((mark) => {
                             const student = students?.find(s => s.id === mark.studentId);
                             const course = courses?.find(c => c.id === mark.courseId);
                             return (
                                <TableRow key={mark.id}>
                                    <TableCell>{student ? `${student.firstName} ${student.lastName}` : 'Unknown'}</TableCell>
                                    <TableCell>
                                        <div className='font-medium'>{mark.assignmentName}</div>
                                        <div className='text-xs text-muted-foreground'>{course?.name}</div>
                                    </TableCell>
                                    <TableCell>{mark.score} / {mark.totalScore}</TableCell>
                                </TableRow>
                             )
                        }) : (
                             <TableRow>
                                <TableCell colSpan={3} className='text-center text-muted-foreground'>
                                    No marks entered yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
