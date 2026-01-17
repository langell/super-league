import { z } from "zod";

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 50;
const SLUG_MIN_LENGTH = 2;
const SLUG_MAX_LENGTH = 50;
const HANDICAP_MIN = -10;
const HANDICAP_MAX = 54;
const SCORE_MIN = 1;
const SCORE_MAX = 20;
const NOTIFICATION_PREFERENCES = ["sms", "email", "none"] as const;

export const notificationPreferenceSchema = z.enum(NOTIFICATION_PREFERENCES);
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

/**
 * Common validation schemas for the Golf League API.
 * Using Zod allows for:
 * 1. Runtime validation of untrusted inputs (Form Data, JSON API).
 * 2. Automatic TypeScript type inference.
 * 3. Consistent error messaging.
 */

// League & slug validation
export const slugSchema = z.string().min(SLUG_MIN_LENGTH).max(SLUG_MAX_LENGTH).regex(/^[a-z0-9-]+$/, "Slugs can only contain lowercase letters, numbers, and hyphens");

export const leagueSchema = z.object({
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    slug: slugSchema,
    handicapPercentage: z.string().optional(),
    minScoresToCalculate: z.number().int().min(1).max(20).optional().default(3),
});

// Season validation
export const seasonSchema = z.object({
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    active: z.boolean().default(true),
});

// Round validation
export const roundSchema = z.object({
    seasonId: z.string().uuid(),
    courseId: z.string().uuid(),
    date: z.string().or(z.date()),
    holesCount: z.number().int().min(9).max(18).default(18),
    roundType: z.enum(["front_9", "back_9", "18_holes"]).default("18_holes"),
});

// Member validation
export const memberSchema = z.object({
    firstName: z.string().min(NAME_MIN_LENGTH, "First name is required").max(NAME_MAX_LENGTH),
    lastName: z.string().min(NAME_MIN_LENGTH, "Last name is required").max(NAME_MAX_LENGTH),
    email: z.string().email("Invalid email address"),
    handicap: z.number().min(HANDICAP_MIN).max(HANDICAP_MAX).optional().default(0),
    role: z.enum(["admin", "player", "sub"]).default("player"),
    notificationPreference: notificationPreferenceSchema.default("sms"),
});

// Scoring validation
export const scoreSchema = z.object({
    matchPlayerId: z.string().uuid(),
    holeId: z.string().uuid(),
    grossScore: z.number().int().min(SCORE_MIN).max(SCORE_MAX),
});

// Helper type for Action Responses
export type ActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
};

/**
 * Helper to validate data and return structured errors.
 */
export function validateRequest<T>(schema: z.Schema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error.flatten().fieldErrors as Record<string, string[]> };
}
