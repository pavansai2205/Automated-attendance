'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { handleUpdateFaceTemplate } from '@/app/actions';

export default function FaceRegistration() {
  const { user } = useUser();
  const firestore = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetake, setIsRetake] = useState(false); // To allow re-registration
  const { toast } = useToast();

  const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const hasRegisteredFace = !!userData?.faceTemplate && !isRetake;

  useEffect(() => {
    let stream: MediaStream;

    const getCameraPermission = async () => {
      // Only request camera if we don't have a face registered, or if user wants to retake
      if (!hasRegisteredFace) {
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
      }
    };

    getCameraPermission();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        // This is necessary to stop the camera when the component unmounts or view changes
        const cleanupStream = videoRef.current.srcObject as MediaStream;
        cleanupStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasRegisteredFace]);

  const handleRegister = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!hasCameraPermission) {
      toast({
        variant: 'destructive',
        title: 'Camera Access Required',
        description: 'Please enable camera permissions to register your face.',
      });
      return;
    }
    if (!user) return;

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

    const result = await handleUpdateFaceTemplate(photoDataUri, user.uid);

    if (result.success) {
      toast({
        title: 'Face Registered!',
        description: 'Your face template has been saved successfully.',
      });
      setIsRetake(false); // Go back to "completed" state
    } else {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: result.error || 'Could not save your face template. Please try again.',
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
         <CardContent className='flex items-center justify-center h-24'>
           <Loader2 className="h-8 w-8 animate-spin" />
         </CardContent>
       </Card>
     )
  }

  if (hasRegisteredFace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Face Registration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className='font-medium'>Your face is registered for attendance.</p>
            <p className='text-sm text-muted-foreground'>You can now use facial recognition to check in for classes.</p>
        </CardContent>
         <CardFooter>
            <Button variant="outline" className='w-full' onClick={() => setIsRetake(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Register Again
            </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Your Face</CardTitle>
        <CardDescription>
          Use your webcam to create a secure face template for attendance.
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
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button onClick={handleRegister} disabled={isProcessing || !hasCameraPermission} className="w-full">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Saving...' : 'Register My Face'}
        </Button>
        {isRetake && (
            <Button variant="ghost" className='w-full' onClick={() => setIsRetake(false)} disabled={isProcessing}>
                Cancel
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
