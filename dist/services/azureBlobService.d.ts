/**
 * Uploads a buffer to Azure Blob Storage and returns the public URL.
 *
 * @param fileBuffer The raw file buffer (e.g., from multer.memoryStorage)
 * @param originalName The original filename
 * @param mimetype The MIME type of the file
 * @returns The public URL of the uploaded blob
 */
export declare const uploadBufferToAzure: (fileBuffer: Buffer, originalName: string, mimetype: string) => Promise<string>;
