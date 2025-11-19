'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2 } from 'lucide-react';
import { handleMarkAttendance } from '@/app/actions';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export default function StudentAttendanceTaker() {
  const { user } = useUser();
  const firestore = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAttendance, setLastAttendance] = useState<{ status: string; timestamp: Date } | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const { toast } = useToast();

  const fetchLastAttendance = useCallback(async () => {
    if (!user || !firestore) return;
    setIsLoadingAttendance(true);
    try {
      const attendanceQuery = query(
        collection(firestore, 'attendanceRecords'),
        where('studentId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(attendanceQuery);
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        setLastAttendance({
          status: docData.status,
          timestamp: docData.timestamp.toDate(),
        });
      }
    } catch (error) {
      console.error("Error fetching last attendance:", error);
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [user, firestore]);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();
    fetchLastAttendance();

    // Cleanup: stop video stream when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [fetchLastAttendance]);

  const markAttendance = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;

    setIsProcessing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if(context){
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    }

    const photoDataUri = canvas.toDataURL('image/jpeg');

    const result = await handleMarkAttendance(photoDataUri, user.uid);

    if (result.success) {
      toast({
        title: 'Attendance Marked!',
        description: 'Your attendance has been successfully recorded as "Present".',
      });
      fetchLastAttendance(); // Refresh last attendance status
    } else {
      toast({
        variant: 'destructive',
        title: 'Attendance Failed',
        description: result.error || 'Could not mark attendance. Please try again.',
      });
    }

    setIsProcessing(false);
  };

  const canMarkAttendance = () => {
    if (!lastAttendance) return true;
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return lastAttendance.timestamp < twelveHoursAgo;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Mark Your Attendance</CardTitle>
        <CardDescription>
          Use your camera to verify your presence. A snapshot will be taken to confirm attendance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {hasCameraPermission === false && (
          <Alert variant="destructive" className="w-full">
            <AlertTitle>Camera Access Denied</AlertTitle>
            <AlertDescription>
              Please enable camera permissions in your browser settings to use this feature.
            </AlertDescription>
          </Alert>
        )}
        <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {hasCameraPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {isLoadingAttendance ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : canMarkAttendance() ? (
          <Button onClick={markAttendance} disabled={!hasCameraPermission || isProcessing} className="w-full">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Processing...' : 'Mark Attendance'}
          </Button>
        ) : (
          <Alert className="w-full">
            <AlertTitle>Attendance Already Marked</AlertTitle>
            <AlertDescription>
                You have already marked your attendance as "{lastAttendance?.status}" on {lastAttendance?.timestamp.toLocaleString()}. You can mark it again later.
            </AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
}
