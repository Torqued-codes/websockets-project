import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum, integer, jsonb } from 'drizzle-orm/pg-core';

// Define match_status enum with values scheduled, live, finished
export const matchStatus = pgEnum('match_status', ['scheduled', 'live', 'finished']);

// Matches table
export const matches = pgTable('matches', {
	id: serial('id').primaryKey(),
	sport: text('sport').notNull(),
	homeTeam: text('home_team').notNull(),
	awayTeam: text('away_team').notNull(),
	status: matchStatus('status').default('scheduled').notNull(),
	startTime: timestamp('start_time'),
	endTime: timestamp('end_time'),
	homeScore: integer('home_score').default(0).notNull(),
	awayScore: integer('away_score').default(0).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Commentary table
export const commentary = pgTable('commentary', {
	id: serial('id').primaryKey(),
	matchId: integer('match_id').references(() => matches.id).notNull(),
	minute: integer('minute'),
	sequence: integer('sequence'),
	period: text('period'),
	eventType: text('event_type'),
	actor: text('actor'),
	team: text('team'),
	message: text('message'),
	metadata: jsonb('metadata'),
	tags: text('tags'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Export camelCase aliases for usage in code
export const schema = {
	matchStatus,
	matches,
	commentary,
};


