
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-init';
import { DecodedIdToken } from 'firebase-admin/auth';

const { auth } = initializeFirebase();

// This is a simplified authorization check. In a production app,
// you would want to ensure that only authorized users (e.g., admins) can call this endpoint.
async function isAuthorized(request: NextRequest): Promise<DecodedIdToken | null> {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
        // More sophisticated check for Authorization header could be added here
        return null;
    }
    try {
        const decodedIdToken = await auth.verifySessionCookie(sessionCookie, true);
        return decodedIdToken;
    } catch (error) {
        console.error('Error verifying session cookie:', error);
        return null;
    }
}


export async function POST(request: NextRequest) {
    try {
        const adminUser = await isAuthorized(request);
        // For now, we will allow any authenticated user to set their own role for demonstration purposes.
        // In a real application, you would check if adminUser.role === 'admin'
        if (!adminUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { uid, role } = await request.json();

        if (!uid || !role) {
            return NextResponse.json({ success: false, error: 'uid and role are required' }, { status: 400 });
        }

        // In a real app, you might only allow setting roles like 'student' or 'instructor'
        const allowedRoles = ['student', 'instructor', 'admin'];
        if (!allowedRoles.includes(role)) {
             return NextResponse.json({ success: false, error: 'Invalid role specified' }, { status: 400 });
        }

        await auth.setCustomUserClaims(uid, { role });

        return NextResponse.json({ success: true, message: `Custom claim set for user ${uid}` });

    } catch (error: any) {
        console.error('Error setting custom claim:', error);
        return NextResponse.json({ success: false, error: error.message || 'An unknown error occurred' }, { status: 500 });
    }
}
