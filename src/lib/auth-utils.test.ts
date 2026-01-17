import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLeagueAdmin, AuthError, getAuthenticatedSession, validateMemberRole } from './auth-utils';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

// Move mocks to the TOP of the file to ensure they are picked up before imports
vi.mock('@/auth', () => ({
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
}));

const { mockSelect, mockLimit } = vi.hoisted(() => {
    const mockLimit = vi.fn();
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
    const mockFrom = vi.fn(() => ({
        innerJoin: mockInnerJoin,
        where: mockWhere
    }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    return { mockSelect, mockLimit };
});

vi.mock('@/db', () => ({
    db: {
        select: mockSelect,
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

vi.unmock('./auth-utils');

describe('auth-utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default mock implementations if needed
        mockLimit.mockResolvedValue([]);
    });

    describe('AuthError', () => {
        it('should be an instance of Error', () => {
            const error = new AuthError();
            expect(error).toBeInstanceOf(Error);
        });

        it('should have the correct name', () => {
            const error = new AuthError();
            expect(error.name).toBe('AuthError');
        });

        it('should have the default message "Unauthorized"', () => {
            const error = new AuthError();
            expect(error.message).toBe('Unauthorized');
        });

        it('should accept a custom message', () => {
            const error = new AuthError('Custom error message');
            expect(error.message).toBe('Custom error message');
        });
    });

    describe('getAuthenticatedSession', () => {
        it('should return session if user is authenticated', async () => {
            const mockSession = { user: { id: 'user-123' } };
            vi.mocked(auth).mockResolvedValueOnce(mockSession as never);

            const result = await getAuthenticatedSession();
            expect(result).toEqual(mockSession);
        });

        it('should throw AuthError if session is null', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);

            await expect(getAuthenticatedSession()).rejects.toThrow(AuthError);
        });

        it('should throw AuthError if user is missing in session', async () => {
            vi.mocked(auth).mockResolvedValueOnce({} as never);

            await expect(getAuthenticatedSession()).rejects.toThrow(AuthError);
        });

        it('should throw AuthError if user id is missing in session', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);

            await expect(getAuthenticatedSession()).rejects.toThrow(AuthError);
        });
    });

    describe('validateMemberRole', () => {
        const mockSession = { user: { id: 'user-123' } };

        it('should throw AuthError if user is not authenticated', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);

            await expect(validateMemberRole('org-1')).rejects.toThrow(AuthError);
        });

        it('should throw AuthError if user is not a member of the organization', async () => {
            vi.mocked(auth).mockResolvedValueOnce(mockSession as never);
            mockLimit.mockResolvedValueOnce([]); // No membership found

            await expect(validateMemberRole('org-1')).rejects.toThrow('Forbidden: Insufficient permissions');
        });

        it('should throw AuthError if user does not have the allowed role', async () => {
            vi.mocked(auth).mockResolvedValueOnce(mockSession as never);
            mockLimit.mockResolvedValueOnce([{ role: 'player' }]);

            // Default allowed role is 'admin' only
            await expect(validateMemberRole('org-1')).rejects.toThrow('Forbidden: Insufficient permissions');
        });

        it('should return session and membership if user has allowed role (default admin)', async () => {
            vi.mocked(auth).mockResolvedValueOnce(mockSession as never);
            const mockMembership = { role: 'admin' };
            mockLimit.mockResolvedValueOnce([mockMembership]);

            const result = await validateMemberRole('org-1');
            expect(result).toEqual({ session: mockSession, membership: mockMembership });
        });

        it('should valid if user has one of multiple allowed roles', async () => {
            vi.mocked(auth).mockResolvedValueOnce(mockSession as never);
            const mockMembership = { role: 'player' };
            mockLimit.mockResolvedValueOnce([mockMembership]);

            const result = await validateMemberRole('org-1', ['admin', 'player']);
            expect(result).toEqual({ session: mockSession, membership: mockMembership });
        });
    });

    describe('getLeagueAdmin', () => {
        it('redirects to signin if no session', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null as never);

            await expect(getLeagueAdmin('test-slug')).rejects.toThrow('Redirect to /api/auth/signin');
            expect(redirect).toHaveBeenCalledWith('/api/auth/signin');
        });

        it('redirects to dashboard if user is not a member', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);
            mockLimit.mockResolvedValueOnce([]); // No result from getLeagueMember

            await expect(getLeagueAdmin('test-slug')).rejects.toThrow('Redirect to /dashboard');
            expect(redirect).toHaveBeenCalledWith('/dashboard');
        });

        it('redirects to league dashboard if user is a member but not an admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);
            mockLimit.mockResolvedValueOnce([{ role: 'player' }]); // Is a member

            await expect(getLeagueAdmin('test-slug')).rejects.toThrow('Redirect to /dashboard/test-slug');
            expect(redirect).toHaveBeenCalledWith('/dashboard/test-slug');
        });

        it('return league details if user is an admin', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);

            const mockLeague = { id: 'league-1', name: 'Test League', slug: 'test-slug', role: 'admin' };
            mockLimit.mockResolvedValueOnce([mockLeague]);

            const result = await getLeagueAdmin('test-slug');
            expect(result).toEqual(mockLeague);
            expect(redirect).not.toHaveBeenCalled();
        });

        it('redirects to signin if user id is missing', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { name: 'No ID' } } as never); // User exists but no ID
            mockLimit.mockResolvedValueOnce([]); // Not even reached

            await expect(getLeagueAdmin('test-slug')).rejects.toThrow('Redirect to /api/auth/signin');
            expect(redirect).toHaveBeenCalledWith('/api/auth/signin');
        });
    });
});
