import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-attendance-trends.ts';
import '@/ai/flows/generate-absence-justification.ts';