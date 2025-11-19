import type { Course, Student } from './types';
import placeholderImages from './placeholder-images.json';

const studentImagePlaceholders = placeholderImages.placeholderImages;

const students: Student[] = [
  {
    id: 'STU-001',
    name: 'Alex Johnson',
    avatar: studentImagePlaceholders.find(p => p.id === 'student1')?.imageUrl || '',
    attendanceStatus: 'Present',
    attendanceHistory: [
      { date: '2024-07-21', status: 'Present' },
      { date: '2024-07-20', status: 'Present' },
      { date: '2024-07-19', status: 'Absent' },
      { date: '2024-07-18', status: 'Present' },
      { date: '2024-07-17', status: 'Present' },
    ],
  },
  {
    id: 'STU-002',
    name: 'Maria Garcia',
    avatar: studentImagePlaceholders.find(p => p.id === 'student2')?.imageUrl || '',
    attendanceStatus: 'Present',
    attendanceHistory: [
      { date: '2024-07-21', status: 'Present' },
      { date: '2024-07-20', status: 'Present' },
      { date: '2024-07-19', status: 'Present' },
      { date: '2024-07-18', status: 'Present' },
      { date: '2024-07-17', status: 'Present' },
    ],
  },
  {
    id: 'STU-003',
    name: 'James Smith',
    avatar: studentImagePlaceholders.find(p => p.id === 'student3')?.imageUrl || '',
    attendanceStatus: 'Absent',
    attendanceHistory: [
      { date: '2024-07-21', status: 'Absent' },
      { date: '2024-07-20', status: 'Present' },
      { date: '2024-07-19', status: 'Absent' },
      { date: '2024-07-18', status: 'Absent' },
      { date: '2024-07-17', status: 'Present' },
    ],
  },
  {
    id: 'STU-004',
    name: 'Emily Williams',
    avatar: studentImagePlaceholders.find(p => p.id === 'student4')?.imageUrl || '',
    attendanceStatus: 'Present',
    attendanceHistory: [
      { date: '2024-07-21', status: 'Present' },
      { date: '2024-07-20', status: 'Present' },
      { date: '2024-07-19', status: 'Present' },
      { date: '2024-07-18', status: 'Present' },
      { date: '2024-07-17', status: 'Present' },
    ],
  },
  {
    id: 'STU-005',
    name: 'David Brown',
    avatar: studentImagePlaceholders.find(p => p.id === 'student5')?.imageUrl || '',
    attendanceStatus: 'Late',
    attendanceHistory: [
      { date: '2024-07-21', status: 'Late' },
      { date: '2024-07-20', status: 'Present' },
      { date: '2024-07-19', status: 'Present' },
      { date: '2024-07-18', status: 'Present' },
      { date: '2024-07-17', status: 'Late' },
    ],
  },
  {
    id: 'STU-006',
    name: 'Sophia Jones',
    avatar: studentImagePlaceholders.find(p => p.id === 'student6')?.imageUrl || '',
    attendanceStatus: 'Present',
    attendanceHistory: [
        { date: '2024-07-21', status: 'Present' },
        { date: '2024-07-20', status: 'Present' },
        { date: '2024-07-19', status: 'Present' },
        { date: '2024-07-18', status: 'Present' },
        { date: '2024-07-17', status: 'Present' },
    ],
  },
   {
    id: 'STU-007',
    name: 'Michael Miller',
    avatar: studentImagePlaceholders.find(p => p.id === 'student7')?.imageUrl || '',
    attendanceStatus: 'Absent',
    attendanceHistory: [
        { date: '2024-07-21', status: 'Absent' },
        { date: '2024-07-20', status: 'Absent' },
        { date: '2024-07-19', status: 'Present' },
        { date: '2024-07-18', status: 'Present' },
        { date: '2024-07-17', status: 'Present' },
    ],
  },
];

export const course: Course = {
  id: 'CS101',
  name: 'Introduction to Computer Science',
  students: students,
};

export const getStudentById = (id: string): Student | undefined => {
  return students.find(student => student.id === id);
}

export const getAttendanceDataForChart = () => {
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  return last7Days.map(date => {
    const dateString = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const present = Math.floor(Math.random() * (students.length - 2)) + 2; // Randomly generate present students
    const absent = students.length - present;
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Present: present,
      Absent: absent,
    };
  });
};
