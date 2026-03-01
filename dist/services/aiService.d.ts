import { QuestionType } from '@prisma/client';
export interface GeneratedQuestionData {
    questionText: string;
    questionType: QuestionType;
    optionsData: Record<string, unknown>;
}
export declare function generateQuestions(instruction: string | null, pdfText: string | null, questionCount: number, questionTypes: QuestionType[]): Promise<GeneratedQuestionData[]>;
export declare function regenerateQuestion(originalQuestion: {
    questionText: string;
    questionType: QuestionType;
    optionsData: unknown;
}, userFeedback: string | null, instruction: string | null): Promise<GeneratedQuestionData>;
export declare function extractPdfText(buffer: Buffer): Promise<string>;
