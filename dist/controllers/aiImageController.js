import { uploadBufferToAzure } from '../services/azureBlobService.js';
import { generateGeminiImageBytes } from '../services/geminiImageApiService.js';
import { trackUsage, checkLimit } from '../services/usageService.js';
import { FeatureKey } from '@prisma/client';
const IMAGE_QUOTA_COST = 3;
export const generateImage = async (req, res) => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức để sử dụng tính năng này.' });
            return;
        }
        const { context, prompt, style, imageEffect, } = req.body;
        if (!context && !prompt) {
            res.status(400).json({ message: 'Cần cung cấp context hoặc prompt để tạo ảnh.' });
            return;
        }
        // Check quota: 3 ai_generations per image
        const { allowed, limit, current } = await checkLimit(orgId, 'ai_generations', FeatureKey.AI_GENERATION);
        if (!allowed) {
            res.status(403).json({
                message: `Bạn đã đạt giới hạn AI (${current}/${limit}). Vui lòng nâng cấp gói để tiếp tục.`,
            });
            return;
        }
        // Also check we have at least IMAGE_QUOTA_COST remaining
        if (limit !== null && current + IMAGE_QUOTA_COST > limit) {
            res.status(403).json({
                message: `Tạo 1 ảnh cần ${IMAGE_QUOTA_COST} quota, nhưng bạn chỉ còn ${limit - current}. Vui lòng nâng cấp gói.`,
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
        const url = await uploadBufferToAzure(img.buffer, `ai-image-${Date.now()}.${ext}`, img.mimeType);
        // Charge 3 quota units
        await trackUsage(orgId, 'ai_generations', IMAGE_QUOTA_COST);
        res.status(200).json({
            url,
            imageEffect: imageEffect || 'NONE',
        });
    }
    catch (err) {
        console.error('[generateImage Error]:', err);
        res.status(500).json({ message: 'Lỗi tạo ảnh AI.', error: err.message });
    }
};
