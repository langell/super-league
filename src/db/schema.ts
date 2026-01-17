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
export const user = pgTable("user", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    // Computed name for backward compat if needed, but we'll use first+last
    name: text("name"),
    email: text("email").unique().notNull(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    phone: text("phone"),
    ghinId: text("ghin_id"), // Optional GHIN link
    venmoHandle: text("venmo_handle"),
    notificationPreference: varchar("notification_preference", { length: 10 }).default("sms"), // "sms", "email"
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
    "account",
    {
        userId: uuid("userId")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
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
        .references(() => user.id, { onDelete: "cascade" }),
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
        .references(() => user.id)
        .notNull(),
    organizationId: uuid("organization_id")
        .references(() => organizations.id)
        .notNull(),
    role: varchar("role", { length: 20 }).notNull().default("player"), // "admin", "player", "sub"
    handicap: decimal("handicap", { precision: 4, scale: 1 }).default("0.0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teams
export const teams = pgTable("teams", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
        .references(() => organizations.id)
        .notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Team Members
export const teamMembers = pgTable("team_members", {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
        .references(() => teams.id, { onDelete: "cascade" })
        .notNull(),
    leagueMemberId: uuid("league_member_id")
        .references(() => leagueMembers.id, { onDelete: "cascade" })
        .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Courses
export const courses = pgTable("courses", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    website: text("website"),
    proName: text("pro_name"),
    phoneNumber: text("phone_number"),
    email: text("email"),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rounds (A scheduled competition day)
export const rounds = pgTable("rounds", {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
        .references(() => seasons.id, { onDelete: "cascade" })
        .notNull(),
    courseId: uuid("course_id")
        .references(() => courses.id),
    date: timestamp("date").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"), // "scheduled", "in_progress", "completed"
    holesCount: integer("holes_count").default(18).notNull(), // 9 or 18
    roundType: varchar("round_type", { length: 20 }).default("18_holes"), // "front_9", "back_9", "18_holes"
});

// Matches (Pairings within a round)
export const matches = pgTable("matches", {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
        .references(() => rounds.id, { onDelete: "cascade" })
        .notNull(),
    format: varchar("format", { length: 20 }).notNull().default("match_play"),
});

// Match Players (Individual participants in a match)
export const matchPlayers = pgTable("match_players", {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
        .references(() => matches.id, { onDelete: "cascade" })
        .notNull(),
    userId: uuid("user_id")
        .references(() => user.id)
        .notNull(),
    teamId: uuid("team_id"), // Optional grouping for 2v2
    teeId: uuid("tee_id").references(() => tees.id), // Which tees they are playing
    startingHandicap: decimal("starting_handicap", { precision: 4, scale: 1 }),
});

// Sub Requests
export const subRequests = pgTable("sub_requests", {
    id: uuid("id").primaryKey().defaultRandom(),
    matchPlayerId: uuid("match_player_id")
        .references(() => matchPlayers.id, { onDelete: "cascade" })
        .notNull(),
    requestedByUserId: uuid("requested_by_user_id")
        .references(() => user.id)
        .notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(), // open, filled, cancelled
    filledByUserId: uuid("filled_by_user_id").references(() => user.id),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Hole-by-hole scores
export const scores = pgTable("scores", {
    id: uuid("id").primaryKey().defaultRandom(),
    matchPlayerId: uuid("match_player_id")
        .references(() => matchPlayers.id, { onDelete: "cascade" })
        .notNull(),
    holeId: uuid("hole_id")
        .references(() => holes.id)
        .notNull(),
    grossScore: integer("gross_score"),
    scoreOverride: integer("score_override"), // Admin override
    updatedBy: uuid("updated_by").references(() => user.id),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
