import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    boolean,
    decimal,
    primaryKey,
    varchar,
} from "drizzle-orm/pg-core";

// Organizations (Leagues)
export const organizations = pgTable("organizations", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    handicapPercentage: decimal("handicap_percentage", { precision: 3, scale: 2 }).default("1.00").notNull(), // e.g. 0.90 for 90%
    minScoresToCalculate: integer("min_scores_to_calculate").default(3).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").unique().notNull(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    ghinId: text("ghin_id"), // Optional GHIN link
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
    "account",
    {
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    })
);

export const sessions = pgTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: uuid("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
);

// League Membership (Multitenancy)
export const leagueMembers = pgTable("league_members", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    organizationId: uuid("organization_id")
        .references(() => organizations.id)
        .notNull(),
    role: varchar("role", { length: 20 }).notNull().default("player"), // "admin", "player"
    handicap: decimal("handicap", { precision: 4, scale: 1 }).default("0.0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Courses
export const courses = pgTable("courses", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    website: text("website"),
});

// Tees
export const tees = pgTable("tees", {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
        .references(() => courses.id)
        .notNull(),
    name: text("name").notNull(), // e.g., "Blue", "White"
    rating: decimal("rating", { precision: 4, scale: 1 }).notNull(),
    slope: integer("slope").notNull(),
    par: integer("par").notNull(),
});

// Holes
export const holes = pgTable("holes", {
    id: uuid("id").primaryKey().defaultRandom(),
    teeId: uuid("tee_id")
        .references(() => tees.id)
        .notNull(),
    holeNumber: integer("hole_number").notNull(),
    par: integer("par").notNull(),
    handicapIndex: integer("handicap_index").notNull(), // Stroke Index
    yardage: integer("yardage"),
});

// Seasons
export const seasons = pgTable("seasons", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
        .references(() => organizations.id)
        .notNull(),
    name: text("name").notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    active: boolean("active").default(true).notNull(),
});

// Rounds (A scheduled competition day)
export const rounds = pgTable("rounds", {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
        .references(() => seasons.id)
        .notNull(),
    courseId: uuid("course_id")
        .references(() => courses.id)
        .notNull(),
    date: timestamp("date").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"), // "scheduled", "in_progress", "completed"
});

// Matches (Pairings within a round)
export const matches = pgTable("matches", {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
        .references(() => rounds.id)
        .notNull(),
    format: varchar("format", { length: 20 }).notNull().default("match_play"),
});

// Match Players (Individual participants in a match)
export const matchPlayers = pgTable("match_players", {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
        .references(() => matches.id)
        .notNull(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    teamId: uuid("team_id"), // Optional grouping for 2v2
    startingHandicap: decimal("starting_handicap", { precision: 4, scale: 1 }),
});

// Hole-by-hole scores
export const scores = pgTable("scores", {
    id: uuid("id").primaryKey().defaultRandom(),
    matchPlayerId: uuid("match_player_id")
        .references(() => matchPlayers.id)
        .notNull(),
    holeId: uuid("hole_id")
        .references(() => holes.id)
        .notNull(),
    grossScore: integer("gross_score"),
    scoreOverride: integer("score_override"), // Admin override
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
