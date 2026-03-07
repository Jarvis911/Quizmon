import { BlobServiceClient } from '@azure/storage-blob';
import path from 'path';
let blobServiceClient = null;
let containerName = null;
const getBlobServiceClient = () => {
    if (!blobServiceClient) {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined in environment variables');
        }
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'quizmon-uploads';
    }
    return blobServiceClient;
};
/**
 * Uploads a buffer to Azure Blob Storage and returns the public URL.
 *
 * @param fileBuffer The raw file buffer (e.g., from multer.memoryStorage)
 * @param originalName The original filename
 * @param mimetype The MIME type of the file
 * @returns The public URL of the uploaded blob
 */
export const uploadBufferToAzure = async (fileBuffer, originalName, mimetype) => {
    try {
        const client = getBlobServiceClient();
        if (!containerName) {
            throw new Error('Container name is not initialized');
        }
        const containerClient = client.getContainerClient(containerName);
        // Ensure container exists (create if not, set to public read access for blobs)
        const exists = await containerClient.exists();
        if (!exists) {
            await containerClient.create({ access: 'blob' });
        }
        // Generate a unique blob name to prevent overwriting
        const extension = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, extension);
        const timestamp = Date.now();
        const uniqueBlobName = `${nameWithoutExt}-${timestamp}${extension}`;
        const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);
        // Required headers so the browser renders images instead of downloading them
        const options = {
            blobHTTPHeaders: { blobContentType: mimetype }
        };
        // Upload buffer
        await blockBlobClient.uploadData(fileBuffer, options);
        // Return the public URL
        return blockBlobClient.url;
    }
    catch (error) {
        console.error('[Azure Blob Upload Error]:', error);
        throw new Error(`Failed to upload file to Azure Blob Storage: ${error.message}`);
    }
};
