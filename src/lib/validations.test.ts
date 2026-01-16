import { describe, it, expect } from 'vitest';
import { memberSchema, scoreSchema, slugSchema, validateRequest } from './validations';

describe('validations', () => {
    describe('slugSchema', () => {
        it('validates a correct slug', () => {
            expect(slugSchema.safeParse('my-league-2024').success).toBe(true);
        });

        it('rejects too short slugs', () => {
            expect(slugSchema.safeParse('a').success).toBe(false);
        });

        it('rejects slugs with spaces', () => {
            expect(slugSchema.safeParse('my league').success).toBe(false);
        });

        it('rejects uppercase letters', () => {
            expect(slugSchema.safeParse('My-League').success).toBe(false);
        });
    });

    describe('memberSchema', () => {
        it('validates a correct member object', () => {
            const result = memberSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                handicap: 12.5,
                role: 'player'
            });
            expect(result.success).toBe(true);
        });

        it('uses defaults for optional fields', () => {
            const result = memberSchema.parse({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            });
            expect(result.handicap).toBe(0);
            expect(result.role).toBe('player');
        });

        it('rejects invalid email', () => {
            expect(memberSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email'
            }).success).toBe(false);
        });

        it('rejects out of range handicap', () => {
            expect(memberSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                handicap: 60
            }).success).toBe(false);
        });
    });

    describe('scoreSchema', () => {
        it('validates correct score object', () => {
            const result = scoreSchema.safeParse({
                matchPlayerId: '550e8400-e29b-41d4-a716-446655440001',
                holeId: '550e8400-e29b-41d4-a716-446655440002',
                grossScore: 4
            });
            expect(result.success).toBe(true);
        });

        it('rejects invalid UUIDs', () => {
            expect(scoreSchema.safeParse({
                matchPlayerId: 'invalid-id',
                holeId: '550e8400-e29b-41d4-a716-446655440002',
                grossScore: 4
            }).success).toBe(false);
        });

        it('rejects unrealistic scores', () => {
            expect(scoreSchema.safeParse({
                matchPlayerId: '550e8400-e29b-41d4-a716-446655440001',
                holeId: '550e8400-e29b-41d4-a716-446655440002',
                grossScore: 25
            }).success).toBe(false);
        });
    });

    describe('validateRequest', () => {
        it('returns success for valid data', () => {
            const result = validateRequest(slugSchema, 'valid-slug');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe('valid-slug');
            }
        });

        it('returns errors for invalid data', () => {
            const result = validateRequest(slugSchema, 'Invalid Slug');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.errors).toBeDefined();
            }
        });
    });
});
