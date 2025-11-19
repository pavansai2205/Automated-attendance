'use server';
/**
 * @fileOverview Flow to verify a student's face against their registered template.
 *
 * - verifyStudentFace - A function that verifies a student's face.
 * - VerifyFaceInput - The input type for the verifyStudentFace function.
 * - VerifyFaceOutput - The return type for the verifyStudentFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo snapshot from the webcam, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   registeredFaceTemplate: z.string().describe("The student's registered face template image as a data URI.")
});
export type VerifyFaceInput = z.infer<typeof VerifyFaceInputSchema>;

const VerifyFaceOutputSchema = z.object({
  isMatch: z.boolean().describe('Whether the face in the photo matches the registered face template.'),
});
export type VerifyFaceOutput = z.infer<typeof VerifyFaceOutputSchema>;

export async function verifyStudentFace(input: VerifyFaceInput): Promise<VerifyFaceOutput> {
  return verifyFaceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyFacePrompt',
  input: {schema: VerifyFaceInputSchema},
  output: {schema: VerifyFaceOutputSchema},
  prompt: `You are an AI assistant for a secure attendance system. Your task is to verify if a student's photo matches their registered face template.
  
  You will be given a live photo to analyze and a registered face template for comparison.
  
  Analyze the person in the live photo and determine if they are the same person as in the registered face template.
  
  If a definitive match is found, return true in the 'isMatch' field. If no match is found, or if you are not confident in the match, return false.
  
  Registered Face Template: {{media url=registeredFaceTemplate}}
  
  Image to analyze: {{media url=photoDataUri}}`,
});

const verifyFaceFlow = ai.defineFlow(
  {
    name: 'verifyFaceFlow',
    inputSchema: VerifyFaceInputSchema,
    outputSchema: VerifyFaceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
