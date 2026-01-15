import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addMemberToLeague, removeMemberFromLeague, updateMember, createSeason, createLeague, saveScorecard } from './actions';
import { auth } from '@/auth';
import { db } from '@/db';
import { revalidatePath } from 'next/cache';

// Define shapes for mocked responses
interface MockLeague {
    id: string;
    organizationId: string;
    role: string;
    userId?: string;
}

interface MockUser {
    id: string;
    email: string;
}

// Shared mocks for transaction calls
const mockTx = {
    update: vi.fn(() => ({
        set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ id: 'updated-id' }]),
        })),
    })),
    insert: vi.fn(() => ({
        values: vi.fn(() => ({
            onConflictDoUpdate: vi.fn(() => ({
                returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
            })),
            returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
        })),
    })),
    delete: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 'deleted-id' }]),
    })),
};

// Mock all external dependencies
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

// Robust mock for Drizzle's chained select
const createChainMock = (result: unknown[]) => {
    const limit = vi.fn().mockResolvedValue(result);
    const where = vi.fn(() => ({ limit }));
    const innerJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ innerJoin, where }));
    return { from };
};

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                onConflictDoUpdate: vi.fn(() => ({
                    returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
                })),
                returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
            })),
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn().mockResolvedValue([{ id: 'updated-id' }]),
            })),
        })),
        delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ id: 'deleted-id' }]),
        })),
        transaction: vi.fn((cb) => cb(mockTx)),
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe('actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('addMemberToLeague', () => {
        it('adds a new member successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-1' } } as never);

            vi.mocked(db.select)
                .mockReturnValueOnce(createChainMock([{ organizationId: 'org-1', role: 'admin' }]) as never)
                .mockReturnValueOnce(createChainMock([{ id: 'user-2', email: 'john@example.com' }] as MockUser[]) as never)
                .mockReturnValueOnce(createChainMock([]) as never);

            const formData = new FormData();
            formData.append('email', 'john@example.com');
            formData.append('name', 'John Doe');
            formData.append('organizationId', 'org-1');
            formData.append('leagueSlug', 'test-league');

            const result = await addMemberToLeague(null, formData);

            expect(result.success).toBe(true);
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('removeMemberFromLeague', () => {
        it('removes a member successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-1' } } as never);

            vi.mocked(db.select)
                .mockReturnValueOnce(createChainMock([{ id: 'member-2', organizationId: 'org-1' }] as MockLeague[]) as never)
                .mockReturnValueOnce(createChainMock([{ userId: 'admin-1', role: 'admin' }] as MockLeague[]) as never);

            const formData = new FormData();
            formData.append('memberId', 'member-2');
            formData.append('leagueSlug', 'test-league');

            await removeMemberFromLeague(formData);

            expect(db.delete).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('updateMember', () => {
        it('updates a member successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-1' } } as never);

            vi.mocked(db.select)
                .mockReturnValueOnce(createChainMock([{ id: 'member-2', organizationId: 'org-1' }] as MockLeague[]) as never)
                .mockReturnValueOnce(createChainMock([{ userId: 'admin-1', role: 'admin' }] as MockLeague[]) as never);

            const formData = new FormData();
            formData.append('memberId', 'member-2');
            formData.append('firstName', 'John');
            formData.append('lastName', 'Doe');
            formData.append('userId', 'user-2');
            formData.append('leagueSlug', 'test-league');

            await expect(updateMember(formData)).rejects.toThrow("Redirect to /dashboard/test-league/members");
            expect(db.transaction).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('createSeason', () => {
        it('adds a new season successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-1' } } as never);

            vi.mocked(db.select)
                .mockReturnValueOnce(createChainMock([{ organizationId: 'org-1', role: 'admin' }] as MockLeague[]) as never);

            const formData = new FormData();
            formData.append('name', '2024 Season');
            formData.append('organizationId', 'org-1');
            formData.append('leagueSlug', 'test-league');

            await expect(createSeason(formData)).rejects.toThrow("Redirect to /dashboard/test-league/schedule");
            expect(db.insert).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('createLeague', () => {
        it('creates a league successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);

            const formData = new FormData();
            formData.append('name', 'My New League');
            formData.append('slug', 'my-new-league');

            await expect(createLeague(formData)).rejects.toThrow("Redirect to /dashboard");
            expect(db.insert).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('saveScorecard', () => {
        it('saves scores successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);

            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'match-1', organizationId: 'org-1' }] as MockLeague[]) as never);

            const formData = new FormData();
            formData.append('matchId', 'match-1');
            formData.append('leagueSlug', 'test-league');
            formData.append('player-mp-1-hole-h-1', '4');
            formData.append('player-mp-1-hole-h-2', '5');

            await saveScorecard(formData);

            expect(mockTx.insert).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });
});
