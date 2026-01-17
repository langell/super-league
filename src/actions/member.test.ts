/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addMemberToLeague, removeMemberFromLeague, updateMember, recalculateLeagueHandicaps } from './member';
import { auth } from '@/auth';
import { db } from '@/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import logger from '@/lib/logger';

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

vi.mock('@/lib/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock dynamic import
vi.mock('@/lib/handicap-service', () => ({
    updatePlayerHandicap: vi.fn(),
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

const { mockSet, mockUpdate, mockInsert, mockTx } = vi.hoisted(() => {
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
            then: (cb: any) => Promise.resolve([]).then(cb),
        })),
        update: mockUpdate,
        insert: mockInsert,
        delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ id: 'deleted-id' }]),
        })),
    };

    return { mockSet, mockUpdate, mockInsert, mockTx };
});

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            then: (cb: any) => Promise.resolve([]).then(cb),
        })),
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ id: 'deleted-id' }]),
        })),
        transaction: vi.fn((cb) => cb(mockTx)),
    },
}));

// --- Tests ---

describe('Member Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('addMemberToLeague', () => {
        const formData = new FormData();
        formData.append('name', 'John Doe');
        formData.append('email', 'john@example.com');
        formData.append('organizationId', 'org-1');
        formData.append('leagueSlug', 'test-league');

        it('returns forbidden if not authenticated', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);
            const result = await addMemberToLeague({}, formData);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Unauthorized');
        });

        it('returns validation error for invalid input', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            const invalidData = new FormData();
            // Missing email
            const result = await addMemberToLeague({}, invalidData);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Validation failed');
        });

        it('returns unauthorized if user is not admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-id' } } as never);
            // Mock isAdmin check returning empty
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([])); // Not admin

            const result = await addMemberToLeague({}, formData);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Unauthorized - Not an Admin');
        });

        it('creates new user and adds to league if user does not exist', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            // 1. Admin check passed
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));

            // 2. User check (not found)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));

            // 3. User creation mock (handled by db.insert default mock)
            // 3b. Ensure insert returns a new user object for the next step
            vi.mocked(db.insert).mockReturnValueOnce({
                values: vi.fn(() => ({
                    returning: vi.fn().mockResolvedValue([{ id: 'new-user-id' }]),
                }))
            } as never);

            // 4. Check if member exists (not found)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));

            const result = await addMemberToLeague({}, formData);

            expect(result.success).toBe(true);
            expect(db.insert).toHaveBeenCalledTimes(2); // One for user, one for member
            expect(result.message).toBe('Member added successfully');
        });

        it('updates existing user name if missing and adds to league', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            // 1. Admin check passed
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));

            // 2. User check (found but no name)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'existing-id', email: 'john@example.com', name: null }]));

            // 3. Check if member exists (not found) - Note: The code calls select again for 'existingMember'
            // But before that, it updates the user.

            // 4. Member check
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));

            const result = await addMemberToLeague({}, formData);

            expect(db.update).toHaveBeenCalled(); // Should update user name
            expect(db.insert).toHaveBeenCalledTimes(1); // Only for member, not user
            expect(result.success).toBe(true);
        });

        it('returns message if user is already a member', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);

            // 1. Admin check passed
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));

            // 2. User check (found)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'existing-id', name: 'John Doe' }]));

            // 3. Member check (found)
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'member-id' }]));

            const result = await addMemberToLeague({}, formData);
            expect(result.success).toBe(true);
            expect(result.message).toBe('User is already a member of this league.');
            expect(db.insert).not.toHaveBeenCalled();
        });

        it('handles errors gracefully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            // 1. Admin check passes
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));
            // 2. User lookup throws
            vi.mocked(db.select).mockImplementationOnce(() => { throw new Error('DB Error'); });

            const result = await addMemberToLeague({}, formData);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Internal server error');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('removeMemberFromLeague', () => {
        const formData = new FormData();
        formData.append('memberId', 'member-1');
        formData.append('leagueSlug', 'test-league');

        it('throws unauthorized if not logged in', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            await expect(removeMemberFromLeague(formData)).rejects.toThrow('Unauthorized');
        });

        it('does nothing if member to delete is not found', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([])); // Memebr not found

            await removeMemberFromLeague(formData);
            expect(db.delete).not.toHaveBeenCalled();
        });

        it('throws unauthorized if caller is not admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-id' } } as never);
            // 1. Member to delete found
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'member-1', organizationId: 'org-1' }]));
            // 2. Admin check fails
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));

            await expect(removeMemberFromLeague(formData)).rejects.toThrow('Unauthorized');
        });

        it('deletes member if authorized', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            // 1. Member to delete found
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'member-1', organizationId: 'org-1' }]));
            // 2. Admin check passes
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));

            await removeMemberFromLeague(formData);
            expect(db.delete).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('updateMember', () => {
        const formData = new FormData();
        formData.append('memberId', 'member-1');
        formData.append('leagueSlug', 'test-league');
        formData.append('userId', 'user-1');
        formData.append('firstName', 'Jane');
        formData.append('lastName', 'Doe');
        formData.append('role', 'player');
        formData.append('handicap', '10');

        it('throws unauthorized if not logged in', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            await expect(updateMember(formData)).rejects.toThrow('Unauthorized');
        });

        it('throws error if member not found', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));
            await expect(updateMember(formData)).rejects.toThrow('Member not found');
        });

        it('throws unauthorized if caller is not admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-id' } } as never);
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'member-1', organizationId: 'org-1' }]));
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));

            await expect(updateMember(formData)).rejects.toThrow('Unauthorized');
        });

        it('updates member and user details in transaction', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'member-1', organizationId: 'org-1' }]));
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));

            await updateMember(formData);
            expect(db.transaction).toHaveBeenCalled();
            expect(mockTx.update).toHaveBeenCalledTimes(2); // One for member, one for user
            expect(redirect).toHaveBeenCalled();
        });
        it('updates user name using only first name if last name is missing', async () => {
            const partialFormData = new FormData();
            partialFormData.append('memberId', 'member-1');
            partialFormData.append('leagueSlug', 'test-league');
            partialFormData.append('userId', 'user-1');
            partialFormData.append('firstName', 'Jane');
            partialFormData.append('role', 'player');
            partialFormData.append('handicap', '10');

            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'member-1', organizationId: 'org-1' }]));
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));

            await updateMember(partialFormData);

            // Verify the update call arguments
            // mockSet is called by mockTx.update().set()
            // access the 2nd call to .set() in the transaction
            const updateCallArgs = mockSet.mock.calls[1][0] as { name: string };
            expect(updateCallArgs.name).toBe('Jane');
        });

    });

    describe('recalculateLeagueHandicaps', () => {
        const formData = new FormData();
        formData.append('organizationId', 'org-1');
        formData.append('leagueSlug', 'test-league');

        it('throws unauthorized if not logged in', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            await expect(recalculateLeagueHandicaps(formData)).rejects.toThrow('Unauthorized');
        });

        it('throws unauthorized if caller is not admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-id' } } as never);
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([]));
            await expect(recalculateLeagueHandicaps(formData)).rejects.toThrow('Unauthorized - Not an Admin');
        });

        it('recalculates handicaps for all members', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            // 1. Admin check
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));
            // 2. Get members
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ userId: 'u1' }, { userId: 'u2' }]));

            await recalculateLeagueHandicaps(formData);

            // Check dynamic import usage (would need to await import in test or rely on mock)
            // Since we mocked @/lib/handicap-service, we verify the mock
            const { updatePlayerHandicap } = await import('@/lib/handicap-service');
            expect(updatePlayerHandicap).toHaveBeenCalledTimes(2);
            expect(revalidatePath).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });

        it('handles errors during recalculation for specific members', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-id' } } as never);
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ role: 'admin' }]));
            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ userId: 'u1' }]));

            const { updatePlayerHandicap } = await import('@/lib/handicap-service');
            vi.mocked(updatePlayerHandicap).mockRejectedValueOnce(new Error('Calculation failed'));

            await recalculateLeagueHandicaps(formData);

            expect(logger.error).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled(); // Still redirects after finishing
        });
    });
});
