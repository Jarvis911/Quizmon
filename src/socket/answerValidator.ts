import { AnswerType, Question } from './types.js';

/**
 * Validates answer payload based on question type.
 * Returns true if the answer format is valid, false otherwise.
 */
export function validateAnswer(question: Question, answer: AnswerType): { isValid: boolean; error?: string } {
    switch (question.type) {
        case 'BUTTONS':
            if (Number.isInteger(answer) && (answer as number) >= 0 && (answer as number) < question.options.length) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid button selection' };

        case 'CHECKBOXES':
            if (
                Array.isArray(answer) &&
                answer.length > 0 &&
                answer.every((a) => Number.isInteger(a) && (a as number) >= 0 && (a as number) < question.options.length)
            ) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid checkbox selection' };

        case 'RANGE':
            if (
                typeof answer === 'number' &&
                !!question.data &&
                answer >= question.data.minValue! &&
                answer <= question.data.maxValue!
            ) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid range value' };

        case 'REORDER':
            if (
                Array.isArray(answer) &&
                answer.length === question.options.length &&
                new Set(answer as number[]).size === answer.length
            ) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Thứ tự không hợp lệ' };

        case 'TYPEANSWER':
            if (typeof answer === 'string' && answer.trim().length > 0) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid text answer' };

        case 'LOCATION':
            if (
                typeof answer === 'object' &&
                answer !== null &&
                'lat' in answer &&
                'lon' in answer &&
                typeof (answer as { lat: number; lon: number }).lat === 'number' &&
                typeof (answer as { lat: number; lon: number }).lon === 'number'
            ) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid location format' };

        default:
            return { isValid: false, error: 'Unsupported question type' };
    }
}
