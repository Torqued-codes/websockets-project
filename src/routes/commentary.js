import { Router } from 'express';
import { desc } from 'drizzle-orm';
import { matchIdParamSchema } from '../validation/matches.js';
import { listCommentaryQuerySchema, createCommentarySchema } from '../validation/commentary.js';
import { db } from '../db/db.js';
import { eq } from 'drizzle-orm';
import { commentary } from '../db/schema.js';

export const commentaryRouter = Router({ mergeParams: true }); // mergeParams to access matchId from parent route

const MAX_LIMIT = 100;

commentaryRouter.get('/', async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
        return res.status(400).json({ error: 'Invalid match id', details: paramsResult.error.issues });
    }

    const queryResult = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
        return res.status(400).json({ error: 'Invalid query', details: queryResult.error.issues });
    }

    const limit = Math.min(queryResult.data.limit ?? MAX_LIMIT, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, paramsResult.data.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        return res.status(200).json({ data });
    } catch (error) {
        console.error('Failed to fetch commentary:', error);
        return res.status(500).json({ error: 'Failed to list commentary' });
    }
});

commentaryRouter.post('/', async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
        return res.status(400).json({ error: 'Invalid match id', details: paramsResult.error.issues });
    }

    const bodyResult = createCommentarySchema.safeParse(req.body);
    if (!bodyResult.success) {
        return res.status(400).json({ error: 'Invalid payload', details: bodyResult.error.issues });
    }

    try {
        const { minute, tags, ...rest } = bodyResult.data;
        const [result] = await db.insert(commentary).values({
            matchId: paramsResult.data.id,
            minute,
            ...rest,
            tags: tags ? JSON.stringify(tags) : null,
        }).returning();

        if(res.app.locals.broadcastCommentary){
            res.app.locals.broadcastCommentary(result.matchId, result);
        }
        res.status(201).json({ data: result });
    } catch (error) {
        console.error('Failed to insert commentary:', error);
        res.status(500).json({ error: 'Failed to create commentary' });
    }
});