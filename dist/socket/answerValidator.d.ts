import { AnswerType, Question } from './types.js';
/**
 * Validates answer payload based on question type.
 * Returns true if the answer format is valid, false otherwise.
 */
export declare function validateAnswer(question: Question, answer: AnswerType): {
    isValid: boolean;
    error?: string;
};
