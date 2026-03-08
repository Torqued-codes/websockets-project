import 'dotenv/config';
import arcjet, { shield, detectBot, slidingWindow } from '@arcjet/node';

const arcjetKey = process.env.ARCJECT_KEY;
const arcjetMode = process.env.ARCJECT_MODE === 'DRY_RUN' || process.env.ARCJECT_MODE === 'development' ? 'DRY_RUN' : 'LIVE';

if(!arcjetKey) throw new Error('ARCJECT_KEY environment variable is missing');

export const httpArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({mode: arcjetMode}),             // protects against sql injec, xss
            detectBot({mode: arcjetMode, allow: ['CATEGORY : SEARCH_ENGINE','CATEGORY : PREVIEW']}),
            slidingWindow({mode: arcjetMode, interval:'10s',max:50})   // tracks req over moving time frame
        ],
    }) : null;

export const wsArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({mode: arcjetMode}),             // protects against sql injec, xss
            detectBot({mode: arcjetMode, allow: ['CATEGORY : SEARCH_ENGINE','CATEGORY : PREVIEW']}),
            slidingWindow({mode: arcjetMode, interval:'2s',max:5})   // 5 connection req every 2 sec
        ],
    }) : null;

export function securityMiddleware(){
    return async (req, res, next) => {
        if(!httpArcjet) return next();

        try{
            const decision = await httpArcjet.protect(req);

            if(decision.isDenied()){
                if(decision.reason.isRateLimit()){
                    return res.status(429).json({error:'Too many requests'})  //rate limit
                }

                return res.status(403).json({error:'Too many requests'})
            }

        } catch (e) {
            console.error('Arcjet middleware error',e);
            return res.status(503).json({error: 'Service unavailable'});
        }

        next();
    }
}