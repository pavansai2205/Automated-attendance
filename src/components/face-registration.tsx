'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, RefreshCw, Upload, Trash2 } from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { handleUpdateFaceTemplate, handleRemoveFaceTemplate } from '@/app/actions';
import Image from 'next/image';

export default function FaceRegistration() {
  const { user } = useUser();
  const firestore = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const processAndUpdate = async (photoDataUri: string) => {
    if (!user) return;
    setIsProcessing(true);

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
  }

  const captureFromWebcam = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!hasCameraPermission) {
      toast({
        variant: 'destructive',
        title: 'Camera Access Required',
        description: 'Please enable camera permissions to update your picture.',
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
    await processAndUpdate(photoDataUri);
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
            await processAndUpdate(photoDataUri);
        }
    };
    reader.readAsDataURL(file);
    
    // Reset file input value to allow re-uploading the same file
    if(event.target) {
        event.target.value = '';
    }
  };

  const onRemovePicture = async () => {
      if (!user) return;
      setIsProcessing(true);
      const result = await handleRemoveFaceTemplate(user.uid);
      if (result.success) {
          toast({
              title: 'Profile Picture Removed',
              description: 'Your profile picture has been removed.',
          });
      } else {
          toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Failed to remove profile picture.',
          });
      }
      setIsProcessing(false);
  }


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
            Use your webcam or upload a clear photo of your face.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {hasCameraPermission === false && (
            <Alert variant="destructive" className="w-full">
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                Enable camera permissions to use your webcam. You can still upload a file.
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
        <CardFooter className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                <Upload className="mr-2 h-4 w-4" />
                Upload from Device
            </Button>
            <Button onClick={captureFromWebcam} disabled={isProcessing || !hasCameraPermission}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                {isProcessing ? 'Saving...' : 'Use Webcam'}
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
           <div className='flex gap-2'>
            {hasRegisteredFace && (
                <Button variant="destructive" size="sm" onClick={onRemovePicture} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className='mr-2 h-4 w-4' />}
                    Remove
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <RefreshCw className='mr-2 h-4 w-4' />
                {hasRegisteredFace ? 'Change' : 'Add'} Picture
            </Button>
           </div>
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
