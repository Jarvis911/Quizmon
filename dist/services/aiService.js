import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const QUESTION_TYPE_DESCRIPTIONS = {
    BUTTONS: 'Multiple choice with exactly one correct answer. Provide 4 options with "text" and "isCorrect" (boolean) fields.',
    CHECKBOXES: 'Multiple choice with one or more correct answers. Provide 4 options with "text" and "isCorrect" (boolean) fields.',
    TYPEANSWER: 'User types the answer. Provide a "correctAnswer" string field.',
    REORDER: 'User reorders items in correct order. Provide 4-6 items with "text" and "order" (number, starting at 1) fields.',
};
function buildPrompt(instruction, pdfText, questionCount, questionTypes) {
    const typeDescriptions = questionTypes
        .map(t => `- ${t}: ${QUESTION_TYPE_DESCRIPTIONS[t] || t}`)
        .join('\n');
    const contextParts = [];
    if (instruction)
        contextParts.push(`User instruction: ${instruction}`);
    if (pdfText)
        contextParts.push(`Content from PDF document:\n---\n${pdfText.substring(0, 30000)}\n---`);
    return `You are a quiz question generator. Generate exactly ${questionCount} quiz questions based on the following context.

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

Return ONLY a valid JSON array with no markdown formatting, no code blocks, no extra text.
Each element must have this exact structure:
{
  "questionText": "The question text",
  "questionType": "BUTTONS|CHECKBOXES|TYPEANSWER|REORDER",
  "optionsData": {
    "options": [{"text": "...", "isCorrect": true/false, "order": null}]
  }
}

For TYPEANSWER type, optionsData should be:
{
  "correctAnswer": "the answer"
}

JSON array:`;
}
export async function generateQuestions(instruction, pdfText, questionCount, questionTypes) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = buildPrompt(instruction, pdfText, questionCount, questionTypes);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    // Clean up response — remove markdown code block if present
    const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
    const questions = JSON.parse(cleaned);
    // Validate and normalize
    return questions.map(q => ({
        questionText: q.questionText,
        questionType: q.questionType,
        optionsData: q.optionsData,
    }));
}
export async function regenerateQuestion(originalQuestion, userFeedback, instruction) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
    const question = JSON.parse(cleaned);
    return {
        questionText: question.questionText,
        questionType: question.questionType,
        optionsData: question.optionsData,
    };
}
export async function extractPdfText(buffer) {
    // pdf-parse is a CommonJS module
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(buffer);
    return data.text;
}
