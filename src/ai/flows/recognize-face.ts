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
   studentDirectory: z.string().describe('A JSON string of student data including their name, ID, and face template image as a data URI.')
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
  prompt: `You are an AI assistant for an attendance system. Your task is to recognize a student from a photo by comparing it against a directory of registered students.
  
  You will be given a photo to analyze and a JSON string representing the student directory. Each student in the directory has an 'id', 'name', and a 'faceTemplate' which is a data URI of their registered face.
  
  Analyze the person in the photo and determine if they match one of the students in the directory by comparing the photo to their face template.
  
  If a definitive match is found, return the student's ID in the 'recognizedStudentId' field. If no match is found, or if you are not confident in the match, leave the field empty.
  
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
