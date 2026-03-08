import { MediaItem } from './questionService.js';
interface VideoInput {
    url: string;
    startTime?: number;
    duration?: number;
}
export declare const uploadMedia: (files: Express.Multer.File[] | null, videos: VideoInput | null, imageEffect?: string) => Promise<MediaItem[]>;
export {};
