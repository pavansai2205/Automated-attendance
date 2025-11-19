'use server';

import { summarizeAttendanceTrends } from '@/ai/flows/summarize-attendance-trends';
import { generateAbsenceJustification, type AbsenceJustificationInput } from '@/ai/flows/generate-absence-justification';
import { recognizeStudentFace } from '@/ai/flows/recognize-face';
import { registerFace } from '@/ai/flows/register-face';
import { verifyStudentFace } from '@/ai/flows/verify-student-face';
import { detectFaceAndMarkAttendance } from '@/ai/flows/detect-face';
import { initializeFirebase } from '@/firebase/server-init';
import { addDoc, collection, serverTimestamp, doc, updateDoc, getDocs, query, where, getDoc, Timestamp } from 'firebase/firestore';

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

export async function handleSummarizeTrends(courseName: string, attendanceRecords: string) {
  try {
    const result = await summarizeAttendanceTrends({
      courseName: courseName,
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

export async function handleUpdateFaceTemplate(photoDataUri: string, userId: string) {
    try {
        // Optional: you might want to re-run a quality check here
        const { faceRegistered } = await registerFace({ photoDataUri });
        if (!faceRegistered) {
            return { success: false, error: 'No clear face detected in the new photo. Please try again.' };
        }

        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, {
            faceTemplate: photoDataUri
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating face template:', error);
        return { success: false, error: 'Failed to update profile picture.' };
    }
}


export async function handleCreateClassSession(courseId: string, startTime: Date, endTime: Date) {
    try {
        if (!courseId || !startTime || !endTime) {
            return { success: false, error: 'Missing required fields.' };
        }

        if (startTime >= endTime) {
            return { success: false, error: 'Start time must be before end time.' };
        }
        
        // The path to the nested collection
        const classSessionsRef = collection(firestore, 'courses', courseId, 'classSessions');
        
        const newSession = {
            courseId, // Denormalizing for security rule convenience
            startTime: Timestamp.fromDate(startTime),
            endTime: Timestamp.fromDate(endTime),
        };

        await addDoc(classSessionsRef, newSession);

        return { success: true };
    } catch (error) {
        console.error('Error creating class session:', error);
        return { success: false, error: 'Failed to create class session.' };
    }
}

export async function handleGenerateReport(courseId: string, startDate: Date, endDate: Date) {
    try {
        // 1. Fetch all students
        const studentsQuery = query(collection(firestore, 'users'), where('roleId', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // 2. Fetch all class sessions for the course within the date range
        const classSessionsQuery = query(
            collection(firestore, 'courses', courseId, 'classSessions'),
            where('startTime', '>=', startDate),
            where('startTime', '<=', endDate)
        );
        const classSessionsSnapshot = await getDocs(classSessionsQuery);
        const classSessions = classSessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as { startTime: Timestamp } }));

        if (classSessions.length === 0) {
            return { success: true, report: [] }; // No sessions, so empty report
        }

        // 3. Fetch all attendance records for those sessions
        const sessionIds = classSessions.map(s => s.id);
        // Firestore 'in' queries are limited to 30 items. If more sessions, this would need batching.
        const attendanceQuery = query(collection(firestore, 'attendanceRecords'), where('classSessionId', 'in', sessionIds));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 4. Compile the report
        const reportData: any[] = [];
        for (const student of students) {
            for (const session of classSessions) {
                const record = attendanceRecords.find(r => r.studentId === student.id && r.classSessionId === session.id);
                reportData.push({
                    studentId: student.id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    date: session.startTime.toDate().toLocaleDateString(),
                    status: record ? record.status : 'Absent',
                });
            }
        }

        return { success: true, report: reportData };

    } catch (error) {
        console.error('Error generating report:', error);
        return { success: false, error: 'Failed to generate report.' };
    }
}
