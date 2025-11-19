'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserCheck, Video } from 'lucide-react';
import { handleVerifyAndMarkAttendance, handleDetectFace } from '@/app/actions';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { Button } from './ui/button';

type Status = 'idle' | 'scanning' | 'detecting' | 'verifying' | 'success' | 'error';

export default function StudentAttendanceTaker() {
  const { user } = useUser();
  const firestore = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [lastAttendance, setLastAttendance] = useState<{ status: string; timestamp: Date } | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const { toast } = useToast();

  const userDocRef = user && firestore ? doc(firestore, 'users', user.uid) : null;

  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);
  const hasRegisteredFace = !!userData?.faceTemplate;

  const canMarkAttendance = useCallback(() => {
    if (!lastAttendance) return true;
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return lastAttendance.timestamp < twelveHoursAgo;
  }, [lastAttendance]);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setStatus('idle');
  }, []);

  const fetchLastAttendance = useCallback(async () => {
    if (!user || !firestore) return;
    setIsLoadingAttendance(true);
    try {
      const attendanceQuery = query(
        collection(firestore, 'attendanceRecords'),
        where('studentId', '==', user.uid)
      );
      const querySnapshot = await getDocs(attendanceQuery);
      if (!querySnapshot.empty) {
        const records = querySnapshot.docs.map(doc => doc.data());
        records.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        const lastRecord = records[0];
        setLastAttendance({
          status: lastRecord.status,
          timestamp: lastRecord.timestamp.toDate(),
        });
      }
    } catch (error) {
      console.error("Error fetching last attendance:", error);
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [user, firestore]);

  const startScanning = useCallback(() => {
    if (status !== 'idle' || !videoRef.current || !user || !canMarkAttendance()) return;
    
    setStatus('scanning');

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || document.hidden) return;

      setStatus('detecting');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const photoDataUri = canvas.toDataURL('image/jpeg');

      const detectionResult = await handleDetectFace(photoDataUri);
      if (detectionResult.success && detectionResult.faceDetected) {
        stopScanning();
        setStatus('verifying');
        
        const result = await handleVerifyAndMarkAttendance(photoDataUri, user.uid);

        if (result.success) {
          setStatus('success');
          toast({
            title: 'Attendance Marked!',
            description: 'Your attendance has been successfully recorded as "Present".',
          });
          fetchLastAttendance();
        } else {
          setStatus('error');
          toast({
            variant: 'destructive',
            title: 'Attendance Failed',
            description: result.error || 'Could not mark attendance. Please try again.',
          });
          // Allow user to try again after a delay
          setTimeout(() => setStatus('idle'), 5000);
        }
      } else {
        setStatus('scanning');
      }
    }, 2000);
  }, [status, user, canMarkAttendance, stopScanning, fetchLastAttendance, toast]);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!hasRegisteredFace || !canMarkAttendance()) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    if (!isUserDocLoading) {
      getCameraPermission();
    }
    if (user) fetchLastAttendance();

    return () => {
      stopScanning();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [fetchLastAttendance, user, hasRegisteredFace, isUserDocLoading, canMarkAttendance, stopScanning]);

  useEffect(() => {
    // Automatically start scanning if everything is ready
    if (hasCameraPermission && status === 'idle' && canMarkAttendance()) {
      startScanning();
    }
  }, [hasCameraPermission, status, canMarkAttendance, startScanning]);


  const getStatusMessage = () => {
    switch (status) {
      case 'idle': return 'Ready to scan. Please look at the camera.';
      case 'scanning': return 'Scanning for face...';
      case 'detecting': return 'Analyzing frame...';
      case 'verifying': return 'Face detected! Verifying your identity...';
      case 'success': return 'Attendance marked successfully!';
      case 'error': return 'Verification failed. Please try again or report to instructor.';
      default: return 'Preparing camera...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
        case 'scanning':
        case 'detecting':
        case 'verifying':
            return <Loader2 className="h-4 w-4 animate-spin" />;
        default:
            return <Video className="h-4 w-4" />;
    }
  }
  
  const renderContent = () => {
    if (isUserDocLoading || isLoadingAttendance) {
        return <Loader2 className="h-8 w-8 animate-spin" />;
    }

    if (!hasRegisteredFace) {
      return (
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertTitle>Face Not Registered</AlertTitle>
          <AlertDescription>
            You need to register your face before you can mark attendance. Please go to the
            <Button variant="link" asChild><a href="/settings">Settings</a></Button>
            page to complete your profile.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (!canMarkAttendance()) {
         return (
            <Alert className="w-full">
                <AlertTitle>Attendance Already Marked</AlertTitle>
                <AlertDescription>
                    You have already marked your attendance as "{lastAttendance?.status}" on {lastAttendance?.timestamp.toLocaleString()}. You can mark it again later.
                </AlertDescription>
            </Alert>
         )
    }

    if (hasCameraPermission === false) {
         return (
            <Alert variant="destructive" className="w-full">
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                Please enable camera permissions in your browser settings to use this feature.
                </AlertDescription>
            </Alert>
         )
    }
    
    return (
        <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {(hasCameraPermission === null || isUserDocLoading) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            )}
             <div className="absolute bottom-2 left-2 right-2">
                <div className="flex items-center justify-center gap-2 rounded-md bg-background/80 backdrop-blur-sm p-2 text-sm font-medium">
                    {getStatusIcon()}
                    <span>{getStatusMessage()}</span>
                </div>
            </div>
        </div>
    )
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Automated Attendance Check-in</CardTitle>
        <CardDescription>
          Position your face in the center of the frame. The system will automatically detect and verify you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 min-h-[300px]">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
