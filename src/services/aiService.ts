import { GoogleGenerativeAI } from '@google/generative-ai';
import { QuestionType } from '@prisma/client';
import prisma from '../prismaClient.js';
import { AIFeature } from '../types/ai.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

Return ONLY a valid JSON object with no markdown formatting, no code blocks, no extra text.
The object must have this structure:
{
  "suggestedTitle": "A catchy title for the quiz",
  "suggestedDescription": "A brief description of what the quiz covers",
  "suggestedCategory": "A general category name (e.g., History, Science, Math, Entertainment, etc.)",
  "questions": [
    {
      "questionText": "The question text",
      "questionType": "BUTTONS|CHECKBOXES|TYPEANSWER|REORDER|LOCATION",
      "optionsData": {
        "options": [{"text": "...", "isCorrect": true/false, "order": null}]
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
    const model = genAI.getGenerativeModel({ model: modelName });

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

    const data: AIGenerationResponse = JSON.parse(cleaned);

    // Validate and normalize
    return {
        suggestedTitle: data.suggestedTitle || 'New AI Quiz',
        suggestedDescription: data.suggestedDescription || 'Quiz generated by AI',
        suggestedCategory: data.suggestedCategory || 'General',
        questions: (data.questions || []).map(q => ({
            questionText: q.questionText,
            questionType: q.questionType as QuestionType,
            optionsData: q.optionsData,
        })),
        tokenUsage
    };
}

export async function regenerateQuestion(
    originalQuestion: { questionText: string; questionType: QuestionType; optionsData: unknown },
    userFeedback: string | null,
    instruction: string | null
): Promise<GeneratedQuestionData> {
    const modelName = await getModelForFeature('QUESTION_REGENERATION');
    const model = genAI.getGenerativeModel({ model: modelName });

    const typeDesc = QUESTION_TYPE_DESCRIPTIONS[originalQuestion.questionType] || originalQuestion.questionType;

    const prompt = `You are a quiz question generator. Regenerate the following quiz question based on user feedback.

Original question:
- Text: ${originalQuestion.questionText}
- Type: ${originalQuestion.questionType} (${typeDesc})
- Options: ${JSON.stringify(originalQuestion.optionsData)}

${instruction ? `Original context/instruction: ${instruction}` : ''}
${userFeedback ? `User feedback for regeneration: ${userFeedback}` : 'Please generate a completely different question on the same topic.'}

IMPORTANT: Generate the question in the SAME LANGUAGE as the original question.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "questionText": "The new question text",
  "questionType": "${originalQuestion.questionType}",
  "optionsData": { ... }
}

JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    const question: GeneratedQuestionData = JSON.parse(cleaned);
    const tokenUsage = result.response.usageMetadata?.totalTokenCount || 0;

    return {
        questionText: question.questionText,
        questionType: question.questionType as QuestionType,
        optionsData: question.optionsData,
        tokenUsage
    };
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
): Promise<AIGenerationResponse> {
    const modelName = await getModelForFeature('AGENT_CHAT');
    const model = genAI.getGenerativeModel({ model: modelName });
    const chat = model.startChat({
        history: history,
        generationConfig: {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        },
    });

    const systemPrompt = `You are a Quizmon Agent, an expert in creating engaging and educational quizzes.
Your goal is to help the user build a quiz step-by-step or all at once.
You ALWAYS respond with a JSON object representing the CURRENT STATE of the entire quiz.

JSON Structure:
{
  "suggestedTitle": "...",
  "suggestedDescription": "...",
  "suggestedCategory": "...",
  "questions": [
    {
      "questionText": "...",
      "questionType": "BUTTONS|CHECKBOXES|TYPEANSWER|REORDER|LOCATION",
      "optionsData": { ... }
    }
  ]
}

Available Question Types:
${Object.entries(QUESTION_TYPE_DESCRIPTIONS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Rules:
1. If the user asks for new questions, add them to the existing list.
2. If the user asks to modify a question, update it in the list.
3. If the user asks to remove a question, delete it.
4. Keep the output strictly as JSON.
5. Use the same language as the user.`;

    const result = await chat.sendMessage([
        { text: systemPrompt },
        { text: message }
    ]);

    const text = result.response.text();
    const data: AIGenerationResponse = JSON.parse(text);
    const tokenUsage = result.response.usageMetadata?.totalTokenCount || 0;

    data.tokenUsage = tokenUsage;

    return data;
}
