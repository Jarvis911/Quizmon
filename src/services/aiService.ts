import { GoogleGenerativeAI } from '@google/generative-ai';
import { QuestionType } from '@prisma/client';
import prisma from '../prismaClient.js';
import { AIFeature } from '../types/ai.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL || 'https://falling-lab-bea2.triho753.workers.dev';

export async function getModelForFeature(featureName: AIFeature | string, defaultModel = 'gemini-2.5-flash'): Promise<string> {
    try {
        const config = await prisma.aIModelConfig.findUnique({
            where: { featureName }
        });
        if (config && config.isActive) {
            return config.modelName;
        }
    } catch (e) {
        console.error('Error fetching AI model config:', e);
    }
    return defaultModel;
}

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

export type AgentChatResponse =
    | { type: 'chat'; message: string; tokenUsage?: number }
    | { type: 'quiz_update'; message: string; suggestedTitle: string; suggestedDescription: string; suggestedCategory: string; questions: GeneratedQuestionData[]; tokenUsage?: number };

export interface ImagePart {
    inlineData: {
        data: string;
        mimeType: string;
    };
}

const QUESTION_TYPE_DESCRIPTIONS: Record<string, string> = {
    BUTTONS: 'Multiple choice with exactly one correct answer. Provide 4 options with "text" and "isCorrect" (boolean) fields.',
    CHECKBOXES: 'Multiple choice with one or more correct answers. Provide 4 options with "text" and "isCorrect" (boolean) fields.',
    TYPEANSWER: 'User types the answer. Provide a "correctAnswer" string field.',
    REORDER: 'User reorders items in correct order. Provide 4-6 items with "text" and "order" (number, starting at 1) fields.',
    LOCATION: 'User picks a location on a map. Provide "correctLatitude" (number) and "correctLongitude" (number) fields.',
};

const VALID_QUESTION_TYPES = new Set<string>(['BUTTONS', 'CHECKBOXES', 'TYPEANSWER', 'REORDER', 'LOCATION']);
const VALID_IMAGE_EFFECTS = new Set<string>(['NONE', 'BLUR_TO_CLEAR', 'ZOOM_IN', 'ZOOM_OUT']);

/** Strip HTML tags to prevent stored XSS from AI-generated or user-supplied strings. */
function sanitizeText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.replace(/<[^>]*>/g, '').trim();
}

/** Recursively sanitize string leaves inside optionsData (option text, correctAnswer, etc.). */
function sanitizeOptionsData(optionsData: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(optionsData)) {
        if (Array.isArray(val)) {
            out[key] = val.map((item) => {
                if (item && typeof item === 'object') {
                    const sanitizedItem: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
                        sanitizedItem[k] = typeof v === 'string' ? sanitizeText(v) : v;
                    }
                    return sanitizedItem;
                }
                return item;
            });
        } else if (typeof val === 'string') {
            out[key] = sanitizeText(val);
        } else {
            out[key] = val;
        }
    }
    return out;
}

function validateOptionsData(questionType: string, optionsData: Record<string, unknown>, index: number): void {
    switch (questionType) {
        case 'BUTTONS':
        case 'CHECKBOXES': {
            if (!Array.isArray(optionsData.options)) {
                throw new Error(`Question ${index} (${questionType}) missing options array`);
            }
            const opts = optionsData.options as Array<Record<string, unknown>>;
            if (opts.length < 2) {
                throw new Error(`Question ${index} (${questionType}) needs at least 2 options`);
            }
            const correctCount = opts.filter((o) => o.isCorrect === true).length;
            if (questionType === 'BUTTONS' && correctCount !== 1) {
                throw new Error(`Question ${index} (BUTTONS) must have exactly 1 correct answer, got ${correctCount}`);
            }
            if (questionType === 'CHECKBOXES' && correctCount < 1) {
                throw new Error(`Question ${index} (CHECKBOXES) must have at least 1 correct answer`);
            }
            break;
        }
        case 'TYPEANSWER': {
            if (typeof optionsData.correctAnswer !== 'string' || !optionsData.correctAnswer.trim()) {
                throw new Error(`Question ${index} (TYPEANSWER) missing correctAnswer`);
            }
            break;
        }
        case 'REORDER': {
            if (!Array.isArray(optionsData.options) || optionsData.options.length < 2) {
                throw new Error(`Question ${index} (REORDER) needs at least 2 items`);
            }
            // Auto-assign order if AI forgot to include it
            const reorderItems = optionsData.options as Array<Record<string, unknown>>;
            reorderItems.forEach((item, i) => {
                if (typeof item.order !== 'number') {
                    item.order = i + 1;
                }
            });
            break;
        }
        case 'LOCATION': {
            if (typeof optionsData.correctLatitude !== 'number' || typeof optionsData.correctLongitude !== 'number') {
                throw new Error(`Question ${index} (LOCATION) missing correctLatitude/correctLongitude numbers`);
            }
            break;
        }
    }
}

