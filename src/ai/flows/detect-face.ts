'use server';
/**
 * @fileOverview Flow to detect a face in an image for attendance marking.
 *
 * - detectFaceAndMarkAttendance - A function that detects a face in an image.
 * - DetectFaceInput - The input type for the detectFaceAndMarkAttendance function.
 * - DetectFaceOutput - The return type for the detectFaceAndMarkAttendance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo snapshot from the webcam, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectFaceInput = z.infer<typeof DetectFaceInputSchema>;

const DetectFaceOutputSchema = z.object({
  faceDetected: z.boolean().describe('Whether or not a face was detected in the photo.'),
});
export type DetectFaceOutput = z.infer<typeof DetectFaceOutputSchema>;

export async function detectFaceAndMarkAttendance(input: DetectFaceInput): Promise<DetectFaceOutput> {
  return detectFaceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectFacePrompt',
  input: {schema: DetectFaceInputSchema},
  output: {schema: DetectFaceOutputSchema},
  prompt: `You are an AI assistant for an attendance system. Your task is to determine if the provided image contains a human face.

  Analyze the image provided and set the 'faceDetected' boolean field to true if a face is clearly visible, and false otherwise.
  
  Image: {{media url=photoDataUri}}`,
});

const detectFaceFlow = ai.defineFlow(
  {
    name: 'detectFaceFlow',
    inputSchema: DetectFaceInputSchema,
    outputSchema: DetectFaceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
