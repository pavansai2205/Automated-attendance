export type AttendanceStatus = 'Present' | 'Absent' | 'Late';

export interface Student {
  id: string;
  name: string;
  avatar: string;
  attendanceStatus: AttendanceStatus;
  attendanceHistory: { date: string; status: AttendanceStatus }[];
}

export interface Course {
  id: string;
  name: string;
  students: Student[];
}
