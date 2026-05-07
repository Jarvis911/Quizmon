import { Request, Response } from 'express';
import { uploadBufferToAzure } from '../services/azureBlobService.js';
import { generateGeminiImageBytes } from '../services/geminiImageApiService.js';
import { trackUsage, checkLimit } from '../services/usageService.js';
import { FeatureKey } from '@prisma/client';

export const generateImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức để sử dụng tính năng này.' });
            return;
        }

        const {
            context,
            prompt,
            style,
            imageEffect,
        } = req.body as {
            context?: string;
            prompt?: string;
            style?: string;
            imageEffect?: string;
        };

        if (!context && !prompt) {
            res.status(400).json({ message: 'Cần cung cấp context hoặc prompt để tạo ảnh.' });
            return;
        }

        // Check dedicated image generation quota (separate from AI text quota)
        const { allowed, limit, current } = await checkLimit(
            orgId,
            'ai_image_generations',
            FeatureKey.AI_IMAGE_GENERATION
        );

        if (!allowed) {
            res.status(403).json({
                message: `Bạn đã đạt giới hạn tạo ảnh AI tháng này (${current}/${limit} ảnh). Vui lòng nâng cấp gói để tiếp tục.`,
            });
            return;
        }

        const styleDesc = style ? `Style: ${style}. ` : '';
        const contextDesc = context ? `Context: ${context}. ` : '';
        const extraDesc = prompt ? `Additional details: ${prompt}. ` : '';

        const fullPrompt = `Clean educational illustration for a quiz app, no overlaid text, no watermarks, family-friendly, vibrant and modern. ${styleDesc}${contextDesc}${extraDesc}`.trim();

        const img = await generateGeminiImageBytes(fullPrompt);
        if (!img) {
            res.status(500).json({ message: 'AI không thể tạo ảnh cho yêu cầu này. Hãy thử lại với mô tả khác.' });
            return;
        }

        const ext = img.mimeType.includes('png') ? 'png' : 'jpeg';
        const url = await uploadBufferToAzure(
            img.buffer,
            `ai-image-${Date.now()}.${ext}`,
            img.mimeType
        );

        // Charge 1 image generation quota unit
        await trackUsage(orgId, 'ai_image_generations', 1);

        res.status(200).json({
            url,
            imageEffect: imageEffect || 'NONE',
        });
    } catch (err) {
        console.error('[generateImage Error]:', err);
        res.status(500).json({ message: 'Lỗi tạo ảnh AI.', error: (err as Error).message });
    }
};
