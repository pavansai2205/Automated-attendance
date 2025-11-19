'use client';

import { useTransition, useState, useMemo } from 'react';
import type { Student as StudentType, AttendanceRecord } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { handleGenerateJustification } from '@/app/actions';
import { Loader2, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { notFound } from 'next/navigation';

interface StudentDetailPageProps {
  studentId: string;
}

const formSchema = z.object({
  absenceReason: z.string().min(10, 'Please provide a reason for absence (min. 10 characters).'),
  additionalDetails: z.string().optional(),
});

export default function StudentDetailPage({ studentId }: StudentDetailPageProps) {
  const [isPending, startTransition] = useTransition();
  const [emailDraft, setEmailDraft] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  // Fetch student data in realtime
  const studentDocRef = useMemo(() => firestore ? doc(firestore, 'users', studentId) : null, [firestore, studentId]);
  const { data: student, isLoading: isLoadingStudent } = useDoc<Omit<StudentType, 'id' | 'name' | 'attendanceHistory' | 'attendanceStatus'>>(studentDocRef);

  // Fetch student attendance history in realtime
  const attendanceQuery = useMemo(() => firestore ? query(
    collection(firestore, 'attendanceRecords'), 
    where('studentId', '==', studentId),
    orderBy('timestamp', 'desc')
    ) : null, [firestore, studentId]);
  const { data: attendanceHistory, isLoading: isLoadingHistory } = useCollection<AttendanceRecord>(attendanceQuery);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      absenceReason: '',
      additionalDetails: '',
    },
  });

  if (isLoadingStudent || isLoadingHistory) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  if (!student) {
    notFound();
  }

  const studentName = `${student.firstName} ${student.lastName}`;
  const avatarUrl = student.faceTemplate || `https://i.pravatar.cc/150?u=${student.id}`;

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await handleGenerateJustification({
        studentName: studentName,
        professorName: 'Dr. Alan Grant', // Mock professor
        courseName: 'Introduction to Computer Science',
        absenceReason: values.absenceReason,
        additionalDetails: values.additionalDetails,
      });

      if (result.success && result.emailDraft) {
        setEmailDraft(result.emailDraft);
        setIsDialogOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to generate email draft.',
        });
      }
    });
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailDraft);
    toast({
        title: 'Copied to clipboard!',
        description: 'The email draft has been copied.',
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage asChild src={avatarUrl}>
              <Image src={avatarUrl} alt={studentName} width={80} height={80} data-ai-hint="person portrait"/>
            </AvatarImage>
            <AvatarFallback className="text-3xl">{studentName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-3xl">{studentName}</CardTitle>
            <CardDescription>Student ID: {studentId}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>Live attendance for all courses.</CardDescription>
          </CardHeader>
          <CardContent>
             <ul className="space-y-2">
              {attendanceHistory && attendanceHistory.map((record) => (
                <li key={record.id} className="flex justify-between items-center p-2 rounded-md even:bg-secondary">
                  <div>
                    <span>{record.timestamp.toDate().toLocaleDateString()}</span>
                    <span className='text-xs text-muted-foreground ml-2'>{record.classSessionId}</span>
                  </div>
                  <span className={`font-medium ${record.status === 'Present' ? 'text-primary' : 'text-destructive'}`}>{record.status}</span>
                </li>
              ))}
              {attendanceHistory?.length === 0 && <p className='text-muted-foreground text-sm'>No attendance records found.</p>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="text-primary" />
                  <span>Generate Absence Justification</span>
                </CardTitle>
                <CardDescription>
                  Use AI to draft a professional email to your professor explaining an absence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="absenceReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Absence</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., I had a doctor's appointment." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Details (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., I can provide a doctor's note if necessary." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {isPending ? 'Generating...' : 'Generate Email Draft'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Generated Email Draft</DialogTitle>
            <DialogDescription>
              Here is the AI-generated draft. You can copy it and send it to your professor.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-h-[400px] overflow-y-auto rounded-md border bg-secondary/50 p-4">
            <pre className="whitespace-pre-wrap bg-transparent p-0 font-sans text-sm">{emailDraft}</pre>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Close</Button>
            <Button onClick={copyToClipboard}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
