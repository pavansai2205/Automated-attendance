'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, GraduationCap } from 'lucide-react';
import type { Mark, Course } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export default function StudentMarksView() {
  const { user } = useUser();
  const firestore = useFirestore();

  const marksQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'marks'), where('studentId', '==', user.uid), orderBy('timestamp', 'desc'));
  }, [user, firestore]);
  const { data: marks, isLoading: isLoadingMarks } = useCollection<Mark>(marksQuery);
  
  // We need courses to display course names. For simplicity, we'll fetch all.
  // In a real app, you might only fetch courses the student is enrolled in.
  const coursesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'courses'));
  }, [firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const isLoading = isLoadingMarks || isLoadingCourses;

  const getPercentage = (score: number, total: number) => {
      if (total === 0) return 0;
      return Math.round((score / total) * 100);
  }

  const getGradeColor = (percentage: number) => {
      if (percentage >= 90) return 'text-green-500';
      if (percentage >= 80) return 'text-green-400';
      if (percentage >= 70) return 'text-yellow-500';
      if (percentage >= 60) return 'text-orange-500';
      return 'text-red-500';
  }

  return (
      <Card>
        <CardHeader>
            <CardTitle className='flex items-center gap-2'>
                <GraduationCap />
                <span>Your Marks</span>
            </CardTitle>
            <CardDescription>
                Here is a summary of your marks for all courses.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <div className='flex justify-center items-center h-40'><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Percentage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {marks && marks.length > 0 ? marks.map((mark) => {
                            const course = courses?.find(c => c.id === mark.courseId);
                            const percentage = getPercentage(mark.score, mark.totalScore);
                            return (
                                <TableRow key={mark.id}>
                                    <TableCell className='font-medium'>{mark.assignmentName}</TableCell>
                                    <TableCell>{course?.name || 'Unknown Course'}</TableCell>
                                    <TableCell>{mark.score} / {mark.totalScore}</TableCell>
                                    <TableCell className={`font-bold ${getGradeColor(percentage)}`}>{percentage}%</TableCell>
                                </TableRow>
                            );
                        }) : (
                             <TableRow>
                                <TableCell colSpan={4} className='text-center text-muted-foreground'>
                                    No marks have been entered for you yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            )}
        </CardContent>
      </Card>
  );
}

    