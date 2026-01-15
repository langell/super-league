import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCourses, getCourseDetails } from './course-api';

describe('course-api', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        // Clear environment variables if they were set in previous tests
        delete process.env.GOLF_API_KEY;
    });

    describe('mock mode (no API key)', () => {
        it('returns mock results for searchCourses', async () => {
            const results = await searchCourses('Augusta');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].courseName).toBe('Augusta National');
        });

        it('returns mock details for getCourseDetails', async () => {
            const details = await getCourseDetails('mock-1');
            expect(details).not.toBeNull();
            expect(details?.name).toBe('Augusta National');
            expect(details?.tees.length).toBeGreaterThan(0);
        });
    });

    describe('real API mode (with API key)', () => {
        beforeEach(() => {
            process.env.GOLF_API_KEY = 'test-key';
        });

        it('calls the API for searchCourses and returns transformed data', async () => {
            const mockApiResponse = {
                clubs: [{
                    clubName: 'API Club',
                    city: 'API City',
                    state: 'AS',
                    courses: [{ courseID: 'api-1', courseName: 'API Course' }]
                }]
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse
            } as Response);

            const results = await searchCourses('test');
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('api.golfapi.io/clubs?q=test'), expect.any(Object));
            expect(results[0].courseID).toBe('api-1');
            expect(results[0].courseName).toBe('API Course');
        });

        it('calls the API for getCourseDetails and returns transformed data', async () => {
            const mockApiResponse = {
                courseID: 'api-1',
                courseName: 'API Course',
                city: 'API City',
                state: 'AS',
                tees: [{
                    teeName: 'Blue',
                    courseRatingMen: '72.0',
                    slopeMen: '125',
                    parMen: 72,
                    length1: 400
                }],
                parsMen: [4, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
                indexesMen: [1, 3, 5, 7, 9, 11, 13, 15, 17, 2, 4, 6, 8, 10, 12, 14, 16, 18]
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse
            } as Response);

            const details = await getCourseDetails('api-1');
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('api.golfapi.io/courses/api-1'), expect.any(Object));
            expect(details?.name).toBe('API Course');
            expect(details?.tees[0].name).toBe('Blue');
            expect(details?.tees[0].holes[0].par).toBe(4);
            expect(details?.tees[0].holes[0].yardage).toBe(400);
        });

        it('returns null when API call fails', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false
            } as Response);

            const details = await getCourseDetails('api-1');
            expect(details).toBeNull();
        });
    });
});
