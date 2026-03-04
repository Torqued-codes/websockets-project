import { Router } from 'express';
import { desc } from 'drizzle-orm';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';  
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
export const matchesRouter = Router();


const MAX_LIMIT = 100;

matchesRouter.get('/', async (req, res) => {                           // the / is matches from index.js
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query', details: JSON.stringify(parsed.error) });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);
    
    try{
        const data = await db.select().from(matches).orderBy((desc(matches.createdAt))).limit(limit);

        return res.status(200).json({ data }); // return to frontend

    } catch (e) {
        console.log('Database error:', e.message);
        res.status(500).json({ error: 'Failed to fetch matches', });
    }
});


matchesRouter.post('/',async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: JSON.stringify(parsed.error) });
    }

    const { startTime, endTime, homeScore, awayScore } = parsed.data;

    try{
        const [event]= await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime),
        }).returning();

        res.status(201).json({ data: event });

    } catch (e) {
        res.status(500).json({ error: 'Failed to create match', details: JSON.stringify(e) });
    }
});