import { describe, it, expect, vi, beforeEach } from 'vitest';

// Move mocks to the TOP of the file to ensure they are picked up before imports
vi.mock('@/auth', () => ({
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
}));

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                innerJoin: vi.fn(() => ({
                    where: vi.fn(() => ({
                        limit: vi.fn(),
                    })),
                })),
            })),
        })),
    },
}));

vi.mock('next/navigation', () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`Redirect to ${url}`);
    }),
    notFound: vi.fn(() => {
        throw new Error('notFound');
    }),
}));

import { getLeagueAdmin } from './auth-utils';
import { auth } from '@/auth';
import { db } from '@/db';
import { redirect } from 'next/navigation';

describe('auth-utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getLeagueAdmin', () => {
        it('redirects to signin if no session', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);

            await expect(getLeagueAdmin('test-slug')).rejects.toThrow('Redirect to /api/auth/signin');
            expect(redirect).toHaveBeenCalledWith('/api/auth/signin');
        });

        it('redirects to dashboard if user is not an admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);

            const mockLimit = vi.fn().mockResolvedValueOnce([]); // No result
            const mockWhere = vi.fn(() => ({ limit: mockLimit }));
            const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
            const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
            vi.mocked(db.select).mockReturnValueOnce({ from: mockFrom } as never);

            await expect(getLeagueAdmin('test-slug')).rejects.toThrow('Redirect to /dashboard');
            expect(redirect).toHaveBeenCalledWith('/dashboard');
        });

        it('returns league details if user is an admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);

            const mockLeague = { id: 'league-1', name: 'Test League', slug: 'test-slug', role: 'admin' };
            const mockLimit = vi.fn().mockResolvedValueOnce([mockLeague]);
            const mockWhere = vi.fn(() => ({ limit: mockLimit }));
            const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
            const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
            vi.mocked(db.select).mockReturnValueOnce({ from: mockFrom } as never);

            const result = await getLeagueAdmin('test-slug');
            expect(result).toEqual(mockLeague);
            expect(redirect).not.toHaveBeenCalled();
        });
    });
});
