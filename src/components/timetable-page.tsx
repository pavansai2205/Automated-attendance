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
import { collection, query, where, Timestamp } from 'firebase/firestore';
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

export default function TimetablePage() {
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

  const coursesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'courses'), where('instructorId', '==', user.uid));
  }, [user, firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const courseIds = useMemo(() => courses?.map(c => c.id) || [], [courses]);

  // A bit more complex query to fetch nested collections
  // For now, we will fetch sessions for each course separately and combine them.
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useMemo(() => {
    if (!firestore || courseIds.length === 0) {
      setClassSessions([]);
      return;
    }
    setIsLoadingSessions(true);
    const promises = courseIds.map(id => {
      const sessionsQuery = query(collection(firestore, `courses/${id}/classSessions`), where('startTime', '>=', new Date()));
      return useCollection.get(sessionsQuery);
    });
    
    Promise.all(promises).then(snapshots => {
      const allSessions = snapshots.flat().map(doc => ({ id: doc.id, ...doc.data() })) as ClassSession[];
      allSessions.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
      setClassSessions(allSessions);
      setIsLoadingSessions(false);
    }).catch(console.error);

  }, [firestore, courseIds]);

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
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create class session.',
        });
      }
    });
  }
  
  // This is a workaround for the useCollection hook not directly supporting fetching subcollections in this manner.
  // A more robust solution might involve a dedicated hook for subcollections or restructuring data.
  useCollection.get = async (q) => {
    const { getDocs } = await import("firebase/firestore");
    const snapshot = await getDocs(q);
    return snapshot.docs;
  };


  return (
    <div className="grid gap-6 md:grid-cols-2">
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
      
      <Card>
        <CardHeader>
            <CardTitle className='flex items-center gap-2'>
                <CalendarDays />
                <span>Upcoming Sessions</span>
            </CardTitle>
            <CardDescription>
                Here are all the upcoming sessions for your courses.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingSessions ? <div className='flex justify-center items-center h-40'><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                 <ul className="space-y-2">
                    {classSessions.length > 0 ? classSessions.map((session) => (
                        <li key={session.id} className="flex justify-between items-center p-2 rounded-md even:bg-secondary">
                        <div>
                            <span className='font-semibold'>{courses?.find(c => c.id === session.courseId)?.name}</span>
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
