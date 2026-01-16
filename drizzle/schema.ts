import { pgTable, foreignKey, uuid, text, numeric, integer, timestamp, varchar, boolean, unique, primaryKey } from "drizzle-orm/pg-core"

export const tees = pgTable("tees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	courseId: uuid("course_id").notNull(),
	name: text().notNull(),
	rating: numeric({ precision: 4, scale:  1 }).notNull(),
	slope: integer().notNull(),
	par: integer().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "tees_course_id_courses_id_fk"
		}),
]);

export const scores = pgTable("scores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	matchPlayerId: uuid("match_player_id").notNull(),
	holeId: uuid("hole_id").notNull(),
	grossScore: integer("gross_score"),
	scoreOverride: integer("score_override"),
	updatedBy: uuid("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.holeId],
			foreignColumns: [holes.id],
			name: "scores_hole_id_holes_id_fk"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [user.id],
			name: "scores_updated_by_user_id_fk"
		}),
	foreignKey({
			columns: [table.matchPlayerId],
			foreignColumns: [matchPlayers.id],
			name: "scores_match_player_id_match_players_id_fk"
		}).onDelete("cascade"),
]);

export const matches = pgTable("matches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roundId: uuid("round_id").notNull(),
	format: varchar({ length: 20 }).default('match_play').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [rounds.id],
			name: "matches_round_id_rounds_id_fk"
		}).onDelete("cascade"),
]);

export const courses = pgTable("courses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	address: text(),
	city: text(),
	state: text(),
	website: text(),
	zipCode: text("zip_code"),
	proName: text("pro_name"),
	phoneNumber: text("phone_number"),
	email: text(),
});

export const seasons = pgTable("seasons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "seasons_organization_id_organizations_id_fk"
		}),
]);

export const leagueMembers = pgTable("league_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	role: varchar({ length: 20 }).default('player').notNull(),
	handicap: numeric({ precision: 4, scale:  1 }).default('0.0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "league_members_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "league_members_organization_id_organizations_id_fk"
		}),
]);

export const holes = pgTable("holes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	teeId: uuid("tee_id").notNull(),
	holeNumber: integer("hole_number").notNull(),
	par: integer().notNull(),
	handicapIndex: integer("handicap_index").notNull(),
	yardage: integer(),
}, (table) => [
	foreignKey({
			columns: [table.teeId],
			foreignColumns: [tees.id],
			name: "holes_tee_id_tees_id_fk"
		}),
]);

export const user = pgTable("user", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: timestamp({ mode: 'string' }),
	image: text(),
	ghinId: text("ghin_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	username: text(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	phone: text(),
	venmoHandle: text("venmo_handle"),
	notificationPreference: varchar("notification_preference", { length: 10 }).default('sms'),
}, (table) => [
	unique("user_email_unique").on(table.email),
	unique("user_username_unique").on(table.username),
]);

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	handicapPercentage: numeric("handicap_percentage", { precision: 3, scale:  2 }).default('1.00').notNull(),
	minScoresToCalculate: integer("min_scores_to_calculate").default(3).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("organizations_slug_unique").on(table.slug),
]);

export const rounds = pgTable("rounds", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	seasonId: uuid("season_id").notNull(),
	courseId: uuid("course_id"),
	date: timestamp({ mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).default('scheduled').notNull(),
	holesCount: integer("holes_count").default(18).notNull(),
	roundType: varchar("round_type", { length: 20 }).default('18_holes'),
}, (table) => [
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "rounds_course_id_courses_id_fk"
		}),
	foreignKey({
			columns: [table.seasonId],
			foreignColumns: [seasons.id],
			name: "rounds_season_id_seasons_id_fk"
		}).onDelete("cascade"),
]);

export const matchPlayers = pgTable("match_players", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	matchId: uuid("match_id").notNull(),
	userId: uuid("user_id").notNull(),
	teamId: uuid("team_id"),
	startingHandicap: numeric("starting_handicap", { precision: 4, scale:  1 }),
	teeId: uuid("tee_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "match_players_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.matchId],
			foreignColumns: [matches.id],
			name: "match_players_match_id_matches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teeId],
			foreignColumns: [tees.id],
			name: "match_players_tee_id_tees_id_fk"
		}),
]);

export const session = pgTable("session", {
	sessionToken: text().primaryKey().notNull(),
	userId: uuid().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const teamMembers = pgTable("team_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	teamId: uuid("team_id").notNull(),
	leagueMemberId: uuid("league_member_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_members_team_id_teams_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leagueMemberId],
			foreignColumns: [leagueMembers.id],
			name: "team_members_league_member_id_league_members_id_fk"
		}).onDelete("cascade"),
]);

export const teams = pgTable("teams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "teams_organization_id_organizations_id_fk"
		}),
]);

export const verificationToken = pgTable("verificationToken", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "verificationToken_identifier_token_pk"}),
]);

export const account = pgTable("account", {
	userId: uuid().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_user_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "account_provider_providerAccountId_pk"}),
]);
