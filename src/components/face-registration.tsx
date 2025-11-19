'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, UserCheck, RefreshCw } from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { handleUpdateFaceTemplate } from '@/app/actions';
import Image from 'next/image';

export default function FaceRegistration() {
  const { user } = useUser();
  const firestore = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const hasRegisteredFace = !!userData?.faceTemplate;
  const avatarUrl = userData?.faceTemplate || `https://i.pravatar.cc/150?u=${user?.uid}`;

  useEffect(() => {
    let stream: MediaStream;

    const getCameraPermission = async () => {
      if (isEditing) {
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

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const cleanupStream = videoRef.current.srcObject as MediaStream;
        cleanupStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isEditing]);

  const updateFace = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;
    if (!hasCameraPermission) {
      toast({
        variant: 'destructive',
        title: 'Camera Access Required',
        description: 'Please enable camera permissions in your browser settings to update your picture.',
      });
      return;
    }

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
        title: 'Profile Picture Updated!',
        description: 'Your new picture has been saved.',
      });
      setIsEditing(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: result.error || 'Could not update your picture. Please try again.',
      });
    }

    setIsProcessing(false);
  };

  if (isUserDocLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className='flex items-center justify-center h-24'>
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Update Your Profile Picture</CardTitle>
          <CardDescription>
            Capture a clear photo of your face.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {hasCameraPermission === false && (
            <Alert variant="destructive" className="w-full">
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                Please enable camera permissions in your browser settings to update your picture.
              </AlertDescription>
            </Alert>
          )}
          <div className="w-full max-w-md aspect-video bg-muted rounded-md overflow-hidden relative">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {hasCameraPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2">
          <Button onClick={updateFace} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Saving...' : 'Save New Picture'}
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isProcessing}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center justify-between'>
          <span>Profile Picture</span>
           <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <RefreshCw className='mr-2 h-4 w-4' />
                Change Picture
            </Button>
        </CardTitle>
        <CardDescription>
          This picture is used for facial recognition during attendance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {hasRegisteredFace ? (
             <div className="w-40 h-40 rounded-full overflow-hidden relative">
                <Image src={avatarUrl} alt="Current profile picture" layout='fill' objectFit='cover' data-ai-hint="person portrait" />
             </div>
        ) : (
            <div className="text-center p-4 border-dashed border-2 rounded-md">
                <p className="text-muted-foreground">No profile picture has been set yet.</p>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
