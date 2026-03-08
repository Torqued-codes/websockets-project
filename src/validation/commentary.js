import { z } from 'zod';

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.number().nonnegative().int(),
  sequence: z.number().nonnegative().int(),
  eventType: z.string().optional(),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.string(),z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

