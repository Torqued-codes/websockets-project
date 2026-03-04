import { z } from 'zod';

// Constant for match status values
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// Schema for list matches query parameters
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().positive().max(100).optional(),
});

// Schema for match ID parameter
export const matchIdParamSchema = z.object({
  id: z.coerce.number().positive().int(),
});

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
   message: 'Invalid ISO date string',
});

// Schema for creating a match
export const createMatchSchema = z.object({
    sport: z.string().min(1, 'Sport is required and must be non-empty'),
    homeTeam: z.string().min(1, 'Home team is required and must be non-empty'),
    awayTeam: z.string().min(1, 'Away team is required and must be non-empty'),
    startTime: isoDateString,
    endTime: isoDateString,
    homeScore: z.coerce.number().nonnegative().int().optional(),
    awayScore: z.coerce.number().nonnegative().int().optional(),
  }).superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endTime must be chronologically after startTime',
        path: ['endTime'],
      });
    }
  });

// Schema for updating match scores
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().nonnegative().int(),
  awayScore: z.coerce.number().nonnegative().int(),
});
