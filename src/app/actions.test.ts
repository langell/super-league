import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    addMemberToLeague,
    removeMemberFromLeague,
    updateMember,
    createSeason,
    createLeague,
    saveScorecard,
    createCourse,
    updateCourse,
    deleteCourse,
    createTee,
    createRound,
    updateRound,
    deleteRound,
    generateSchedule,
    setupMatch,
    scanScorecardAction,
    saveExtractedCourseAction,
    updateCourseFromScanAction
} from './actions';
import { auth } from '@/auth';
import { db } from '@/db';
import { revalidatePath } from 'next/cache';

// Mock environment variables
process.env.GOOGLE_AI_API_KEY = 'test-api-key';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
    redirect: vi.fn((path) => {
        throw new Error(`Redirect to ${path}`);
    }),
}));

// Robust mock for Drizzle's chained select
const createChainMock = (result: unknown[]) => {
    const mockChain = {
        then: <T>(onFulfilled: (value: unknown[]) => T | PromiseLike<T>) => Promise.resolve(result).then(onFulfilled),
        catch: <T>(onRejected: (reason: unknown) => T | PromiseLike<T>) => Promise.resolve(result).catch(onRejected),
        limit: vi.fn(() => mockChain),
        where: vi.fn(() => mockChain),
        from: vi.fn(() => mockChain),
        innerJoin: vi.fn(() => mockChain),
        orderBy: vi.fn(() => mockChain),
    };
    return mockChain;
};

// Shared mocks for transaction calls
const mockTx = {
    select: vi.fn(() => createChainMock([{ id: 'id-1' }])),
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

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(() => createChainMock([])),
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

// Mock Google Generative AI
const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
        text: () => JSON.stringify({ name: 'Mock Course', city: 'Mock City', state: 'MC', tees: [] }),
    },
});

vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: class {
        getGenerativeModel() {
            return {
                generateContent: mockGenerateContent,
            };
        }
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
                .mockReturnValueOnce(createChainMock([{ organizationId: 'org-1', role: 'admin' }]))
                .mockReturnValueOnce(createChainMock([{ id: 'user-2', email: 'john@example.com' }]))
                .mockReturnValueOnce(createChainMock([]));

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
                .mockReturnValueOnce(createChainMock([{ id: 'member-2', organizationId: 'org-1' }]))
                .mockReturnValueOnce(createChainMock([{ userId: 'admin-1', role: 'admin' }]));

            const formData = new FormData();
            formData.append('memberId', 'member-2');
            formData.append('leagueSlug', 'test-league');

            await removeMemberFromLeague(formData);

            expect(db.delete).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('Course Management', () => {
        beforeEach(() => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
        });

        it('creates a course successfully', async () => {
            const formData = new FormData();
            formData.append('name', 'Test Course');
            formData.append('city', 'Test City');
            formData.append('state', 'TS');
            formData.append('leagueSlug', 'test-league');

            await expect(createCourse(formData)).rejects.toThrow('Redirect to /dashboard/test-league/courses');
            expect(db.insert).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });

        it('updates a course successfully', async () => {
            const formData = new FormData();
            formData.append('courseId', 'course-1');
            formData.append('name', 'Updated Course');
            formData.append('leagueSlug', 'test-league');

            await expect(updateCourse(formData)).rejects.toThrow('Redirect to /dashboard/test-league/courses');
            expect(db.update).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });

        it('deletes a course successfully', async () => {
            const formData = new FormData();
            formData.append('courseId', 'course-1');
            formData.append('leagueSlug', 'test-league');

            await expect(deleteCourse(formData)).rejects.toThrow('Redirect to /dashboard/test-league/courses');
            expect(mockTx.delete).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('Course Scan Actions', () => {
        beforeEach(() => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
        });

        const mockCourseData = {
            name: 'New Course',
            city: 'City',
            state: 'ST',
            tees: [
                {
                    name: 'Blue',
                    par: 72,
                    rating: '72.0',
                    slope: 113,
                    holes: [{ holeNumber: 1, par: 4, handicapIndex: 1 }]
                }
            ]
        };

        it('saves extracted course successfully', async () => {
            await expect(saveExtractedCourseAction(mockCourseData, 'test-league')).rejects.toThrow('Redirect to /dashboard/test-league/courses');
            expect(db.transaction).toHaveBeenCalled();
        });

        it('updates course from scan successfully', async () => {
            await expect(updateCourseFromScanAction('course-1', mockCourseData, 'test-league')).rejects.toThrow('Redirect to /dashboard/test-league/courses');
            expect(db.transaction).toHaveBeenCalled();
        });
    });

    describe('Tee Management', () => {
        it('creates a tee successfully', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
            const formData = new FormData();
            formData.append('courseId', 'course-1');
            formData.append('leagueSlug', 'test-league');
            formData.append('name', 'Blue');
            formData.append('par', '72');
            formData.append('rating', '72.0');
            formData.append('slope', '113');

            await expect(createTee(formData)).rejects.toThrow('Redirect to /dashboard/test-league/courses/course-1');
            expect(db.insert).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('Round Management', () => {
        beforeEach(() => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
        });

        it('creates a round successfully', async () => {
            const formData = new FormData();
            formData.append('seasonId', 'season-1');
            formData.append('courseId', 'course-1');
            formData.append('date', '2024-05-20');
            formData.append('leagueSlug', 'test-league');

            await expect(createRound(formData)).rejects.toThrow('Redirect to /dashboard/test-league/schedule');
            expect(db.insert).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard/test-league/schedule');
        });

        it('updates a round successfully', async () => {
            const formData = new FormData();
            formData.append('roundId', 'round-1');
            formData.append('date', '2024-05-21');
            formData.append('leagueSlug', 'test-league');

            await expect(updateRound(formData)).rejects.toThrow('Redirect to /dashboard/test-league/schedule');
            expect(db.update).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard/test-league/schedule');
        });

        it('deletes a round successfully', async () => {
            const formData = new FormData();
            formData.append('roundId', 'round-1');
            formData.append('leagueSlug', 'test-league');

            await expect(deleteRound(formData)).rejects.toThrow('Redirect to /dashboard/test-league/schedule');
            expect(db.delete).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard/test-league/schedule');
        });
    });

    describe('generateSchedule', () => {
        it('generates a schedule successfully', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);

            // Mock sequence of DB calls inside generateSchedule
            vi.mocked(db.select)
                .mockReturnValueOnce(createChainMock([{ id: 'team-1', name: 'Team 1' }, { id: 'team-2', name: 'Team 2' }])) // teams
                .mockReturnValueOnce(createChainMock([{ id: 'round-1', date: new Date() }])) // rounds
                .mockReturnValueOnce(createChainMock([{ userId: 'u-1' }, { userId: 'u-2' }])) // team members 1
                .mockReturnValueOnce(createChainMock([{ userId: 'u-3' }, { userId: 'u-4' }])); // team members 2

            const formData = new FormData();
            formData.append('seasonId', 'season-1');
            formData.append('leagueSlug', 'test-league');
            // Add some dates to trigger round generation (not strictly necessary for the redirect but good for coverage)
            formData.append('startDate', '2024-05-20');
            formData.append('endDate', '2024-06-20');
            formData.append('frequencyDay', '1');

            await expect(generateSchedule(formData)).rejects.toThrow('Redirect to /dashboard/test-league/schedule');
            expect(db.transaction).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('setupMatch', () => {
        it('sets up a match successfully', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);

            const formData = new FormData();
            formData.append('matchId', 'match-1');
            formData.append('leagueSlug', 'test-league');
            formData.append('player-mp-1-tee', 'tee-1');

            await expect(setupMatch(formData)).rejects.toThrow('Redirect to /dashboard/test-league/scorecard/match-1');
            expect(db.transaction).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });
    });

    describe('scanScorecardAction', () => {
        it('scans a scorecard successfully', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);

            const formData = new FormData();
            const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
            formData.append('scorecard', blob, 'test.jpg');

            const result = await scanScorecardAction(formData);

            expect(result.name).toBe('Mock Course');
            expect(mockGenerateContent).toHaveBeenCalled();
        });
    });

    describe('updateMember', () => {
        it('updates a member successfully', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin-1' } } as never);

            vi.mocked(db.select)
                .mockReturnValueOnce(createChainMock([{ id: 'member-2', organizationId: 'org-1' }]))
                .mockReturnValueOnce(createChainMock([{ userId: 'admin-1', role: 'admin' }]));

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
                .mockReturnValueOnce(createChainMock([{ organizationId: 'org-1', role: 'admin' }]));

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

            vi.mocked(db.select).mockReturnValueOnce(createChainMock([{ id: 'match-1', organizationId: 'org-1' }]));

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
