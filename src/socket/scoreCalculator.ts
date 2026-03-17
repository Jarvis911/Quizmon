import haversine from 'haversine-distance';
import { AnswerType, Question } from './types.js';
import { QUESTION_TIME_LIMIT, LOCATION_RADIUS_1000, LOCATION_RADIUS_750, LOCATION_RADIUS_500, RANGE_CORRECT_THRESHOLD } from './constants.js';

interface ScoreResult {
    isCorrect: boolean;
    score?: number;
    correctLatLon?: { latitude?: number; longitude?: number };
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

        case 'RANGE':
            return {
                isCorrect: question.data
                    ? Math.abs(question.data.correctValue! - (answer as number)) <= RANGE_CORRECT_THRESHOLD
                    : false,
            };

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
                    ? question.data.correctAnswer!.toLowerCase().trim() === (answer as string).toLowerCase().trim()
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
export function calculatePoints(submitRemainingTime: number): number {
    return +(1000 * (submitRemainingTime / QUESTION_TIME_LIMIT)).toFixed(1);
}
