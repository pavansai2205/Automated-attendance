// This file is now deprecated for realtime data but kept for structure reference and types.
// Realtime data is now fetched directly from Firestore in the components.
import type { Course, Student } from './types';
import placeholderImages from './placeholder-images.json';

const studentImagePlaceholders = placeholderImages.placeholderImages;

const students: Student[] = []; // This is no longer the source of truth

export const course: Course = {
  id: 'CS101',
  name: 'Introduction to Computer Science',
  students: students,
};

// This function is no longer used for the main student list.
export const getStudentById = (id: string): Student | undefined => {
  return students.find(student => student.id === id);
}

// This function is no longer used for the main chart, as it uses mock data.
export const getAttendanceDataForChart = () => {
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  return last7Days.map(date => {
    const present = Math.floor(Math.random() * (10 - 2)) + 2; // Random mock data
    const absent = 10 - present;
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Present: present,
      Absent: absent,
    };
  });
};

    