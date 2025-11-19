'use server';

import { summarizeAttendanceTrends } from '@/ai/flows/summarize-attendance-trends';
import { generateAbsenceJustification, type AbsenceJustificationInput } from '@/ai/flows/generate-absence-justification';
import { recognizeStudentFace } from '@/ai/flows/recognize-face';
import { registerFace } from '@/ai/flows/register-face';
import { verifyStudentFace } from '@/ai/flows/verify-student-face';
import { detectFaceAndMarkAttendance } from '@/ai/flows/detect-face';
import { course } from '@/lib/data';
import { initializeFirebase } from '@/firebase/server-init';
import { addDoc, collection, serverTimestamp, doc, updateDoc, getDocs, query, where, getDoc } from 'firebase/firestore';

const { firestore } = initializeFirebase();

export async function handleDetectFace(photoDataUri: string) {
    try {
        const result = await detectFaceAndMarkAttendance({ photoDataUri });
        return { success: true, ...result };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to detect face.' };
    }
}

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

export async function handleVerifyAndMarkAttendance(photoDataUri: string, studentId: string) {
  try {
    // 1. Get student's registered face template
    const userDocRef = doc(firestore, 'users', studentId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().faceTemplate) {
        return { success: false, error: 'You have not registered your face yet. Please go to Settings to register.' };
    }
    const registeredFaceTemplate = userDoc.data().faceTemplate;

    // 2. Verify face
    const { isMatch } = await verifyStudentFace({
        photoDataUri,
        registeredFaceTemplate
    });

    if (!isMatch) {
      return { success: false, error: 'Face does not match registered profile. Please report to your instructor.' };
    }

    // 3. Mark attendance
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
    // 1. Fetch all user documents that have a face template
    const usersQuery = query(collection(firestore, 'users'), where('faceTemplate', '!=', null));
    const usersSnapshot = await getDocs(usersQuery);
    const studentDirectory = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            name: `${data.firstName} ${data.lastName}`,
            faceTemplate: data.faceTemplate 
        };
    });

    if (studentDirectory.length === 0) {
        return { success: false, error: 'No students have registered their face yet.' };
    }

    // 2. Send to recognition flow
    const { recognizedStudentId } = await recognizeStudentFace({ 
        photoDataUri, 
        studentDirectory: JSON.stringify(studentDirectory) 
    });

    if (!recognizedStudentId) {
      return { success: false, error: 'No student recognized in the photo.' };
    }
    
    const student = studentDirectory.find(s => s.id === recognizedStudentId);
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

export async function handleRegisterFace(photoDataUri: string, userId: string) {
    try {
        const { faceRegistered } = await registerFace({ photoDataUri });
        if (!faceRegistered) {
            return { success: false, error: 'No face detected in the photo. Please try again.' };
        }

        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, {
            faceTemplate: photoDataUri
        });

        return { success: true };
    } catch (error) {
        console.error('Error registering face:', error);
        return { success: false, error: 'Failed to register face.' };
    }
}
