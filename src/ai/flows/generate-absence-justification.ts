'use server';
/**
 * @fileOverview Flow to generate a draft email explaining a student's absence to their professor.
 *
 * - generateAbsenceJustification - A function that generates the absence justification email.
 * - AbsenceJustificationInput - The input type for the generateAbsenceJustification function.
 * - AbsenceJustificationOutput - The return type for the generateAbsenceJustification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AbsenceJustificationInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  professorName: z.string().describe('The name of the professor.'),
  courseName: z.string().describe('The name of the course.'),
  absenceReason: z.string().describe('A brief description of the reason for the absence.'),
  additionalDetails: z.string().optional().describe('Any additional details to include in the email.'),
});
export type AbsenceJustificationInput = z.infer<typeof AbsenceJustificationInputSchema>;

const AbsenceJustificationOutputSchema = z.object({
  emailDraft: z.string().describe('A draft email to the professor explaining the absence.'),
});
export type AbsenceJustificationOutput = z.infer<typeof AbsenceJustificationOutputSchema>;

export async function generateAbsenceJustification(input: AbsenceJustificationInput): Promise<AbsenceJustificationOutput> {
  return generateAbsenceJustificationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'absenceJustificationPrompt',
  input: {schema: AbsenceJustificationInputSchema},
  output: {schema: AbsenceJustificationOutputSchema},
  prompt: `You are an AI assistant helping a student draft an email to their professor explaining their absence from class.

  Compose an email that includes:
  - A polite greeting to the professor ({{{professorName}}}).
  - A clear statement of absence from the course ({{{courseName}}}).
  - A concise explanation of the reason for the absence: {{{absenceReason}}}.
  - Any additional details provided by the student: {{{additionalDetails}}}.
  - A polite closing, expressing gratitude and offering to provide further information if needed.
  - The student's name ({{{studentName}}}).

  Ensure the email is professional, respectful, and clearly communicates the necessary information.
`,
});

const generateAbsenceJustificationFlow = ai.defineFlow(
  {
    name: 'generateAbsenceJustificationFlow',
    inputSchema: AbsenceJustificationInputSchema,
    outputSchema: AbsenceJustificationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
