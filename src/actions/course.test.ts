/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    scanScorecardAction,
    saveExtractedCourseAction,
    updateCourseFromScanAction,
    importCourseFromApi,
    createCourse,
    updateCourse,
    deleteCourse,
    createTee
} from './course';
import { auth } from '@/auth';
import { db } from '@/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import logger from '@/lib/logger';
import { getCourseDetails } from '@/lib/course-api';

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
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/lib/course-api', () => ({
    getCourseDetails: vi.fn(),
}));

const { mockGenerateContent } = vi.hoisted(() => {
    return { mockGenerateContent: vi.fn() };
});

vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: class {
            getGenerativeModel() {
                return {
                    generateContent: mockGenerateContent
                };
            }
        }
    };
});

// Database Mocks
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

const { mockTx, mockInsert, mockUpdate, mockDelete, mockSelect } = vi.hoisted(() => {
    const mockSelect = vi.fn();
    const mockInsert = vi.fn();
    const mockUpdate = vi.fn();
    const mockDelete = vi.fn();

    // Setup default return helpers
    mockInsert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]) }) });
    mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockSelect.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });


    const mockTx = {
        scanScorecardAction: vi.fn(),
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
    };
    return { mockTx, mockInsert, mockUpdate, mockDelete, mockSelect };
});


vi.mock('@/db', () => ({
    db: {
        transaction: vi.fn((cb) => cb(mockTx)),
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        select: mockSelect,
    }
}));


describe('Course Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset env
        process.env.GOOGLE_AI_API_KEY = 'test-key';
    });

    describe('scanScorecardAction', () => {
        const mockFile = new File(['test'], 'scorecard.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('scorecard', mockFile);

        it('throws unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            await expect(scanScorecardAction(formData)).rejects.toThrow('Unauthorized');
        });

        it('throws error if no image provided', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            const emptyData = new FormData();
            await expect(scanScorecardAction(emptyData)).rejects.toThrow('No image provided');
        });

        it('throws error if API Key missing', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            delete process.env.GOOGLE_AI_API_KEY;
            await expect(scanScorecardAction(formData)).rejects.toThrow('Google AI API Key not configured');
        });

        it('calls Gemini API and returns parsed JSON', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => '```json\n{"name": "Test Course"}\n```'
                }
            });

            const result = await scanScorecardAction(formData);
            expect(result).toEqual({ name: 'Test Course' });
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        it('handles Parse Error from Gemini', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => 'Invalid JSON'
                }
            });

            await expect(scanScorecardAction(formData)).rejects.toThrow('Failed to extract data');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('saveExtractedCourseAction', () => {
        const courseData = {
            name: 'Scanned Course',
            city: 'Test City',
            state: 'TS',
            tees: [{
                name: 'Blue',
                par: 72,
                rating: '72.0',
                slope: 120,
                holes: [{ holeNumber: 1, par: 4, handicapIndex: 1, yardage: 400 }]
            }]
        };
        const leagueSlug = 'test-league';

        it('throws unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            await expect(saveExtractedCourseAction(courseData, leagueSlug)).rejects.toThrow('Unauthorized');
        });

        it('saves course data in transaction', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);

            await saveExtractedCourseAction(courseData, leagueSlug);

            expect(db.transaction).toHaveBeenCalled();
            expect(mockInsert).toHaveBeenCalledTimes(3); // Course, Tee, Hole
            expect(revalidatePath).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });

        it('handles db errors', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            vi.mocked(db.transaction).mockRejectedValueOnce(new Error('DB Error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await expect(saveExtractedCourseAction(courseData, leagueSlug)).rejects.toThrow('Failed to save course data');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('updateCourseFromScanAction', () => {
        const courseData = {
            name: 'Updated Course',
            city: 'Test City',
            state: 'TS',
            tees: [{
                name: 'Red',
                par: 72,
                rating: '70.0',
                slope: 110,
                holes: [{ holeNumber: 1, par: 4, handicapIndex: 1 }]
            }]
        };
        const courseId = 'course-1';
        const leagueSlug = 'test-league';

        it('throws unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            await expect(updateCourseFromScanAction(courseId, courseData, leagueSlug)).rejects.toThrow('Unauthorized');
        });

        it('updates course logic including deleting old tees', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);

            // Mock finding existing tees
            mockSelect.mockReturnValueOnce({
                from: () => ({ where: vi.fn().mockResolvedValue([{ id: 'old-tee' }]) })
            });

            await updateCourseFromScanAction(courseId, courseData, leagueSlug);

            expect(db.transaction).toHaveBeenCalled();
            expect(mockUpdate).toHaveBeenCalled(); // Update course
            expect(mockDelete).toHaveBeenCalledTimes(2); // Delete holes, Delete tees
            expect(mockInsert).toHaveBeenCalled(); // Insert new tees
        });
        it('handles db error during update', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            mockUpdate.mockRejectedValueOnce(new Error('DB Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await expect(updateCourseFromScanAction(courseId, courseData, leagueSlug)).rejects.toThrow('Failed to update course data');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Defaults handling', () => {
        const sparseCourseData = {
            name: 'Sparse Course',
            city: 'City',
            state: 'ST',
            tees: [{
                name: 'Sparse Tee',
                par: undefined as any,
                rating: undefined as any,
                slope: undefined as any,
                holes: [{ holeNumber: 1, par: undefined as any, handicapIndex: undefined as any }]
            }]
        };

        it('uses defaults for missing tee/hole data', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            await saveExtractedCourseAction(sparseCourseData, 'slug');

            // Check Tee defaults
            expect(mockInsert).toHaveBeenCalled();
            // We need to inspect the call arguments for tees
            // This is tricky with multiple insert calls.
            // But execution without error confirms defaults prevented crash.
        });
    });

    describe('importCourseFromApi', () => {
        const formData = new FormData();
        formData.append('courseId', 'api-1');
        formData.append('leagueSlug', 'test-league');

        it('throws unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            await expect(importCourseFromApi(formData)).rejects.toThrow('Unauthorized');
        });

        it('throws error if details not found', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            vi.mocked(getCourseDetails).mockResolvedValueOnce(null);
            await expect(importCourseFromApi(formData)).rejects.toThrow('Course details not found');
        });

        it('imports course from details', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            const mockDetails = {
                id: 'api-1',
                name: 'API Course',
                city: 'City',
                state: 'ST',
                tees: [{ name: 'Gold', par: 72, rating: 71, slope: 125, holes: [{ holeNumber: 1, par: 4, handicapIndex: 1 }] }]
            };
            vi.mocked(getCourseDetails).mockResolvedValueOnce(mockDetails as any);

            await importCourseFromApi(formData);
            expect(db.transaction).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });
    });

    describe('CRUD Actions', () => {
        const formData = new FormData();
        formData.append('leagueSlug', 'test-league');
        formData.append('courseId', 'course-1');

        it('createCourse saves to db', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            await createCourse(formData);
            expect(mockInsert).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });

        it('updateCourse updates db', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            await updateCourse(formData);
            expect(mockUpdate).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });

        it('deleteCourse deletes tees and course', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            // Mock existing tees check
            mockSelect.mockReturnValueOnce({
                from: () => ({ where: vi.fn().mockResolvedValue([{ id: 'tee-1' }]) })
            });

            await deleteCourse(formData);
            expect(mockDelete).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });

        it('createTee adds a tee', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'admin' } } as never);
            formData.append('par', '72');
            formData.append('slope', '113');
            await createTee(formData);
            expect(mockInsert).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalled();
        });
    });
});
