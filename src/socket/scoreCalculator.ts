import haversine from 'haversine-distance';
import { AnswerType, Question } from './types.js';
import { LOCATION_RADIUS_1000, LOCATION_RADIUS_750, LOCATION_RADIUS_500 } from './constants.js';

interface ScoreResult {
    isCorrect: boolean;
    score?: number;
    correctLatLon?: { latitude?: number; longitude?: number };
}

export type TypeAnswerVerdict = 'correct' | 'near' | 'wrong';

const normalizeTextAnswer = (s: string) => {
    return s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) dp[j] = j;
    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = dp[j];
            dp[j] = Math.min(
                dp[j] + 1,
                dp[j - 1] + 1,
                prev + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
            prev = tmp;
        }
    }
    return dp[b.length];
};

export function getTypeAnswerVerdict(correctAnswer: string | undefined | null, answer: string): TypeAnswerVerdict {
    const ca = normalizeTextAnswer(correctAnswer || '');
    const ua = normalizeTextAnswer(answer);
    if (!ca || !ua) return 'wrong';
    if (ua === ca) return 'correct';

    const dist = levenshtein(ua, ca);
    const maxLen = Math.max(ua.length, ca.length);
    const similarity = maxLen === 0 ? 0 : 1 - dist / maxLen;

    const nearByDistance = dist <= (maxLen >= 12 ? 2 : 1);
    const nearBySimilarity = similarity >= (maxLen >= 12 ? 0.82 : 0.88);
    return nearByDistance || nearBySimilarity ? 'near' : 'wrong';
}

/**
 * Check if an answer is correct and calculate the result.
 */
export function checkAnswer(question: Question, answer: AnswerType | undefined): ScoreResult {
    if (answer === undefined) {
        return { isCorrect: false };
    }

    switch (question.type) {
        case 'BUTTONS':
            // Client sends selected index (idx)
            return { isCorrect: !!question.options[answer as number]?.isCorrect };

        case 'CHECKBOXES': {
            // Client sends array of selected indices: [0, 2]
            const selectedIndices = answer as number[];
            return {
                isCorrect: question.options.every((opt, i) => {
                    const isSelected = selectedIndices.includes(i);
                    return (opt.isCorrect ?? false) === isSelected;
                }),
            };
        }

        case 'REORDER': {
            // Client sends array of IDs in new order: [id1, id2, id3]
            const orderedIds = answer as number[];
            // Correct order should be sorting options by their "order" field
            const correctOrderIds = [...question.options]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((o) => o.id);

            return {
                isCorrect: orderedIds.length === correctOrderIds.length &&
                    orderedIds.every((id, i) => id === correctOrderIds[i]),
            };
        }

        case 'TYPEANSWER':
            return {
                isCorrect: question.data
                    ? getTypeAnswerVerdict(question.data.correctAnswer, answer as string) === 'correct'
                    : false,
            };

        case 'LOCATION': {
            if (question.data) {
                const correctLatLon = {
                    latitude: +question.data.correctLatitude!,
                    longitude: +question.data.correctLongitude!,
                };
                const userAns = {
                    latitude: +(answer as { lat: number; lon: number }).lat,
                    longitude: +(answer as { lat: number; lon: number }).lon,
                };
                const distance = haversine(correctLatLon, userAns);

                // Use custom radii if available, else defaults
                const r1000 = question.data.radius1000 || LOCATION_RADIUS_1000;
                const r750 = question.data.radius750 || LOCATION_RADIUS_750;
                const r500 = question.data.radius500 || LOCATION_RADIUS_500;

                let scoreLevel = 0;
                if (distance <= r1000) scoreLevel = 1000;
                else if (distance <= r750) scoreLevel = 750;
                else if (distance <= r500) scoreLevel = 500;

                return {
                    isCorrect: scoreLevel > 0,
                    correctLatLon,
                    score: scoreLevel // Add score to result for Location
                };
            }
            return { isCorrect: false };
        }

        default:
            return { isCorrect: false };
    }
}

/**
 * Calculate points based on remaining time.
 * Faster answers get more points (max 1000).
 */
export function calculatePoints(submitRemainingTime: number, timePerQuestion: number): number {
    const timeLimit = timePerQuestion || 30; // Safety fallback
    const points = Math.floor(1000 * (submitRemainingTime / timeLimit));
    return Math.max(0, Math.min(1000, points));
}
