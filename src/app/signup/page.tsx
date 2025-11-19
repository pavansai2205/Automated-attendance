'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { User, Briefcase } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="absolute inset-0 -z-20 h-full w-full bg-gradient-to-r from-primary/80 via-accent/80 to-secondary/80 animate-animated-gradient bg-[length:300%_300%]"></div>
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Choose your role to get started.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Button variant="outline" size="lg" asChild className="h-24 flex-col gap-2">
            <Link href="/signup/student">
              <User className="h-8 w-8" />
              <span>I am a Student</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="h-24 flex-col gap-2">
            <Link href="/signup/instructor">
              <Briefcase className="h-8 w-8" />
              <span>I am an Instructor</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
       <div className="absolute bottom-4 text-center text-sm text-white">
        Already have an account?{' '}
        <Link href="/login" className="font-medium underline">
            Login
        </Link>
      </div>
    </div>
  );
}