function parseVisualPlan(vp: unknown): QuestionVisualPlan | undefined {
    if (!vp || typeof vp !== 'object' || Array.isArray(vp)) return undefined;
    const plan = vp as Record<string, unknown>;
    if (typeof plan.includeImage !== 'boolean') return undefined;
    return {
        includeImage: plan.includeImage,
        imagePrompt: typeof plan.imagePrompt === 'string' ? sanitizeText(plan.imagePrompt) : undefined,
        imageEffect: VALID_IMAGE_EFFECTS.has(plan.imageEffect as string)
            ? (plan.imageEffect as QuestionVisualPlan['imageEffect'])
            : 'NONE',
    };
}

/** Validate structure and sanitize all string fields from a bulk generation response. */
function validateGenerationResponse(data: Record<string, unknown>): AIGenerationResponse {
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('AI response missing or empty questions array');
    }
    const questions: GeneratedQuestionData[] = (data.questions as unknown[]).map((q, index) => {
        if (!q || typeof q !== 'object' || Array.isArray(q)) {
            throw new Error(`Question ${index} is not an object`);
        }
        const qObj = q as Record<string, unknown>;
        if (typeof qObj.questionText !== 'string' || !qObj.questionText.trim()) {
            throw new Error(`Question ${index} missing questionText`);
        }
        if (!VALID_QUESTION_TYPES.has(qObj.questionType as string)) {
            throw new Error(`Question ${index} has invalid questionType: ${qObj.questionType}`);
        }
        if (!qObj.optionsData || typeof qObj.optionsData !== 'object' || Array.isArray(qObj.optionsData)) {
            throw new Error(`Question ${index} missing optionsData object`);
        }
        validateOptionsData(qObj.questionType as string, qObj.optionsData as Record<string, unknown>, index);
        return {
            questionText: sanitizeText(qObj.questionText),
            questionType: qObj.questionType as QuestionType,
            optionsData: sanitizeOptionsData(qObj.optionsData as Record<string, unknown>),
            visualPlan: parseVisualPlan(qObj.visualPlan),
        };
    });
    return {
        suggestedTitle: sanitizeText(data.suggestedTitle) || 'New AI Quiz',
        suggestedDescription: sanitizeText(data.suggestedDescription) || '',
        suggestedCategory: sanitizeText(data.suggestedCategory) || 'General',
        coverImagePrompt: typeof data.coverImagePrompt === 'string' ? sanitizeText(data.coverImagePrompt) : undefined,
        questions,
    };
}

/** Validate structure and sanitize a single regenerated question. */
function validateSingleQuestion(data: Record<string, unknown>): GeneratedQuestionData {
    if (typeof data.questionText !== 'string' || !data.questionText.trim()) {
        throw new Error('Regenerated question missing questionText');
    }
    if (!VALID_QUESTION_TYPES.has(data.questionType as string)) {
        throw new Error(`Regenerated question has invalid questionType: ${data.questionType}`);
    }
    if (!data.optionsData || typeof data.optionsData !== 'object' || Array.isArray(data.optionsData)) {
        throw new Error('Regenerated question missing optionsData object');
    }
    validateOptionsData(data.questionType as string, data.optionsData as Record<string, unknown>, 0);
    return {
        questionText: sanitizeText(data.questionText),
        questionType: data.questionType as QuestionType,
        optionsData: sanitizeOptionsData(data.optionsData as Record<string, unknown>),
        visualPlan: parseVisualPlan(data.visualPlan) ?? { includeImage: false, imageEffect: 'NONE' },
    };
}

