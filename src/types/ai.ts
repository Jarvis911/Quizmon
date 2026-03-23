export const AI_FEATURES = [
    'QUIZ_GENERATION',
    'QUESTION_REGENERATION',
    'AGENT_CHAT'
] as const;

export type AIFeature = (typeof AI_FEATURES)[number];

export const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];
