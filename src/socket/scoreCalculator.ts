import haversine from 'haversine-distance';
import { AnswerType, Question } from './types.js';
import { QUESTION_TIME_LIMIT, LOCATION_CORRECT_DISTANCE_THRESHOLD, RANGE_CORRECT_THRESHOLD } from './constants.js';

interface ScoreResult {
    isCorrect: boolean;
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
            return { isCorrect: !!question.options[answer as number]?.isCorrect };

        case 'CHECKBOXES':
            return {
                isCorrect: (answer as boolean[]).every((a, i) => (question.options[i].isCorrect ?? false) === a),
            };

        case 'RANGE':
            return {
                isCorrect: question.range
                    ? Math.abs(question.range.correctValue - (answer as number)) <= RANGE_CORRECT_THRESHOLD
                    : false,
            };

        case 'REORDER':
            return {
                isCorrect: (answer as number[]).every((a, i) => a === question.options[i]?.order),
            };

        case 'TYPEANSWER':
            return {
                isCorrect: question.typeAnswer
                    ? question.typeAnswer.correctAnswer.toLowerCase() === (answer as string).toLowerCase()
                    : false,
            };

        case 'LOCATION': {
            if (question.location) {
                const correctLatLon = {
                    latitude: +question.location.correctLatitude,
                    longitude: +question.location.correctLongitude,
                };
                const userAns = {
                    latitude: +(answer as { lat: number; lon: number }).lat,
                    longitude: +(answer as { lat: number; lon: number }).lon,
                };
                const distance = haversine(correctLatLon, userAns);
                return {
                    isCorrect: distance <= LOCATION_CORRECT_DISTANCE_THRESHOLD,
                    correctLatLon,
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
