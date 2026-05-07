/**
 * Validates answer payload based on question type.
 * Returns true if the answer format is valid, false otherwise.
 */
export function validateAnswer(question, answer) {
    switch (question.type) {
        case 'BUTTONS':
            if (Number.isInteger(answer) && answer >= 0 && answer < question.options.length) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid button selection' };
        case 'CHECKBOXES':
            if (Array.isArray(answer) &&
                answer.length > 0 &&
                answer.every((a) => Number.isInteger(a) && a >= 0 && a < question.options.length)) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid checkbox selection' };
        case 'REORDER':
            if (Array.isArray(answer) &&
                answer.length === question.options.length &&
                new Set(answer).size === answer.length) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Thứ tự không hợp lệ' };
        case 'TYPEANSWER':
            if (typeof answer === 'string' && answer.trim().length > 0) {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid text answer' };
        case 'LOCATION':
            if (typeof answer === 'object' &&
                answer !== null &&
                'lat' in answer &&
                'lon' in answer &&
                typeof answer.lat === 'number' &&
                typeof answer.lon === 'number') {
                return { isValid: true };
            }
            return { isValid: false, error: 'Invalid location format' };
        default:
            return { isValid: false, error: 'Unsupported question type' };
    }
}
