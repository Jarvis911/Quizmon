import cloudinary from '../utils/cloudinary.js';
export const uploadMedia = async (files, videos) => {
    const mediaData = [];
    if (files) {
        for (const file of files) {
            if (!file.mimetype.startsWith('image/')) {
                throw new Error('Only image files are allowed for upload');
            }
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                });
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