function buildPrompt(
    instruction: string | null,
    pdfText: string | null,
    questionCount: number,
    questionTypes: QuestionType[],
    hasImages: boolean = false
): string {
    const typeDescriptions = questionTypes
        .map(t => `- ${t}: ${QUESTION_TYPE_DESCRIPTIONS[t] || t}`)
        .join('\n');

    const contextParts: string[] = [];
    if (instruction) contextParts.push(`User instruction: ${instruction}`);
    if (pdfText) contextParts.push(`Content from PDF document:\n---\n${pdfText.substring(0, 30000)}\n---`);
    if (hasImages) contextParts.push(`I have also uploaded some images (photos of exam papers or documents). Please analyze these images to extract questions.`);

    return `You are a quiz question generator. Generate exactly ${questionCount} quiz questions based on the provided context (instruction, PDF text, or images).

${contextParts.join('\n\n')}

Question types to use (distribute evenly among these types):
${typeDescriptions}

IMPORTANT RULES:
- Generate questions in the SAME LANGUAGE as the context/instruction provided
- Each question must be clear, unambiguous, and educational
- For BUTTONS: exactly one option must have isCorrect=true
- For CHECKBOXES: at least one option must have isCorrect=true
- For TYPEANSWER: provide a concise, specific correct answer
- For REORDER: items should have a logical correct ordering

VISUAL LAYER (for Quizmon — you decide which items deserve imagery and motion):
- Add root field "coverImagePrompt": a short ENGLISH phrase describing an eye-catching quiz cover / thumbnail (theme only; no readable text in the image).
- For EACH question add "visualPlan": {
    "includeImage": boolean — true only when a bold illustration would make the item more fun (e.g. landmarks, animals, experiments, historical scenes). Use false for dry definitions or tiny details.
    "imagePrompt": when includeImage is true, one detailed ENGLISH prompt for a single educational illustration (no overlaid text, no watermarks, family-friendly).
    "imageEffect": one of "NONE", "BLUR_TO_CLEAR", "ZOOM_IN", "ZOOM_OUT" — pick BLUR_TO_CLEAR or ZOOM when a reveal adds drama; otherwise NONE.
  }
- Pick includeImage for roughly 30–50% of questions (not every question). Quality over quantity.

Return ONLY a valid JSON object with no markdown formatting, no code blocks, no extra text.
The object must have this structure:
{
  "suggestedTitle": "A catchy title for the quiz",
  "suggestedDescription": "A brief description of what the quiz covers",
  "suggestedCategory": "A general category name (e.g., History, Science, Math, Entertainment, etc.)",
  "coverImagePrompt": "English cover art brief tied to the quiz theme",
  "questions": [
    {
      "questionText": "The question text",
      "questionType": "BUTTONS|CHECKBOXES|TYPEANSWER|REORDER|LOCATION",
      "optionsData": {
        "options": [{"text": "...", "isCorrect": true/false, "order": null}]
      },
      "visualPlan": {
        "includeImage": true,
        "imagePrompt": "English illustration prompt",
        "imageEffect": "ZOOM_IN"
      }
    },
    ...
  ]
}

for TYPEANSWER type, optionsData should be:
{
  "correctAnswer": "the answer"
}

For LOCATION type, optionsData should be:
{
  "correctLatitude": 10.7769,
  "correctLongitude": 106.7009
}

JSON object:`;
}

