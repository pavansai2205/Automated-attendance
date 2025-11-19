'use server';
/**
 * @fileOverview Flow to register a user's face.
 *
 * - registerFace - A function that checks for a face and confirms registration readiness.
 * - RegisterFaceInput - The input type for the registerFace function.
 * - RegisterFaceOutput - The return type for the registerFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RegisterFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo snapshot from the webcam, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RegisterFaceInput = z.infer<typeof RegisterFaceInputSchema>;

const RegisterFaceOutputSchema = z.object({
  faceRegistered: z.boolean().describe('Whether or not a face was detected and is suitable for registration.'),
});
export type RegisterFaceOutput = z.infer<typeof RegisterFaceOutputSchema>;

export async function registerFace(input: RegisterFaceInput): Promise<RegisterFaceOutput> {
  return registerFaceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'registerFacePrompt',
  input: {schema: RegisterFaceInputSchema},
  output: {schema: RegisterFaceOutputSchema},
  prompt: `You are an AI assistant for a secure attendance system. Your task is to determine if the provided image contains a clear, single human face suitable for creating a face template for future recognition.

  Analyze the image provided. Set the 'faceRegistered' boolean field to true only if a single, clear, forward-facing human face is visible. If the image is blurry, contains multiple faces, no face, or is otherwise unsuitable, set it to false.
  
  Image: {{media url=photoDataUri}}`,
});

const registerFaceFlow = ai.defineFlow(
  {
    name: 'registerFaceFlow',
    inputSchema: RegisterFaceInputSchema,
    outputSchema: RegisterFaceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
