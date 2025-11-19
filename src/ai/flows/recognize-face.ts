'use server';
/**
 * @fileOverview Flow to recognize a face in an image for attendance marking by an instructor.
 *
 * - recognizeStudentFace - A function that recognizes a student's face in an image.
 * - RecognizeFaceInput - The input type for the recognizeStudentFace function.
 * - RecognizeFaceOutput - The return type for the recognizeStudentFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecognizeFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo snapshot from the webcam, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   studentDirectory: z.string().describe('A JSON string of student data including their name and ID.')
});
export type RecognizeFaceInput = z.infer<typeof RecognizeFaceInputSchema>;

const RecognizeFaceOutputSchema = z.object({
  recognizedStudentId: z.string().optional().describe('The ID of the recognized student, if any.'),
});
export type RecognizeFaceOutput = z.infer<typeof RecognizeFaceOutputSchema>;

export async function recognizeStudentFace(input: RecognizeFaceInput): Promise<RecognizeFaceOutput> {
  return recognizeFaceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recognizeFacePrompt',
  input: {schema: RecognizeFaceInputSchema},
  output: {schema: RecognizeFaceOutputSchema},
  prompt: `You are an AI assistant for an attendance system. Your task is to recognize a student from a photo.
  You will be given a photo and a directory of students.
  Analyze the image and determine if the person in the photo matches one of the students in the directory.
  If a match is found, return the student's ID in the 'recognizedStudentId' field. If no match is found, leave it empty.
  
  Student Directory: {{{studentDirectory}}}
  
  Image to analyze: {{media url=photoDataUri}}`,
});

const recognizeFaceFlow = ai.defineFlow(
  {
    name: 'recognizeFaceFlow',
    inputSchema: RecognizeFaceInputSchema,
    outputSchema: RecognizeFaceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
