'use server';
/**
 * @fileOverview Summarizes attendance trends for a course, highlighting significant patterns or anomalies.
 *
 * - summarizeAttendanceTrends - A function that generates a summarized report of attendance trends for a given course.
 * - SummarizeAttendanceTrendsInput - The input type for the summarizeAttendanceTrends function.
 * - SummarizeAttendanceTrendsOutput - The return type for the summarizeAttendanceTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAttendanceTrendsInputSchema = z.object({
  courseName: z.string().describe('The name of the course to analyze.'),
  attendanceRecords: z.string().describe('Attendance records for the course, in JSON format.'),
});
export type SummarizeAttendanceTrendsInput = z.infer<typeof SummarizeAttendanceTrendsInputSchema>;

const SummarizeAttendanceTrendsOutputSchema = z.object({
  summary: z.string().describe('A summarized report of attendance trends for the course.'),
});
export type SummarizeAttendanceTrendsOutput = z.infer<typeof SummarizeAttendanceTrendsOutputSchema>;

export async function summarizeAttendanceTrends(input: SummarizeAttendanceTrendsInput): Promise<SummarizeAttendanceTrendsOutput> {
  return summarizeAttendanceTrendsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAttendanceTrendsPrompt',
  input: {schema: SummarizeAttendanceTrendsInputSchema},
  output: {schema: SummarizeAttendanceTrendsOutputSchema},
  prompt: `You are an AI assistant that helps faculty members understand student attendance trends.

  Summarize the attendance trends for the course: {{{courseName}}}.
  Here are the attendance records in JSON format: {{{attendanceRecords}}}

  Highlight any significant patterns or anomalies in the attendance data.
  Provide insights that can help the faculty member identify potential issues and address them.
  The summary should be concise and easy to understand.
`,
});

const summarizeAttendanceTrendsFlow = ai.defineFlow(
  {
    name: 'summarizeAttendanceTrendsFlow',
    inputSchema: SummarizeAttendanceTrendsInputSchema,
    outputSchema: SummarizeAttendanceTrendsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
