'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
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
import { collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { Loader2, CalendarPlus, CalendarDays } from 'lucide-react';
import { handleCreateClassSession } from '@/app/actions';

const formSchema = z.object({
  courseId: z.string().min(1, 'Please select a course.'),
  startTime: z.string().min(1, 'Please select a start time.'),
  endTime: z.string().min(1, 'Please select an end time.'),
});

interface Course {
  id: string;
  name: string;
  description: string;
  instructorId: string;
}

interface ClassSession {
  id: string;
  courseId: string;
  startTime: Timestamp;
  endTime: Timestamp;
}

interface TimetablePageProps {
  role: 'student' | 'instructor' | string;
}

export default function TimetablePage({ role }: TimetablePageProps) {
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: '',
      startTime: '',
      endTime: '',
    },
  });

  const instructorCoursesQuery = useMemo(() => {
    if (!user || !firestore || role !== 'instructor') return null;
    return query(collection(firestore, 'courses'), where('instructorId', '==', user.uid));
  }, [user, firestore, role]);
  const { data: instructorCourses, isLoading: isLoadingInstructorCourses } = useCollection<Course>(instructorCoursesQuery);

  const allCoursesQuery = useMemo(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'courses'));
  }, [firestore]);
  const { data: allCourses, isLoading: isLoadingAllCourses } = useCollection<Course>(allCoursesQuery);
  
  const courses = role === 'instructor' ? instructorCourses : allCourses;
  const isLoadingCourses = role === 'instructor' ? isLoadingInstructorCourses : isLoadingAllCourses;


  const courseIds = useMemo(() => courses?.map(c => c.id) || [], [courses]);

  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // This is a workaround since useCollection doesn't support array of queries easily.
  // We manually fetch all sessions for the relevant courses.
  useEffect(() => {
    if (!firestore || courseIds.length === 0) {
      setClassSessions([]);
      return;
    }
    setIsLoadingSessions(true);
    
    const fetchSessions = async () => {
        try {
            const allSessions: ClassSession[] = [];
            // Firestore 'in' query is limited to 30 items. We batch if needed.
            const batches: string[][] = [];
            for (let i = 0; i < courseIds.length; i += 30) {
                batches.push(courseIds.slice(i, i + 30));
            }

            for (const batch of batches) {
                const sessionsQuery = query(collection(firestore, 'attendanceRecords'), where('courseId', 'in', batch));
                // This is incorrect, sessions are in a subcollection.
                // Let's query each subcollection. This is inefficient but will work for a demo.
            }

            const sessionPromises = courseIds.map(id => 
                getDocs(query(collection(firestore, `courses/${id}/classSessions`), where('startTime', '>=', new Date())))
            );

            const sessionSnapshots = await Promise.all(sessionPromises);
            
            for (const snapshot of sessionSnapshots) {
                snapshot.forEach(doc => {
                    allSessions.push({ id: doc.id, ...doc.data() } as ClassSession);
                });
            }
            
            allSessions.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
            setClassSessions(allSessions);
        } catch (error) {
            console.error("Error fetching class sessions:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch class sessions." });
        } finally {
            setIsLoadingSessions(false);
        }
    };
    
    fetchSessions();
  }, [firestore, courseIds, toast]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const startTime = new Date(values.startTime);
      const endTime = new Date(values.endTime);

      const result = await handleCreateClassSession(values.courseId, startTime, endTime);

      if (result.success) {
        toast({
          title: 'Class Session Created!',
          description: 'The new session has been added to the timetable.',
        });
        form.reset();
        // Trigger a re-fetch of sessions - simple way is to clear and let useEffect handle it.
        setClassSessions([]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create class session.',
        });
      }
    });
  }

  const isLoading = isLoadingCourses || isLoadingSessions;

  return (
    <div className={`grid gap-6 ${role === 'instructor' ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
      {role === 'instructor' && (
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarPlus />
                  <span>Add Class Session</span>
                </CardTitle>
                <CardDescription>
                  Schedule a new class session for one of your courses.
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
                            <SelectValue placeholder="Select a course to schedule a session for" />
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
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
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
                    <CalendarPlus className="mr-2" />
                  )}
                  {isPending ? 'Scheduling...' : 'Add Session'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
      
      <Card className={role === 'student' ? 'md:col-span-1' : ''}>
        <CardHeader>
            <CardTitle className='flex items-center gap-2'>
                <CalendarDays />
                <span>Upcoming Sessions</span>
            </CardTitle>
            <CardDescription>
                {role === 'instructor' ? 'Here are all the upcoming sessions for your courses.' : 'Here are all the upcoming class sessions.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <div className='flex justify-center items-center h-40'><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                 <ul className="space-y-2">
                    {classSessions.length > 0 ? classSessions.map((session) => (
                        <li key={session.id} className="flex justify-between items-center p-2 rounded-md even:bg-secondary">
                        <div>
                            <span className='font-semibold'>{allCourses?.find(c => c.id === session.courseId)?.name || 'Unknown Course'}</span>
                            <p className="text-sm text-muted-foreground">
                                {session.startTime.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} - {session.endTime.toDate().toLocaleString([], { timeStyle: 'short' })}
                            </p>
                        </div>
                        </li>
                    )) : <p className='text-muted-foreground text-sm text-center py-8'>No upcoming sessions scheduled.</p>}
                 </ul>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