export async function generateQuestions(
    instruction: string | null,
    pdfText: string | null,
    imageParts: ImagePart[] | null,
    questionCount: number,
    questionTypes: QuestionType[]
): Promise<AIGenerationResponse> {
    const modelName = await getModelForFeature('QUIZ_GENERATION');
    const model = genAI.getGenerativeModel(
        { model: modelName },
        { baseUrl: GEMINI_PROXY_URL }
    );

    const hasImages = !!(imageParts && imageParts.length > 0);
    const prompt = buildPrompt(instruction, pdfText, questionCount, questionTypes, hasImages);

    const contentParts: (string | ImagePart)[] = [prompt];
    if (hasImages && imageParts) {
        contentParts.push(...imageParts);
    }

    const result = await model.generateContent(contentParts);
    const response = result.response;
    const text = response.text();
    const tokenUsage = response.usageMetadata?.totalTokenCount || 0;

    // Clean up response — remove markdown code block if present
    const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    const data = JSON.parse(cleaned) as Record<string, unknown>;
    const validated = validateGenerationResponse(data);
    return { ...validated, tokenUsage };
}

export async function regenerateQuestion(
    originalQuestion: { questionText: string; questionType: QuestionType; optionsData: unknown },
    userFeedback: string | null,
    instruction: string | null
): Promise<GeneratedQuestionData> {
    const modelName = await getModelForFeature('QUESTION_REGENERATION');
    const model = genAI.getGenerativeModel(
        { model: modelName },
        { baseUrl: GEMINI_PROXY_URL }
    );

    const typeDesc = QUESTION_TYPE_DESCRIPTIONS[originalQuestion.questionType] || originalQuestion.questionType;

    const prompt = `You are a quiz question generator. Regenerate the following quiz question based on user feedback.

Original question:
- Text: ${originalQuestion.questionText}
- Type: ${originalQuestion.questionType} (${typeDesc})
- Options: ${JSON.stringify(originalQuestion.optionsData)}

${instruction ? `Original context/instruction: ${instruction}` : ''}
${userFeedback ? `User feedback for regeneration: ${userFeedback}` : 'Please generate a completely different question on the same topic.'}

IMPORTANT: Generate the question in the SAME LANGUAGE as the original question.

Also return a fresh "visualPlan" (same rules as bulk quiz generation): includeImage, imagePrompt in ENGLISH when true, imageEffect in NONE|BLUR_TO_CLEAR|ZOOM_IN|ZOOM_OUT.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "questionText": "The new question text",
  "questionType": "${originalQuestion.questionType}",
  "optionsData": { ... },
  "visualPlan": { "includeImage": false, "imageEffect": "NONE" }
}

JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    const raw = JSON.parse(cleaned) as Record<string, unknown>;
    const validated = validateSingleQuestion(raw);
    const tokenUsage = result.response.usageMetadata?.totalTokenCount || 0;
    return { ...validated, tokenUsage };
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
    // pdf-parse is a CommonJS module
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(buffer);
    return data.text;
}

export async function processAgentChat(
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    message: string
): Promise<AgentChatResponse> {
    const modelName = await getModelForFeature('AGENT_CHAT');
    const model = genAI.getGenerativeModel(
        { model: modelName },
        { baseUrl: GEMINI_PROXY_URL }
    );
    const chat = model.startChat({
        history: history,
        generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        },
    });

    const systemPrompt = `You are Quizmon Agent, a friendly and helpful AI assistant specialized in creating educational quizzes.
You can chat naturally with users AND help them build quizzes step by step.
Always respond with valid JSON in one of the two shapes below.

━━━ RESPONSE SHAPES ━━━

Shape A — Conversational (greetings, suggestions, clarifications, general questions):
{
  "type": "chat",
  "message": "Your friendly response in the user's language"
}

Shape B — Quiz operations (create / add / modify / remove questions):
{
  "type": "quiz_update",
  "message": "Friendly summary of what you did (in the user's language)",
  "suggestedTitle": "Quiz title",
  "suggestedDescription": "Short description",
  "suggestedCategory": "Category",
  "questions": [ ... full current quiz state ... ]
}

━━━ QUESTION TYPES & optionsData FORMAT ━━━

BUTTONS — single correct answer (exactly 1 isCorrect: true):
  "optionsData": { "options": [{"text": "...", "isCorrect": true}, {"text": "...", "isCorrect": false}, ...] }
  → Must have exactly 4 options, exactly 1 with isCorrect: true

CHECKBOXES — one or more correct answers:
  "optionsData": { "options": [{"text": "...", "isCorrect": true}, {"text": "...", "isCorrect": false}, ...] }
  → Must have exactly 4 options, at least 1 with isCorrect: true

TYPEANSWER — user types the answer:
  "optionsData": { "correctAnswer": "exact answer string" }

REORDER — user reorders items into correct sequence:
  "optionsData": { "options": [{"text": "First step", "order": 1}, {"text": "Second step", "order": 2}, ...] }
  → "order" is the CORRECT POSITION (1 = first, 2 = second...). This field IS the answer and is REQUIRED for every item.
  → Provide 4-6 items.

LOCATION — user picks a map location:
  "optionsData": { "correctLatitude": 10.7769, "correctLongitude": 106.7009 }

━━━ RULES ━━━
1. Use Shape A when: user greets you, makes small talk, asks general questions, requests suggestions, or you need clarification.
2. Use Shape B when: user wants to create, add, modify, or remove quiz questions — always return the FULL current quiz state.
3. When updating, keep all existing questions unless the user explicitly asks to remove them.
4. Self-review before responding: verify every question has correct optionsData format.
5. For REORDER: EVERY item MUST have a numeric "order" field — missing "order" = broken question.
6. Use the same language as the user.`;

    const result = await chat.sendMessage([
        { text: systemPrompt },
        { text: message }
    ]);

    const text = result.response.text();
    const tokenUsage = result.response.usageMetadata?.totalTokenCount || 0;

    let raw: Record<string, unknown>;
    try {
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        raw = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
        // If JSON parse fails, treat as a plain chat response
        return { type: 'chat', message: text.trim() || 'Xin chào! Mình có thể giúp gì cho bạn?', tokenUsage };
    }

    // Shape A: conversational response
    if (raw.type === 'chat') {
        return {
            type: 'chat',
            message: typeof raw.message === 'string' && raw.message.trim()
                ? raw.message.trim()
                : 'Mình hiểu rồi! Bạn cần mình giúp gì thêm?',
            tokenUsage,
        };
    }

    // Shape B: quiz update (or legacy format without type field)
    const validated = validateGenerationResponse(raw);
    const agentMessage = typeof raw.message === 'string' && raw.message.trim()
        ? raw.message.trim()
        : `Mình đã cập nhật quiz "${validated.suggestedTitle}" (${validated.questions.length} câu). Bạn muốn thêm/sửa/xoá gì tiếp?`;

    return {
        type: 'quiz_update',
        message: agentMessage,
        suggestedTitle: validated.suggestedTitle,
        suggestedDescription: validated.suggestedDescription,
        suggestedCategory: validated.suggestedCategory,
        questions: validated.questions,
        tokenUsage,
    };
}

// ─── Student List OCR ────────────────────────────────────────────────────────

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
export async function extractStudentList(
    content: string | null,
    imageBuffer: Buffer | null = null,
    imageMimeType = 'image/jpeg'
): Promise<ExtractedStudent[]> {
    const modelName = await getModelForFeature('STUDENT_LIST_OCR', 'gemini-2.5-flash');
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemPrompt = `You are a Vietnamese school student list extractor.
Your job is to read the provided content (document text or image) and extract all student names.

Return ONLY a valid JSON array, no markdown, no extra text. Example:
[
  {"name": "Nguyễn Văn An", "studentCode": "SV001", "email": "an@school.edu.vn"},
  {"name": "Trần Thị Bình"},
  {"name": "Lê Hoàng Cường", "studentCode": "22001234"}
]

Rules:
- Extract every person's full name you can find
- Include "studentCode" only if a student ID/code is clearly associated with the name
- Include "email" only if an email is clearly associated with the name
- Ignore page headers, footer, dates, teacher names, class names
- Names must be at least 2 words long
- Return [] if no names found`;

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
        { text: systemPrompt }
    ];

    if (content) {
        parts.push({ text: `\n\nDocument content:\n---\n${content.slice(0, 30000)}\n---` });
    }
    if (imageBuffer) {
        parts.push({
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: imageMimeType
            }
        });
    }

    const result = await model.generateContent(parts);
    const raw = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((s: any) => typeof s.name === 'string' && s.name.trim().length > 3);
    } catch {
        return [];
    }
}
