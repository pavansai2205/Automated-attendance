'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, CheckCircle, XCircle, Upload } from 'lucide-react';
import { useUser } from '@/firebase';
import { handleVerifyAndMarkAttendance } from '@/app/actions';

export default function StudentAttendanceCheckin() {
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [statusMessage, setStatusMessage] = useState('Point your camera at your face and take a picture.');
  const { toast } = useToast();

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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const cleanupStream = videoRef.current.srcObject as MediaStream;
        cleanupStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const processAndVerify = async (photoDataUri: string) => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Logged In',
            description: 'You must be logged in to mark attendance.',
        });
        return;
    }
    
    setIsProcessing(true);
    setStatus('processing');
    setStatusMessage('Verifying your identity and marking attendance...');

    const result = await handleVerifyAndMarkAttendance(photoDataUri, user.uid);

    if (result.success) {
      setStatus('success');
      setStatusMessage('Attendance marked successfully!');
      toast({
        title: 'Success!',
        description: 'You have been marked as "Present".',
      });
    } else {
      setStatus('error');
      setStatusMessage(result.error || 'Verification failed. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Attendance Failed',
        description: result.error || 'Could not mark attendance.',
      });
    }

    setIsProcessing(false);
  };


  const captureFromWebcam = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!hasCameraPermission) {
      toast({
        variant: 'destructive',
        title: 'Camera Access Required',
        description: 'Please enable camera permissions to take a picture.',
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    }

    const photoDataUri = canvas.toDataURL('image/jpeg');
    await processAndVerify(photoDataUri);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please select an image file.',
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const photoDataUri = e.target?.result as string;
        if (photoDataUri) {
            await processAndVerify(photoDataUri);
        }
    };
    reader.readAsDataURL(file);
    
    if(event.target) {
        event.target.value = '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Camera className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Attendance Check-in</CardTitle>
        <CardDescription>
          Use your webcam or upload a photo to mark your attendance for the current session.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {hasCameraPermission === false && (
          <Alert variant="destructive" className="w-full">
            <AlertTitle>Camera Access Denied</AlertTitle>
            <AlertDescription>
              Enable camera permissions to use your webcam. You can still upload a photo.
            </AlertDescription>
          </Alert>
        )}
        <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {hasCameraPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 p-4 rounded-md bg-secondary w-full">
            {getStatusIcon()}
            <p className="text-sm font-medium">{statusMessage}</p>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-1 md:grid-cols-2 gap-2">
         <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Photo
        </Button>
        <Button onClick={captureFromWebcam} disabled={isProcessing || !hasCameraPermission}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Processing...' : 'Mark Attendance with Webcam'}
        </Button>
      </CardFooter>
    </Card>
  );
}
