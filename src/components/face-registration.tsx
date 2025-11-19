'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, UserCheck } from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { handleRegisterFace } from '@/app/actions';

export default function FaceRegistration() {
  const { user } = useUser();
  const firestore = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const userDocRef = user && firestore ? doc(firestore, 'users', user.uid) : null;
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const hasRegisteredFace = !!userData?.faceTemplate;

  const getCameraPermission = useCallback(async () => {
    if (hasRegisteredFace) {
      setHasCameraPermission(false);
      return;
    }
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
  }, [hasRegisteredFace]);

  useEffect(() => {
    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [getCameraPermission]);

  const registerFace = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;

    setIsProcessing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    }

    const photoDataUri = canvas.toDataURL('image/jpeg');

    const result = await handleRegisterFace(photoDataUri, user.uid);

    if (result.success) {
      toast({
        title: 'Face Registered!',
        description: 'Your face has been successfully saved to your profile.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: result.error || 'Could not register your face. Please try again.',
      });
    }

    setIsProcessing(false);
  };
  
  if (isUserDocLoading) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Face Registration</CardTitle>
            </CardHeader>
            <CardContent className='flex items-center justify-center'>
                 <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
        </Card>
    )
  }

  if (hasRegisteredFace) {
    return (
       <Card>
        <CardHeader>
            <CardTitle className='flex items-center gap-2'>
                <UserCheck className='text-primary'/>
                <span>Face Registration Complete</span>
            </CardTitle>
            <CardDescription>
                You have already registered your face. You can now use face recognition for attendance.
            </CardDescription>
        </CardHeader>
      </Card>
    )
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Your Face</CardTitle>
        <CardDescription>
          Capture a clear photo of your face. This will be used to verify your identity for attendance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {hasCameraPermission === false && (
          <Alert variant="destructive" className="w-full">
            <AlertTitle>Camera Access Denied</AlertTitle>
            <AlertDescription>
              Please enable camera permissions in your browser settings to register your face.
            </AlertDescription>
          </Alert>
        )}
        <div className="w-full max-w-md aspect-video bg-muted rounded-md overflow-hidden relative">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {hasCameraPermission === null && !hasRegisteredFace && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={registerFace} disabled={!hasCameraPermission || isProcessing} className="w-full">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Processing...' : 'Capture and Register Face'}
        </Button>
      </CardFooter>
    </Card>
  );
}
