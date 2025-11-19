'use server';

import { summarizeAttendanceTrends } from '@/ai/flows/summarize-attendance-trends';
import { generateAbsenceJustification, type AbsenceJustificationInput } from '@/ai/flows/generate-absence-justification';
import { detectFaceAndMarkAttendance } from '@/ai/flows/detect-face';
import { recognizeStudentFace } from '@/ai/flows/recognize-face';
import { course } from '@/lib/data';
import { initializeFirebase } from '@/firebase/server-init';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const { firestore } = initializeFirebase();

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

export async function handleRecognizeAndMarkAttendance(photoDataUri: string) {
  try {
    const studentDirectory = JSON.stringify(course.students.map(s => ({ id: s.id, name: s.name })));
    const { recognizedStudentId } = await recognizeStudentFace({ photoDataUri, studentDirectory });

    if (!recognizedStudentId) {
      return { success: false, error: 'No student recognized in the photo.' };
    }
    
    const student = course.students.find(s => s.id === recognizedStudentId);
    if (!student) {
        return { success: false, error: 'Recognized student not found in directory.' };
    }

    const classSessionId = "CS101-SESSION-01";

    const attendanceRecord = {
      studentId: recognizedStudentId,
      classSessionId,
      timestamp: serverTimestamp(),
      status: 'Present',
    };

    const attendanceRef = collection(firestore, 'attendanceRecords');
    await addDoc(attendanceRef, attendanceRecord);

    return { success: true, studentName: student.name };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to recognize student or mark attendance.' };
  }
}
