import { uploadBufferToAzure } from './azureBlobService.js';
import { MediaItem } from './questionService.js';

interface VideoInput {
    url: string;
    startTime?: number;
    duration?: number;
}


export const uploadMedia = async (
    files: Express.Multer.File[] | null,
    videos: VideoInput | null,
    imageEffect?: string,
    zoomX?: number,
    zoomY?: number
): Promise<MediaItem[]> => {
    const mediaData: MediaItem[] = [];

    if (files) {
        for (const file of files) {
            if (!file.mimetype.startsWith('image/')) {
                throw new Error('Only image files are allowed for upload');
            }
            const secure_url = await uploadBufferToAzure(file.buffer, file.originalname, file.mimetype);
            mediaData.push({
                type: 'IMAGE',
                url: secure_url,
                ...(imageEffect && { effect: imageEffect as any }),
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
