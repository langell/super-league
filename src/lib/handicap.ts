/**
 * Golf Handicap & Match Play Logic
 */

/**
 * Calculates the handicap differential for a single round.
 */
export function calculateDifferential(score: number, rating: number, slope: number): number {
    return (score - rating) * (113 / slope);
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

    if (numScores <= 3) numToAverage = 1;
    else if (numScores <= 5) numToAverage = 1;
    else if (numScores <= 8) numToAverage = 2;
    else if (numScores <= 11) numToAverage = 3;
    else if (numScores <= 14) numToAverage = 4;
    else if (numScores <= 16) numToAverage = 5;
    else if (numScores <= 18) numToAverage = 6;
    else if (numScores === 19) numToAverage = 7;
    else numToAverage = 8;

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
    const fullCycles = Math.floor(strokesReceived / 18);
    const extraStrokes = strokesReceived % 18;
    return fullCycles + (holeStrokeIndex <= extraStrokes ? 1 : 0);
}
// husky test
