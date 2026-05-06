import { ImageEffect } from '@prisma/client';
import prisma from '../prismaClient.js';
import { uploadBufferToAzure } from './azureBlobService.js';
import { generateGeminiImageBytes } from './geminiImageApiService.js';
import type { AIGenerationResponse, GeneratedQuestionData } from './aiService.js';

function parseImageEffect(s: string | undefined): ImageEffect {
    const u = (s || 'NONE').toUpperCase();
    if (u === 'BLUR_TO_CLEAR' || u === 'ZOOM_IN' || u === 'ZOOM_OUT') {
        return u as ImageEffect;
    }
    return ImageEffect.NONE;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

const maxQuestionImages = (): number => {
    const n = Number(process.env.AI_QUIZ_MAX_QUESTION_IMAGES ?? 8);
    if (Number.isNaN(n)) return 8;
    return Math.max(0, Math.min(16, n));
};

/**
 * After text questions are persisted, generate optional cover + per-question illustrations
 * and upload to Azure. Failures are logged; the job still completes without images.
 */
export async function hydrateAiQuizVisuals(jobId: number, generation: AIGenerationResponse): Promise<void> {
    if (process.env.AI_QUIZ_GENERATE_IMAGES === 'false') {
        return;
    }
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        console.warn('[hydrateAiQuizVisuals] AZURE_STORAGE_CONNECTION_STRING missing; skipping AI images');
        return;
    }
    if (!process.env.GEMINI_API_KEY) {
        console.warn('[hydrateAiQuizVisuals] GEMINI_API_KEY missing; skipping AI images');
        return;
    }

    const rows = await prisma.aIGeneratedQuestion.findMany({
        where: { jobId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    let coverPrompt = generation.coverImagePrompt?.trim();
    if (!coverPrompt) {
        coverPrompt = `Theme: ${generation.suggestedTitle}. ${generation.suggestedDescription}`.slice(0, 600);
    }

    try {
        const coverBuilt = `Vibrant educational quiz cover / thumbnail, centered composition, modern flat or soft 3D illustration, no readable text or letters, no watermarks: ${coverPrompt}`;
        const coverImg = await generateGeminiImageBytes(coverBuilt);
        if (coverImg) {
            const ext = coverImg.mimeType.includes('png') ? 'png' : 'jpeg';
            const url = await uploadBufferToAzure(
                coverImg.buffer,
                `ai-quiz-${jobId}-cover.${ext}`,
                coverImg.mimeType
            );
            await prisma.aIGenerationJob.update({
                where: { id: jobId },
                data: { suggestedCoverImageUrl: url },
            });
        }
    } catch (e) {
        console.error('[hydrateAiQuizVisuals] cover image failed:', e);
    }

    await sleep(350);

    const cap = maxQuestionImages();
    let used = 0;

    for (let i = 0; i < rows.length && i < generation.questions.length; i++) {
        const row = rows[i];
        const q = generation.questions[i];
        const plan = q.visualPlan;

        if (!plan?.includeImage || !plan.imagePrompt?.trim()) {
            continue;
        }
        if (used >= cap) {
            break;
        }

        try {
            const built = `Clean educational quiz slide illustration, no overlaid text, no watermark, suitable for all ages: ${plan.imagePrompt.trim()}`;
            const img = await generateGeminiImageBytes(built);
            if (img) {
                const ext = img.mimeType.includes('png') ? 'png' : 'jpeg';
                const url = await uploadBufferToAzure(
                    img.buffer,
                    `ai-quiz-${jobId}-q-${row.id}.${ext}`,
                    img.mimeType
                );
                await prisma.aIGeneratedQuestion.update({
                    where: { id: row.id },
                    data: {
                        generatedImageUrl: url,
                        imageEffect: parseImageEffect(plan.imageEffect),
                    },
                });
                used++;
            }
        } catch (e) {
            console.error('[hydrateAiQuizVisuals] question image failed for row', row.id, e);
        }

        await sleep(400);
    }
}

/** After regenerateQuestion(), optionally create a new illustration for that row. */
export async function applyVisualsToRegeneratedRow(
    generatedQuestionId: number,
    newQuestion: GeneratedQuestionData
): Promise<void> {
    if (process.env.AI_QUIZ_GENERATE_IMAGES === 'false') {
        return;
    }
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING || !process.env.GEMINI_API_KEY) {
        await prisma.aIGeneratedQuestion.update({
            where: { id: generatedQuestionId },
            data: { generatedImageUrl: null, imageEffect: ImageEffect.NONE },
        });
        return;
    }

    const plan = newQuestion.visualPlan;
    if (!plan?.includeImage || !plan.imagePrompt?.trim()) {
        await prisma.aIGeneratedQuestion.update({
            where: { id: generatedQuestionId },
            data: { generatedImageUrl: null, imageEffect: ImageEffect.NONE },
        });
        return;
    }

    try {
        const built = `Clean educational quiz slide illustration, no overlaid text, no watermark, suitable for all ages: ${plan.imagePrompt.trim()}`;
        const img = await generateGeminiImageBytes(built);
        if (!img) {
            await prisma.aIGeneratedQuestion.update({
                where: { id: generatedQuestionId },
                data: { generatedImageUrl: null, imageEffect: parseImageEffect(plan.imageEffect) },
            });
            return;
        }
        const ext = img.mimeType.includes('png') ? 'png' : 'jpeg';
        const url = await uploadBufferToAzure(
            img.buffer,
            `ai-quiz-regen-q-${generatedQuestionId}.${ext}`,
            img.mimeType
        );
        await prisma.aIGeneratedQuestion.update({
            where: { id: generatedQuestionId },
            data: {
                generatedImageUrl: url,
                imageEffect: parseImageEffect(plan.imageEffect),
            },
        });
    } catch (e) {
        console.error('[applyVisualsToRegeneratedRow] failed:', e);
        await prisma.aIGeneratedQuestion.update({
            where: { id: generatedQuestionId },
            data: { generatedImageUrl: null, imageEffect: ImageEffect.NONE },
        });
    }
}
