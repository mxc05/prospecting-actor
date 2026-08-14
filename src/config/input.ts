import { z } from 'zod';
import { ActorInput } from '../types/index.js';

const inputSchema = z.object({
  platform: z.literal('instagram').default('instagram'),
  profile_type: z.string().min(1, 'profile_type is required'),
  location: z.string().optional(),
  min_followers: z.number().nonnegative().optional().default(1000),
  max_followers: z.number().nonnegative().optional().default(50000),
  keywords: z.array(z.string()).optional().default([]),
  max_results: z.number().positive().optional().default(50),
  profile_urls: z.array(z.string()).optional().default([]),
  llm_provider: z.enum(['gemini', 'openai', 'openrouter', 'none']).optional().default('gemini'),
  gemini_api_key: z.string().optional(),
  openai_api_key: z.string().optional(),
});

export function validateInput(rawInput: unknown): ActorInput {
  const parsed = inputSchema.parse(rawInput || {});
  return parsed as ActorInput;
}
