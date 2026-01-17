/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRound, updateRound, deleteRound, generateSchedule } from './round'; // Adjust import
import { auth } from '@/auth';
import { db } from '@/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// --- Mocks ---

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

// Mock DB chain helper
const createChainMock = (result: unknown[]) => {
    const mockChain = {
        then: (onFulfilled: (value: unknown[]) => unknown) => Promise.resolve(result).then(onFulfilled),
        catch: (onRejected: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
        limit: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
    };
    return mockChain as never;
};

const { mockSet, mockUpdate, mockInsert, mockTx, mockValues } = vi.hoisted(() => {
    const mockSet = vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 'updated-id' }]),
    }));
    const mockUpdate = vi.fn(() => ({ set: mockSet }));
    const mockValues = vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
    }));
    const mockInsert = vi.fn(() => ({ values: mockValues }));

    const mockTx = {
        select: vi.fn(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            then: (cb: any) => Promise.resolve([]).then(cb), // Default empty
        })),
        update: mockUpdate,
        insert: mockInsert,
        delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ id: 'deleted-id' }]),
        })),
    };

    return { mockSet, mockUpdate, mockInsert, mockTx, mockValues };
});

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(() => createChainMock([])),
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ id: 'deleted-id' }]),
        })),
    },
}));

// --- Tests ---

describe('Round Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createRound', () => {
        const validFormData = new FormData();
        validFormData.append('leagueSlug', 'test-league');
        validFormData.append('seasonId', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        validFormData.append('courseId', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
        validFormData.append('date', '2023-01-01');
        validFormData.append('holesCount', '18');
        validFormData.append('roundType', '18_holes');

        it('throws unauthorized if not logged in', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);
            await expect(createRound(validFormData)).rejects.toThrow('Unauthorized');
        });

        it('throws validation error for invalid input', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            const invalidData = new FormData();
            invalidData.append('leagueSlug', 'test-league');
            // Missing fields
            await expect(createRound(invalidData)).rejects.toThrow('Invalid input');
        });

        it('creates a round successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            await createRound(validFormData);

            expect(mockInsert).toHaveBeenCalled();
            const insertArgs = mockInsert.mock.calls[0][0]; // Check first arg (table)
            expect(mockValues).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });
    });

    describe('updateRound', () => {
        const validFormData = new FormData();
        validFormData.append('leagueSlug', 'test-league');
        validFormData.append('roundId', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');
        validFormData.append('seasonId', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        validFormData.append('courseId', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
        validFormData.append('date', '2023-01-02');
        validFormData.append('holesCount', '9');
        validFormData.append('roundType', 'front_9');
        validFormData.append('status', 'complete');

        it('throws unauthorized if not logged in', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);
            await expect(updateRound(validFormData)).rejects.toThrow('Unauthorized');
        });

        it('throws validation error for invalid input', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            const invalidData = new FormData();
            invalidData.append('leagueSlug', 'test-league');
            // invalid data
            await expect(updateRound(invalidData)).rejects.toThrow('Invalid input');
        });

        it('updates a round successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            await updateRound(validFormData);

            expect(mockUpdate).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });
    });

    describe('deleteRound', () => {
        const formData = new FormData();
        formData.append('roundId', 'round-1');
        formData.append('leagueSlug', 'test-league');

        it('throws unauthorized if not logged in', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);
            await expect(deleteRound(formData)).rejects.toThrow('Unauthorized');
        });

        it('deletes round successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            await deleteRound(formData);

            expect(db.delete).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });
    });

    describe('generateSchedule', () => {
        const formData = new FormData();
        formData.append('leagueSlug', 'test-league');
        formData.append('seasonId', 'season-1');

        it('throws unauthorized if not logged in', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);
            await expect(generateSchedule(formData)).rejects.toThrow('Unauthorized');
        });

        it('throws error if league or season invalid', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            // 1. League fetch fails
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));
            // 2. Season fetch fails
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));

            await expect(generateSchedule(formData)).rejects.toThrow('Invalid league or season');
        });

        it('returns early if not enough teams', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            // 1. League fetch success
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'league-1' }]));
            // 2. Season fetch success
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'season-1' }]));
            // 3. Teams fetch (only 1 team)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'team-1' }]));

            await generateSchedule(formData);

            // No insertion happens
            const calls = mockInsert.mock.calls.length;
            expect(calls).toBe(0);
        });

        it('generates schedule successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            // 1. League fetch success
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'league-1', slug: 'test-league' }]));
            // 2. Season fetch success
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'season-1' }]));
            // 3. Teams fetch (2 teams)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([
                { id: 'team-A', organizationId: 'league-1' },
                { id: 'team-B', organizationId: 'league-1' }
            ]));
            // 4. Season Rounds fetch (1 round)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([
                { id: 'round-1', seasonId: 'season-1', date: new Date() }
            ]));

            // 5. Loop: Existing matches fetch (empty)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([])); // db.select call inside loop

            // 6. DB insert for match (happens once for 2 teams, 1 round)
            // 7. DB select team members (for team A)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ userId: 'u1', handicap: 10 }]));
            // 8. DB select team members (for team B)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ userId: 'u2', handicap: 12 }]));

            await generateSchedule(formData);

            expect(mockInsert).toHaveBeenCalled(); // Match insertion
            expect(revalidatePath).toHaveBeenCalled();
        });

        it('generates schedule with bye weeks for odd number of teams', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'league-1', slug: 'test-league' }]));
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'season-1' }]));
            // 3 Teams (Odd)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([
                { id: 'team-A', organizationId: 'league-1' },
                { id: 'team-B', organizationId: 'league-1' },
                { id: 'team-C', organizationId: 'league-1' }
            ]));
            // Rounds
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([
                { id: 'round-1', seasonId: 'season-1', date: new Date() }
            ]));

            vi.mocked(db.select).mockReturnValueOnce(createChainMock([])); // loop 1

            // Team members... just return empty to avoid complex mocking for this test focus
            vi.mocked(db.select).mockReturnValue(createChainMock([]));

            await generateSchedule(formData);

            expect(mockInsert).toHaveBeenCalled();
        });
    });
});
