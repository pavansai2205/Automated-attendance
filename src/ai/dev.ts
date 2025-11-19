import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-attendance-trends.ts';
import '@/ai/flows/generate-absence-justification.ts';
import '@/ai/flows/detect-face.ts';
import '@/ai/flows/recognize-face.ts';
import '@/ai/flows/register-face.ts';
import '@/ai/flows/verify-student-face.ts';
