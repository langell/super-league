import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { db } from '@/db';
import { updatePlayerHandicap } from '@/lib/handicap-service';

// Mock DB
vi.mock('@/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
    },
}));

// Mock Handicap Service
vi.mock('@/lib/handicap-service', () => ({
    updatePlayerHandicap: vi.fn(),
}));

// Mock auth-utils
vi.mock('@/lib/auth-utils', () => ({
    validateMemberRole: vi.fn(),
}));

// Helper for chained select
const createSelectMock = (result: unknown[]) => {
    const limit = vi.fn().mockResolvedValue(result);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    return { from };
};

describe('Scores API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST', () => {
        const validPayload = {
            matchPlayerId: 'mp-1',
            holeId: 'hole-1',
            grossScore: 4,
            organizationId: 'org-1',
        };

        it('saves a new score successfully', async () => {
            vi.mocked(db.select).mockReturnValueOnce(createSelectMock([]) as never);
            const mockValidate = await import('@/lib/auth-utils');
            vi.mocked(mockValidate.validateMemberRole).mockResolvedValueOnce({
                session: { user: { id: 'user-1' } },
                membership: { role: 'player' }
            } as never);

            vi.mocked(db.insert).mockReturnValueOnce({
                values: vi.fn().mockReturnValueOnce({
                    returning: vi.fn().mockResolvedValueOnce([{ id: 'score-1' }])
                })
            } as never);

            const req = new Request('http://localhost/api/scores', {
                method: 'POST',
                body: JSON.stringify(validPayload),
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.id).toBe('score-1');
            expect(updatePlayerHandicap).toHaveBeenCalledWith('user-1', 'org-1');
        });

        it('updates an existing score successfully', async () => {
            vi.mocked(db.select).mockReturnValueOnce(createSelectMock([{ id: 'existing-1' }]) as never);
            const mockValidate = await import('@/lib/auth-utils');
            vi.mocked(mockValidate.validateMemberRole).mockResolvedValueOnce({
                session: { user: { id: 'user-1' } },
                membership: { role: 'player' }
            } as never);

            vi.mocked(db.update).mockReturnValueOnce({
                set: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockReturnValueOnce({
                        returning: vi.fn().mockResolvedValueOnce([{ id: 'existing-1' }])
                    })
                })
            } as never);

            const req = new Request('http://localhost/api/scores', {
                method: 'POST',
                body: JSON.stringify(validPayload),
            });

            const response = await POST(req);
            expect(response.status).toBe(200);
            expect(db.update).toHaveBeenCalled();
        });

        it('returns 400 if fields are missing', async () => {
            const req = new Request('http://localhost/api/scores', {
                method: 'POST',
                body: JSON.stringify({ matchPlayerId: 'mp-1' }),
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing required fields');
        });

        it('returns 500 on server error', async () => {
            const mockValidate = await import('@/lib/auth-utils');
            vi.mocked(mockValidate.validateMemberRole).mockResolvedValueOnce({
                session: { user: { id: 'user-1' } },
                membership: { role: 'player' }
            } as never);

            vi.mocked(db.select).mockImplementationOnce(() => { throw new Error('DB Error'); });

            const req = new Request('http://localhost/api/scores', {
                method: 'POST',
                body: JSON.stringify(validPayload),
            });

            const response = await POST(req);
            expect(response.status).toBe(500);
        });
    });
});
