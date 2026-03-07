import { uploadBufferToAzure } from './azureBlobService.js';
export const uploadMedia = async (files, videos) => {
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
