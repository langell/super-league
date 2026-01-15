/**
 * Golf Handicap & Match Play Logic
 * 
 * NOTE: The numeric constants below are defined by the USGA World Handicap System (WHS).
 * These are standard golf scoring values and are intentionally defined as literals.
 */

const STANDARD_SLOPE = 113;
const MAX_HOLES = 18;
const WHS_MAX_AVERAGE_COUNT = 8;

// Score count thresholds for determining number of differentials to average
const SCORE_THRESHOLD_TIER_1 = 3;
const SCORE_THRESHOLD_TIER_2 = 5;
const SCORE_THRESHOLD_TIER_3 = 8;
const SCORE_THRESHOLD_TIER_4 = 11;
const SCORE_THRESHOLD_TIER_5 = 14;
const SCORE_THRESHOLD_TIER_6 = 16;
const SCORE_THRESHOLD_TIER_7 = 18;
const SCORE_THRESHOLD_TIER_8 = 19;

/**
 * Calculates the handicap differential for a single round.
 */
export function calculateDifferential(score: number, rating: number, slope: number): number {
    return (score - rating) * (STANDARD_SLOPE / slope);
}

/**
 * Calculates a Handicap Index from a set of scores.
 * Uses a simplified WHS-like approach (best 8 of last 20).
 */
export function calculateHandicapIndex(differentials: number[], percentage: number = 1.0): number {
    if (differentials.length === 0) return 0;

    // Sort differentials in ascending order
    const sorted = [...differentials].sort((a, b) => a - b);

    let numToAverage = 0;
    const numScores = differentials.length;

    if (numScores <= SCORE_THRESHOLD_TIER_1) numToAverage = 1;
    else if (numScores <= SCORE_THRESHOLD_TIER_2) numToAverage = 1;
    else if (numScores <= SCORE_THRESHOLD_TIER_3) numToAverage = 2;
    else if (numScores <= SCORE_THRESHOLD_TIER_4) numToAverage = 3;
    else if (numScores <= SCORE_THRESHOLD_TIER_5) numToAverage = 4;
    else if (numScores <= SCORE_THRESHOLD_TIER_6) numToAverage = 5;
    else if (numScores <= SCORE_THRESHOLD_TIER_7) numToAverage = 6;
    else if (numScores === SCORE_THRESHOLD_TIER_8) numToAverage = 7;
    else numToAverage = WHS_MAX_AVERAGE_COUNT;

    const bestDifferentials = sorted.slice(0, numToAverage);
    const sum = bestDifferentials.reduce((a, b) => a + b, 0);
    const average = sum / numToAverage;

    return Number((average * percentage).toFixed(1));
}

/**
 * Calculates many strokes a player gets in a Match Play scenario.
 * Usually (Player B Handicap - Player A Handicap)
 */
export function calculateMatchStrokes(handicapA: number, handicapB: number): number {
    return Math.abs(handicapB - handicapA);
}

/**
 * Determines if a player gets a stroke on a specific hole.
 * @param strokesReceived Total strokes the higher handicap player gets
 * @param holeStrokeIndex The difficulty index of the hole (1 to 18)
 * @returns number of strokes received on this hole (can be > 1 if strokesReceived > 18)
 */
export function getStrokesForHole(strokesReceived: number, holeStrokeIndex: number): number {
    const fullCycles = Math.floor(strokesReceived / MAX_HOLES);
    const extraStrokes = strokesReceived % MAX_HOLES;
    return fullCycles + (holeStrokeIndex <= extraStrokes ? 1 : 0);
}

