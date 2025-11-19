'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, ScanFace } from 'lucide-react';
import { handleRecognizeAndMarkAttendance } from '@/app/actions';

export default function InstructorAttendanceTaker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

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

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const recognizeAndMark = async () => {
    if (!videoRef.current || !canvasRef.current) return;

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

    const result = await handleRecognizeAndMarkAttendance(photoDataUri);

    if (result.success) {
      toast({
        title: 'Attendance Marked!',
        description: `${result.studentName} has been marked as "Present".`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Recognition Failed',
        description: result.error || 'Could not recognize a student or mark attendance. Please try again.',
      });
    }

    setIsProcessing(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Scan Student for Attendance</CardTitle>
        <CardDescription>
          Point the camera at a student to recognize them and mark their attendance.
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
      <CardFooter>
        <Button onClick={recognizeAndMark} disabled={!hasCameraPermission || isProcessing} className="w-full">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanFace className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Recognizing...' : 'Scan and Mark Attendance'}
        </Button>
      </CardFooter>
    </Card>
  );
}
