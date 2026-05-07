import { uploadBufferToAzure } from './azureBlobService.js';
export const uploadMedia = async (files, videos, imageEffect, zoomX, zoomY) => {
    const mediaData = [];
    if (files) {
        for (const file of files) {
            if (!file.mimetype.startsWith('image/')) {
                throw new Error('Only image files are allowed for upload');
            }
            const secure_url = await uploadBufferToAzure(file.buffer, file.originalname, file.mimetype);
            mediaData.push({
                type: 'IMAGE',
                url: secure_url,
                ...(imageEffect && { effect: imageEffect }),
                zoomX: zoomX ?? 0.5,
                zoomY: zoomY ?? 0.5,
            });
        }
    }
    if (videos) {
        mediaData.push({
            type: 'VIDEO',
            url: videos.url,
            startTime: videos.startTime,
            duration: videos.duration,
        });
    }
    return mediaData;
};
