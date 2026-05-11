import sharp from 'sharp';
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

            // Optimize image before upload
            let bufferToUpload = file.buffer;
            let finalMimeType = file.mimetype;
            let fileName = file.originalname;

            try {
                bufferToUpload = await sharp(file.buffer)
                    .resize(1200, null, { 
                        withoutEnlargement: true,
                        fit: 'inside' 
                    })
                    .webp({ quality: 85 })
                    .toBuffer();
                
                finalMimeType = 'image/webp';
                // Change extension to .webp for the blob name
                fileName = file.originalname.replace(/\.[^/.]+$/, "") + ".webp";
            } catch (err) {
                console.error('[Image Optimization Failed]:', err);
                // Fallback to original buffer if sharp fails
            }

            const secure_url = await uploadBufferToAzure(bufferToUpload, fileName, finalMimeType);
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
