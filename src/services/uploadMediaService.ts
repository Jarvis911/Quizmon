import cloudinary from '../utils/cloudinary.js';
import { MediaItem } from './questionService.js';

interface VideoInput {
    url: string;
    startTime?: number;
    duration?: number;
}

interface CloudinaryResult {
    secure_url: string;
}

export const uploadMedia = async (
    files: Express.Multer.File[] | null,
    videos: VideoInput | null
): Promise<MediaItem[]> => {
    const mediaData: MediaItem[] = [];

    if (files) {
        for (const file of files) {
            if (!file.mimetype.startsWith('image/')) {
                throw new Error('Only image files are allowed for upload');
            }
            const uploadResult = await new Promise<CloudinaryResult>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result as CloudinaryResult);
                    }
                );
                uploadStream.end(file.buffer);
            });
            mediaData.push({
                type: 'IMAGE',
                url: uploadResult.secure_url,
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
