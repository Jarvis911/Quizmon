import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const ALLOWED_TYPES = [
    // PDF
    'application/pdf',
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Word
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    // Excel
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
];

const studentListUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Không hỗ trợ định dạng ${file.mimetype}. Vui lòng dùng PDF, Word, Excel hoặc ảnh.`));
        }
    },
});

export default studentListUpload;
