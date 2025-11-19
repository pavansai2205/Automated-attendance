'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, User as UserIcon, Phone, Home, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import FaceRegistration from './face-registration';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isLoading = isUserLoading || isUserDataLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!userData) {
    return <p>Could not load profile information.</p>
  }

  const avatarUrl = userData.faceTemplate || `https://i.pravatar.cc/150?u=${user?.uid}`;
  const displayName = `${userData.firstName} ${userData.lastName}`;

  return (
    <div className='grid md:grid-cols-3 gap-6'>
      <div className='md:col-span-2 space-y-6'>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage asChild src={avatarUrl}>
                <Image src={avatarUrl} alt={displayName} width={80} height={80} data-ai-hint="person portrait"/>
              </AvatarImage>
              <AvatarFallback className="text-3xl">{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl">{displayName}</CardTitle>
              <CardDescription>
                {userData.email} {userData.roleId && <span className="capitalize ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">{userData.roleId}</span>}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="border-t border-border pt-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2"><UserIcon /> Personal Information</h3>
              <div className='flex items-center gap-3 pl-8'>
                  <Phone className='text-muted-foreground' />
                  <span>{userData.phoneNumber || 'Not provided'}</span>
              </div>
              <div className='flex items-start gap-3 pl-8'>
                  <Home className='text-muted-foreground mt-1' />
                  <span className='flex-1'>{userData.address || 'Not provided'}</span>
              </div>
            </div>
            
            {userData.roleId === 'student' && (
               <div className="border-t border-border pt-4 space-y-4">
                 <h3 className='font-medium flex items-center gap-2'><Shield /> Guardian Information</h3>
                 <div className='flex items-center gap-3 pl-8'>
                     <UserIcon className='text-muted-foreground' />
                     <span>{userData.parentName || 'Not provided'}</span>
                 </div>
                  <div className='flex items-center gap-3 pl-8'>
                     <Phone className='text-muted-foreground' />
                     <span>{userData.parentPhoneNumber || 'Not provided'}</span>
                 </div>
               </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div>
        <FaceRegistration />
      </div>
    </div>
  );
}
