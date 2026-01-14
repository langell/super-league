import { describe, it, expect } from 'vitest';
import {
    calculateDifferential,
    calculateHandicapIndex,
    calculateMatchStrokes,
    getStrokesForHole
} from './handicap';

describe('Handicap Logic', () => {
    describe('calculateDifferential', () => {
        it('should correctly calculate differential', () => {
            // (score - rating) * (113 / slope)
            // (80 - 72.0) * (113 / 125) = 8 * 0.904 = 7.232
            const diff = calculateDifferential(80, 72.0, 125);
            expect(diff).toBeCloseTo(7.232, 3);
        });

        it('should handle zero differences', () => {
            const diff = calculateDifferential(72, 72.0, 113);
            expect(diff).toBe(0);
        });
    });

    describe('calculateHandicapIndex', () => {
        it('should return 0 for no differentials', () => {
            expect(calculateHandicapIndex([])).toBe(0);
        });

        it('should use 1 best score when 3 or fewer are provided', () => {
            const differentials = [10.5, 12.0, 15.0];
            expect(calculateHandicapIndex(differentials)).toBe(10.5);
        });

        it('should use correct number of best scores for each bracket', () => {
            // 1-3 scores -> 1
            expect(calculateHandicapIndex([10, 20])).toBe(10);
            // 4-5 scores -> 1
            expect(calculateHandicapIndex([1, 2, 3, 4, 5])).toBe(1);
            // 6-8 scores -> 2
            expect(calculateHandicapIndex([1, 2, 3, 4, 5, 6])).toBe(1.5); // (1+2)/2
            // 9-11 scores -> 3
            expect(calculateHandicapIndex([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(2); // (1+2+3)/3
            // 12-14 scores -> 4
            expect(calculateHandicapIndex([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(2.5); // (1+2+3+4)/4
            // 15-16 scores -> 5
            expect(calculateHandicapIndex([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])).toBe(3); // (1+2+3+4+5)/5
            // 17-18 scores -> 6
            expect(calculateHandicapIndex([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])).toBe(3.5); // (1+2+3+4+5+6)/6
        });

        it('should use 7 best scores when 19 are provided', () => {
            const differentials = Array.from({ length: 19 }, (_, i) => i + 1); // 1 to 19
            // Best 7 are 1, 2, 3, 4, 5, 6, 7. Average: 4.0
            expect(calculateHandicapIndex(differentials)).toBe(4.0);
        });

        it('should use best 8 of 20', () => {
            const differentials = Array.from({ length: 20 }, (_, i) => i + 1); // 1 to 20
            // Best 8 are 1, 2, 3, 4, 5, 6, 7, 8
            // Average: (1+2+3+4+5+6+7+8) / 8 = 36 / 8 = 4.5
            expect(calculateHandicapIndex(differentials)).toBe(4.5);
        });

        it('should apply league percentage adjustment', () => {
            const differentials = [10.0, 10.0, 10.0];
            // Average 10.0, 90% = 9.0
            expect(calculateHandicapIndex(differentials, 0.9)).toBe(9.0);
        });
    });

    describe('calculateMatchStrokes', () => {
        it('should return the absolute difference', () => {
            expect(calculateMatchStrokes(10, 15)).toBe(5);
            expect(calculateMatchStrokes(15, 10)).toBe(5);
        });
    });

    describe('getStrokesForHole', () => {
        it('should give 1 stroke if stroke index is less than or equal to strokes received', () => {
            expect(getStrokesForHole(5, 1)).toBe(1);
            expect(getStrokesForHole(5, 5)).toBe(1);
            expect(getStrokesForHole(5, 6)).toBe(0);
        });

        it('should handle more than 18 strokes', () => {
            // 20 strokes means 1 stroke on all 18, plus 1 extra on index 1 and 2
            expect(getStrokesForHole(20, 1)).toBe(2);
            expect(getStrokesForHole(20, 2)).toBe(2);
            expect(getStrokesForHole(20, 3)).toBe(1);
            expect(getStrokesForHole(20, 18)).toBe(1);
        });
    });
});
