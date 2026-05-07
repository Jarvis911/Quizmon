import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../prismaClient.js';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL || 'https://falling-lab-bea2.triho753.workers.dev';
export async function getModelForFeature(featureName, defaultModel = 'gemini-2.5-flash') {
    try {
        const config = await prisma.aIModelConfig.findUnique({
            where: { featureName }
        });
        if (config && config.isActive) {
            return config.modelName;
        }
    }
    catch (e) {
        console.error('Error fetching AI model config:', e);
    }
    return defaultModel;
}
const QUESTION_TYPE_DESCRIPTIONS = {
    BUTTONS: 'Multiple choice with exactly one correct answer. Provide 4 options with "text" and "isCorrect" (boolean) fields.',
    CHECKBOXES: 'Multiple choice with one or more correct answers. Provide 4 options with "text" and "isCorrect" (boolean) fields.',
    TYPEANSWER: 'User types the answer. Provide a "correctAnswer" string field.',
    REORDER: 'User reorders items in correct order. Provide 4-6 items with "text" and "order" (number, starting at 1) fields.',
    LOCATION: 'User picks a location on a map. Provide "correctLatitude" (number) and "correctLongitude" (number) fields.',
};
function buildPrompt(instruction, pdfText, questionCount, questionTypes, hasImages = false) {
    const typeDescriptions = questionTypes
        .map(t => `- ${t}: ${QUESTION_TYPE_DESCRIPTIONS[t] || t}`)
        .join('\n');
    const contextParts = [];
    if (instruction)
        contextParts.push(`User instruction: ${instruction}`);
    if (pdfText)
        contextParts.push(`Content from PDF document:\n---\n${pdfText.substring(0, 30000)}\n---`);
    if (hasImages)
        contextParts.push(`I have also uploaded some images (photos of exam papers or documents). Please analyze these images to extract questions.`);
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
export async function generateQuestions(instruction, pdfText, imageParts, questionCount, questionTypes) {
    const modelName = await getModelForFeature('QUIZ_GENERATION');
    const model = genAI.getGenerativeModel({ model: modelName }, { baseUrl: GEMINI_PROXY_URL });
    const hasImages = !!(imageParts && imageParts.length > 0);
    const prompt = buildPrompt(instruction, pdfText, questionCount, questionTypes, hasImages);
    const contentParts = [prompt];
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
    const data = JSON.parse(cleaned);
    const rawQuestions = (data.questions || []);
    // Validate and normalize
    return {
        suggestedTitle: data.suggestedTitle || 'New AI Quiz',
        suggestedDescription: data.suggestedDescription || 'Quiz generated by AI',
        suggestedCategory: data.suggestedCategory || 'General',
        coverImagePrompt: typeof data.coverImagePrompt === 'string' ? data.coverImagePrompt : undefined,
        questions: rawQuestions.map((q) => {
            const vp = q.visualPlan;
            const visualPlan = vp && typeof vp.includeImage === 'boolean'
                ? {
                    includeImage: vp.includeImage,
                    imagePrompt: typeof vp.imagePrompt === 'string' ? vp.imagePrompt : undefined,
                    imageEffect: vp.imageEffect,
                }
                : undefined;
            return {
                questionText: q.questionText,
                questionType: q.questionType,
                optionsData: q.optionsData,
                visualPlan,
            };
        }),
        tokenUsage
    };
}
export async function regenerateQuestion(originalQuestion, userFeedback, instruction) {
    const modelName = await getModelForFeature('QUESTION_REGENERATION');
    const model = genAI.getGenerativeModel({ model: modelName }, { baseUrl: GEMINI_PROXY_URL });
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
    const question = JSON.parse(cleaned);
    const vp = question.visualPlan;
    const visualPlan = vp && typeof vp.includeImage === 'boolean'
        ? {
            includeImage: vp.includeImage,
            imagePrompt: typeof vp.imagePrompt === 'string' ? vp.imagePrompt : undefined,
            imageEffect: vp.imageEffect,
        }
        : { includeImage: false, imageEffect: 'NONE' };
    const tokenUsage = result.response.usageMetadata?.totalTokenCount || 0;
    return {
        questionText: question.questionText,
        questionType: question.questionType,
        optionsData: question.optionsData,
        visualPlan,
        tokenUsage
    };
}
export async function extractPdfText(buffer) {
    // pdf-parse is a CommonJS module
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(buffer);
    return data.text;
}
export async function processAgentChat(history, message) {
    const modelName = await getModelForFeature('AGENT_CHAT');
    const model = genAI.getGenerativeModel({ model: modelName }, { baseUrl: GEMINI_PROXY_URL });
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
    const data = JSON.parse(text);
    const tokenUsage = result.response.usageMetadata?.totalTokenCount || 0;
    data.tokenUsage = tokenUsage;
    return data;
}
/**
 * Use Gemini to extract a student list from text content or an image buffer.
 * @param content  Either a plain-text string (from PDF/Word/Excel) or null for image-only mode
 * @param imageBuffer  Raw image bytes, or null for text-only mode
 * @param imageMimeType  MIME type of the image
 */
export async function extractStudentList(content, imageBuffer = null, imageMimeType = 'image/jpeg') {
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
    const parts = [
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
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((s) => typeof s.name === 'string' && s.name.trim().length > 3);
    }
    catch {
        return [];
    }
}
