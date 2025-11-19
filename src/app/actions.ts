'use server';

import { summarizeAttendanceTrends } from '@/ai/flows/summarize-attendance-trends';
import { generateAbsenceJustification, type AbsenceJustificationInput } from '@/ai/flows/generate-absence-justification';
import { course } from '@/lib/data';

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
