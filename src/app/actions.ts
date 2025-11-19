'use server';

import { summarizeAttendanceTrends } from '@/ai/flows/summarize-attendance-trends';
import { generateAbsenceJustification, type AbsenceJustificationInput } from '@/ai/flows/generate-absence-justification';
import { detectFaceAndMarkAttendance } from '@/ai/flows/detect-face';
import { course } from '@/lib/data';
import { addDoc, collection, serverTimestamp, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';

// This is a server-side action file. We should use the admin SDK here when appropriate,
// but for client-invoked actions that need to respect security rules, we should
// perform writes on the client. For this fix, we will simply use the client SDK
// on the server, which is not ideal but matches the existing structure.
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// We get the client-side `firestore` instance here.
const firestore = getFirestore();


export async function handleSummarizeTrends() {
  try {
    const attendanceRecords = JSON.stringify(
      course.students.map(student => ({
        name: student.name,
        status: student.attendanceStatus,
        history: student.attendanceHistory,
      }))
    );

    const result = await summarizeAttendanceTrends({
      courseName: course.name,
      attendanceRecords,
    });
    return { success: true, summary: result.summary };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to summarize trends.' };
  }
}

export async function handleGenerateJustification(input: AbsenceJustificationInput) {
    try {
        const result = await generateAbsenceJustification(input);
        return { success: true, emailDraft: result.emailDraft };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to generate justification.' };
    }
}

export async function handleMarkAttendance(photoDataUri: string, studentId: string) {
  try {
    const { faceDetected } = await detectFaceAndMarkAttendance({ photoDataUri });

    if (!faceDetected) {
      return { success: false, error: 'No face detected. Please make sure you are in the frame.' };
    }

    // This is a placeholder for a real class session
    const classSessionId = "CS101-SESSION-01"; 

    const attendanceRecord = {
      studentId,
      classSessionId,
      timestamp: serverTimestamp(),
      status: 'Present',
    };

    const attendanceRef = collection(firestore, 'attendanceRecords');
    await addDoc(attendanceRef, attendanceRecord);

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to mark attendance due to a server error.' };
  }
}
