'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, ScanFace, Video, Play, StopCircle } from 'lucide-react';
import { handleRecognizeAndMarkAttendance, handleDetectFace } from '@/app/actions';
import { Button } from './ui/button';

type Status = 'idle' | 'scanning' | 'detecting' | 'recognizing' | 'success' | 'error' | 'stopped';

export default function InstructorAttendanceTaker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [lastRecognition, setLastRecognition] = useState<{ name: string; time: Date } | null>(null);
  const { toast } = useToast();

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setStatus('stopped');
    setIsProcessing(false);
  }, []);

  const startScanning = useCallback(() => {
    if (isProcessing || !videoRef.current || hasCameraPermission === false) {
      if(hasCameraPermission === false) {
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
      return;
    }
    setStatus('scanning');
    setIsProcessing(true);

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || document.hidden) return;

      setStatus('detecting');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      }
      const photoDataUri = canvas.toDataURL('image/jpeg');

      // First, quickly detect if there's a face
      const detectionResult = await handleDetectFace(photoDataUri);
      if (detectionResult.success && detectionResult.faceDetected) {
        // If a face is detected, pause the interval and attempt recognition
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setStatus('recognizing');

        const recognitionResult = await handleRecognizeAndMarkAttendance(photoDataUri);
        if (recognitionResult.success && recognitionResult.studentName) {
          setStatus('success');
          setLastRecognition({ name: recognitionResult.studentName, time: new Date() });
          toast({
            title: 'Attendance Marked!',
            description: `${recognitionResult.studentName} has been marked as "Present".`,
          });
          // Recognition successful, stop scanning and wait for user to start again
          stopScanning();
          setStatus('success');
           // After a short delay, go back to idle to allow for scanning another student
          setTimeout(() => {
            setIsProcessing(false);
            setStatus('idle');
          }, 3000);
        } else {
          setStatus('error');
          toast({
            variant: 'destructive',
            title: 'Recognition Failed',
            description: recognitionResult.error || 'Could not recognize student. Please try again.',
          });
          // After an error, restart scanning after a brief pause
          setTimeout(() => {
            if (!scanIntervalRef.current) startScanning();
          }, 2000);
        }
      } else {
         // If no face, just go back to scanning
         setStatus('scanning');
      }
    }, 2000); // Scan every 2 seconds
  }, [isProcessing, toast, hasCameraPermission, stopScanning]);

  useEffect(() => {
    let stream: MediaStream;
    const getCameraPermission = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
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

    return () => {
      stopScanning();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
         const cleanupStream = videoRef.current.srcObject as MediaStream;
         cleanupStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stopScanning]);


  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return 'Ready to scan. Press "Start Scanning".';
      case 'scanning':
        return 'Scanning for students...';
      case 'detecting':
        return 'Analyzing frame...';
      case 'recognizing':
        return 'Face detected! Recognizing student...';
      case 'success':
        return `Success! ${lastRecognition?.name} marked present.`;
      case 'error':
        return 'Recognition failed. Please try again.';
      case 'stopped':
          return 'Scanning stopped.';
      default:
        return 'Point the camera at a student.';
    }
  };
  
    const getStatusIcon = () => {
        switch (status) {
            case 'scanning':
            case 'detecting':
            case 'recognizing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            default:
                return <Video className="h-4 w-4" />;
        }
    }


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Automated Attendance Scanner</CardTitle>
        <CardDescription>
          Start the scanner to automatically detect and recognize students when they appear in the frame.
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <ScanFace className="text-white/50 h-1/2 w-1/2" />
          </div>
          {hasCameraPermission === null && (
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
      </CardContent>
       <CardFooter className='grid grid-cols-2 gap-2'>
            <Button onClick={startScanning} disabled={isProcessing}>
                <Play className='mr-2' />
                Start Scanning
            </Button>
            <Button onClick={stopScanning} disabled={!isProcessing} variant="destructive">
                <StopCircle className='mr-2' />
                Stop Scanning
            </Button>
       </CardFooter>
    </Card>
  );
}
