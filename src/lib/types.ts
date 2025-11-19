import { Timestamp } from 'firebase/firestore';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late';

export interface Student {
  id: string;
  firstName: string;
  lastName:string;
  email: string;
  roleId: string;
  faceTemplate?: string;
  // These are derived client-side now
  name: string; 
  avatar: string;
  attendanceStatus: AttendanceStatus;
  attendanceHistory: AttendanceRecord[];
}

export interface Course {
  id: string;
  name: string;
  description: string;
  instructorId: string;
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    classSessionId: string;
    timestamp: Timestamp;
    status: string;
}

export interface ReportData {
    studentId: string;
    studentName: string;
    date: string;
    status: AttendanceStatus;
}
