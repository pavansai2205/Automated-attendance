'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Loader2, CalendarDays } from 'lucide-react';

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

interface StudentEnrollment {
  id: string;
  studentId: string;
  courseId: string;
}

export default function StudentTimetable() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // For this demo, we assume a student is enrolled in all courses.
  // In a real app, you would have an 'enrollments' collection.
  const coursesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'courses'));
  }, [firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const courseIds = useMemo(() => courses?.map(c => c.id) || [], [courses]);
  
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // This is a workaround for the useCollection hook not directly supporting fetching subcollections in this manner.
  useCollection.get = async (q) => {
    const { getDocs } = await import("firebase/firestore");
    const snapshot = await getDocs(q);
    return snapshot.docs;
  };
  
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

  const isLoading = isLoadingCourses || isLoadingSessions;

  return (
      <Card>
        <CardHeader>
            <CardTitle className='flex items-center gap-2'>
                <CalendarDays />
                <span>Your Upcoming Sessions</span>
            </CardTitle>
            <CardDescription>
                Here are all the upcoming sessions for your courses.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <div className='flex justify-center items-center h-40'><Loader2 className="h-8 w-8 animate-spin" /></div> : (
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
  );
}
