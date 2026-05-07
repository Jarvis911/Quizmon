import { QuestionType } from '@prisma/client';
import { AIFeature } from '../types/ai.js';
export declare function getModelForFeature(featureName: AIFeature | string, defaultModel?: string): Promise<string>;
/** Per-question visual plan: a separate image model will render `imagePrompt` when includeImage is true. */
export interface QuestionVisualPlan {
    includeImage: boolean;
    imagePrompt?: string;
    imageEffect?: 'NONE' | 'BLUR_TO_CLEAR' | 'ZOOM_IN' | 'ZOOM_OUT';
}
export interface GeneratedQuestionData {
    questionText: string;
    questionType: QuestionType;
    optionsData: Record<string, unknown>;
    visualPlan?: QuestionVisualPlan;
    tokenUsage?: number;
}
export interface AIQuizMetadata {
    suggestedTitle: string;
    suggestedDescription: string;
    suggestedCategory: string;
    /** English prompt phrase for the quiz cover image (optional; server can fall back to title+description). */
    coverImagePrompt?: string;
}
export interface AIGenerationResponse extends AIQuizMetadata {
    questions: GeneratedQuestionData[];
    tokenUsage?: number;
}
export interface ImagePart {
    inlineData: {
        data: string;
        mimeType: string;
    };
}
export declare function generateQuestions(instruction: string | null, pdfText: string | null, imageParts: ImagePart[] | null, questionCount: number, questionTypes: QuestionType[]): Promise<AIGenerationResponse>;
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
export interface ExtractedStudent {
    name: string;
    studentCode?: string;
    email?: string;
}
/**
 * Use Gemini to extract a student list from text content or an image buffer.
 * @param content  Either a plain-text string (from PDF/Word/Excel) or null for image-only mode
 * @param imageBuffer  Raw image bytes, or null for text-only mode
 * @param imageMimeType  MIME type of the image
 */
export declare function extractStudentList(content: string | null, imageBuffer?: Buffer | null, imageMimeType?: string): Promise<ExtractedStudent[]>;
