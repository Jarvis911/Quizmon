import { QuestionType } from '@prisma/client';
export declare function getModelForFeature(featureName: string, defaultModel?: string): Promise<string>;
export interface GeneratedQuestionData {
    questionText: string;
    questionType: QuestionType;
    optionsData: Record<string, unknown>;
    tokenUsage?: number;
}
export interface AIQuizMetadata {
    suggestedTitle: string;
    suggestedDescription: string;
    suggestedCategory: string;
}
export interface AIGenerationResponse extends AIQuizMetadata {
    questions: GeneratedQuestionData[];
    tokenUsage?: number;
}
export declare function generateQuestions(instruction: string | null, pdfText: string | null, questionCount: number, questionTypes: QuestionType[]): Promise<AIGenerationResponse>;
export declare function regenerateQuestion(originalQuestion: {
    questionText: string;
    questionType: QuestionType;
    optionsData: unknown;
}, userFeedback: string | null, instruction: string | null): Promise<GeneratedQuestionData>;
export declare function extractPdfText(buffer: Buffer): Promise<string>;
export declare function processAgentChat(history: {
    role: 'user' | 'model';
    parts: {
        text: string;
    }[];
}[], message: string): Promise<AIGenerationResponse>;
