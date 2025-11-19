'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, RefreshCw, Upload, Trash2, User } from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { handleUpdateFaceTemplate, handleRemoveFaceTemplate } from '@/app/actions';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function FaceRegistration() {
  const { user } = useUser();
  const firestore = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'display' | 'capture'>('display');
  const { toast } = useToast();

  const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const hasRegisteredFace = !!userData?.faceTemplate;
  const avatarUrl = userData?.faceTemplate || `https://i.pravatar.cc/150?u=${user?.uid}`;

  useEffect(() => {
    let stream: MediaStream;

    const getCameraPermission = async () => {
      if (view === 'capture') {
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
  }, [view]);

  const processAndSave = async (photoDataUri: string) => {
    if (!user) return;
    setIsProcessing(true);

    const result = await handleUpdateFaceTemplate(photoDataUri, user.uid);

    if (result.success) {
      toast({
        title: 'Profile Picture Updated!',
        description: 'Your new picture has been saved.',
      });
      setView('display');
    } else {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: result.error || 'Could not save your picture. Please try again.',
      });
    }
    setIsProcessing(false);
  };
  
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    }
    
    const photoDataUri = canvas.toDataURL('image/jpeg');
    await processAndSave(photoDataUri);
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
            await processAndSave(photoDataUri);
        }
    };
    reader.readAsDataURL(file);
    
    if(event.target) {
        event.target.value = '';
    }
  };
  
  const onRemove = async () => {
      if(!user) return;
      setIsProcessing(true);
      const result = await handleRemoveFaceTemplate(user.uid);
       if (result.success) {
          toast({
            title: 'Profile Picture Removed',
            description: 'Your picture has been removed.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to Remove',
            description: result.error || 'Could not remove your picture.',
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
         <CardContent className='flex items-center justify-center h-48'>
           <Loader2 className="h-8 w-8 animate-spin" />
         </CardContent>
       </Card>
     )
  }

  if (view === 'capture') {
    return (
       <Card>
        <CardHeader>
            <CardTitle>Update Picture</CardTitle>
            <CardDescription>Position your face in the frame.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
            {hasCameraPermission === false && (
            <Alert variant="destructive" className="w-full">
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                Enable camera permissions in your browser settings.
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
            <Button onClick={handleCapture} disabled={isProcessing || !hasCameraPermission} className="w-full">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Saving...' : 'Save New Picture'}
            </Button>
            <Button variant="ghost" className='w-full' onClick={() => setView('display')} disabled={isProcessing}>
                Cancel
            </Button>
        </CardFooter>
    </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
         <CardDescription>
            {hasRegisteredFace ? "Update your profile picture." : "You have no profile picture."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-48 h-48 rounded-full overflow-hidden relative border-4 border-muted">
            {hasRegisteredFace ? (
                <Image src={avatarUrl} alt="Your profile picture" layout="fill" objectFit="cover" data-ai-hint="person portrait" />
            ) : (
                <div className='w-full h-full bg-secondary flex items-center justify-center'>
                    <User className='w-1/2 h-1/2 text-muted-foreground' />
                </div>
            )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            disabled={isProcessing}
        />
        <div className='w-full grid grid-cols-2 gap-2'>
            <Button onClick={() => setView('capture')} disabled={isProcessing}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {hasRegisteredFace ? "Change" : "Add Picture"}
            </Button>
             <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload
            </Button>
        </div>
         {hasRegisteredFace && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className='w-full' disabled={isProcessing}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Picture
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove your profile picture. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
