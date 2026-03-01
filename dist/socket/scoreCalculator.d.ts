import { AnswerType, Question } from './types.js';
interface ScoreResult {
    isCorrect: boolean;
    correctLatLon?: {
        latitude?: number;
        longitude?: number;
    };
}
/**
 * Check if an answer is correct and calculate the result.
 */
export declare function checkAnswer(question: Question, answer: AnswerType | undefined): ScoreResult;
/**
 * Calculate points based on remaining time.
 * Faster answers get more points (max 1000).
 */
export declare function calculatePoints(submitRemainingTime: number): number;
export {};
