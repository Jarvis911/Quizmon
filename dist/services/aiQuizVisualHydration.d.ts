import type { AIGenerationResponse, GeneratedQuestionData } from './aiService.js';
/**
 * After text questions are persisted, generate optional cover + per-question illustrations
 * and upload to Azure. Failures are logged; the job still completes without images.
 */
export declare function hydrateAiQuizVisuals(jobId: number, generation: AIGenerationResponse): Promise<void>;
/** After regenerateQuestion(), optionally create a new illustration for that row. */
export declare function applyVisualsToRegeneratedRow(generatedQuestionId: number, newQuestion: GeneratedQuestionData): Promise<void>;
