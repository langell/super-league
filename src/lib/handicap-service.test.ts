import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updatePlayerHandicap } from './handicap-service';
import { db } from '@/db';

describe('Handicap Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not update if no scores are found', async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue([]),
        } as never);

        const result = await updatePlayerHandicap('user-1', 'org-1');
        expect(result).toBeUndefined();
    });

    it('should update handicap if enough scores are found', async () => {
        const mockScores = [
            { grossScore: 80, scoreOverride: null, rating: '72.0', slope: 113 },
            { grossScore: 82, scoreOverride: null, rating: '72.0', slope: 113 },
            { grossScore: 85, scoreOverride: null, rating: '72.0', slope: 113 },
        ];
        const mockLeague = [{ handicapPercentage: '1.00', minScoresToCalculate: 3 }];

        // Mock for user scores (first select)
        const selectScoresMock = {
            from: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue(mockScores),
        };

        // Mock for league settings (second select)
        const selectLeagueMock = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(mockLeague),
        };

        vi.mocked(db.select)
            .mockReturnValueOnce(selectScoresMock as never)
            .mockReturnValueOnce(selectLeagueMock as never);

        vi.mocked(db.update).mockReturnValue({
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue({})
        } as never);

        const result = await updatePlayerHandicap('user-1', 'org-1');

        expect(result).toBe(8.0);
        expect(db.update).toHaveBeenCalled();
    });

    it('should use scoreOverride if present', async () => {
        const mockScores = [
            { grossScore: 100, scoreOverride: 80, rating: '72.0', slope: 113 },
            { grossScore: 82, scoreOverride: null, rating: '72.0', slope: 113 },
            { grossScore: 85, scoreOverride: null, rating: '72.0', slope: 113 },
        ];
        const mockLeague = [{ handicapPercentage: '1.00', minScoresToCalculate: 3 }];

        const selectScoresMock = {
            from: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue(mockScores),
        };

        const selectLeagueMock = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(mockLeague),
        };

        vi.mocked(db.select)
            .mockReturnValueOnce(selectScoresMock as never)
            .mockReturnValueOnce(selectLeagueMock as never);

        vi.mocked(db.update).mockReturnValue({
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue({})
        } as never);

        const result = await updatePlayerHandicap('user-1', 'org-1');

        // Uses 80 instead of 100.
        expect(result).toBe(8.0);
    });

    it('should return undefined if league not found', async () => {
        vi.mocked(db.select)
            .mockReturnValueOnce({
                from: vi.fn().mockReturnThis(),
                innerJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue([{ grossScore: 80 }])
            } as never)
            .mockReturnValueOnce({
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            } as never);

        const result = await updatePlayerHandicap('user-1', 'org-1');
        expect(result).toBeUndefined();
    });

    it('should return undefined if not enough scores are found based on league rules', async () => {
        vi.mocked(db.select)
            .mockReturnValueOnce({
                from: vi.fn().mockReturnThis(),
                innerJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue([{ grossScore: 80 }]) // Only 1 score
            } as never)
            .mockReturnValueOnce({
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([{ minScoresToCalculate: 3 }])
            } as never);

        const result = await updatePlayerHandicap('user-1', 'org-1');
        expect(result).toBeUndefined();
    });
});
