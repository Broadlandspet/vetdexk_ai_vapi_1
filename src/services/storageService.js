// services/storageService.js
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class StorageService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        this.bucketName = 'support_attachments';
    }

    /**
     * Upload a file buffer to Supabase Storage
     */
    async uploadFile(fileBuffer, filename, mimeType, ticketId, uploadedBy = null) {
        try {
            const timestamp = Date.now();
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const filePath = `ticket-${ticketId}/${timestamp}-${sanitizedFilename}`;

            logger.info(`📤 Uploading ${filename} to Supabase...`);

            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filePath, fileBuffer, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                logger.error('❌ Supabase upload error:', error);
                throw error;
            }

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(filePath);

            logger.info(`✅ File uploaded: ${filename} → ${urlData.publicUrl}`);
            
            return {
                storagePath: filePath,
                downloadUrl: urlData.publicUrl,
                uploadedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error(`❌ Error uploading ${filename}:`, error.message);
            throw error;
        }
    }

    /**
     * Upload from base64 data (from Gmail attachments)
     */
    async uploadFromBase64(base64Data, filename, mimeType, ticketId) {
        try {
            const buffer = Buffer.from(base64Data, 'base64');
            return await this.uploadFile(buffer, filename, mimeType, ticketId);
        } catch (error) {
            logger.error(`❌ Error uploading from base64:`, error.message);
            throw error;
        }
    }

    /**
     * Delete a file from Supabase
     */
    async deleteFile(storagePath) {
        try {
            const { error } = await this.supabase.storage
                .from(this.bucketName)
                .remove([storagePath]);

            if (error) {
                logger.error('❌ Supabase delete error:', error);
                throw error;
            }

            logger.info(`✅ File deleted: ${storagePath}`);
            return true;

        } catch (error) {
            logger.error(`❌ Error deleting file:`, error.message);
            throw error;
        }
    }

    /**
     * Get signed URL (for private buckets)
     */
    async getSignedUrl(storagePath, expiresIn = 3600) {
        try {
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .createSignedUrl(storagePath, expiresIn);

            if (error) {
                logger.error('❌ Supabase signed URL error:', error);
                throw error;
            }

            return data.signedUrl;

        } catch (error) {
            logger.error(`❌ Error generating signed URL:`, error.message);
            throw error;
        }
    }

    /**
     * List files in a ticket folder
     */
    async listFiles(ticketId) {
        try {
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .list(`ticket-${ticketId}/`);

            if (error) {
                logger.error('❌ Supabase list error:', error);
                throw error;
            }

            return data || [];

        } catch (error) {
            logger.error(`❌ Error listing files:`, error.message);
            throw error;
        }
    }
}

module.exports = new StorageService();