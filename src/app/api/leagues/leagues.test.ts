import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { db } from '@/db';

// Robust mock for Drizzle's chained select
const createChainMock = (result: unknown[]) => {
    const from = vi.fn().mockResolvedValue(result);
    return { from };
};

// Mock DB
vi.mock('@/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                returning: vi.fn(),
            })),
        })),
    },
}));

describe('Leagues API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET', () => {
        it('returns all leagues successfully', async () => {
            const mockLeagues = [{ id: '1', name: 'League 1', slug: 'l1' }];
            vi.mocked(db.select).mockReturnValueOnce(createChainMock(mockLeagues) as never);

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockLeagues);
        });

        it('returns 500 on db error', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockRejectedValueOnce(new Error('DB Error'))
            } as never);

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to fetch leagues');
        });
    });

    describe('POST', () => {
        it('creates a league successfully', async () => {
            const mockLeague = { id: '1', name: 'New League', slug: 'new-l' };
            vi.mocked(db.insert).mockReturnValueOnce({
                values: vi.fn().mockReturnValueOnce({
                    returning: vi.fn().mockResolvedValueOnce([mockLeague])
                })
            } as never);

            const req = new Request('http://localhost/api/leagues', {
                method: 'POST',
                body: JSON.stringify({ name: 'New League', slug: 'new-l' }),
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockLeague);
        });
    });
});
