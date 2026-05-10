const { google } = require('googleapis');
const { Readable } = require('stream');
const IStorageProvider = require('../IStorageProvider');
const GoogleDriveAuthService = require('./GoogleDriveAuthService');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');

class GoogleDriveProvider extends IStorageProvider {
  constructor() {
    super();
    this.auth = new GoogleDriveAuthService();
    this.drive = google.drive({ version: 'v3', auth: this.auth.getClient() });
  }

  async upload(fileBuffer, filename, mimeType, options = {}) {
    const folderId = this.auth.getFolderId();

    try {
      const fileMetadata = {
        name: filename,
        ...(folderId && { parents: [folderId] }),
      };

      const media = {
        mimeType,
        body: Readable.from(fileBuffer),
      };

      const { data } = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink',
      });

      // Make the file publicly accessible via link
      await this.drive.permissions.create({
        fileId: data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      const publicUrl = `https://drive.google.com/uc?id=${data.id}&export=view`;

      logger.info(`Google Drive: uploaded ${filename} (${data.id})`);
      return { externalId: data.id, publicUrl };
    } catch (err) {
      logger.error(`Google Drive upload failed: ${err.message}`);
      throw ApiError.badGateway(`Google Drive upload failed: ${err.message}`);
    }
  }

  async getUrl(externalId) {
    try {
      await this.drive.files.get({ fileId: externalId, fields: 'id' });
      const publicUrl = `https://drive.google.com/uc?id=${externalId}&export=view`;
      return { publicUrl };
    } catch (err) {
      if (err.code === 404) {
        throw ApiError.notFound(`Google Drive file not found: ${externalId}`);
      }
      throw ApiError.badGateway(`Google Drive getUrl failed: ${err.message}`);
    }
  }

  async delete(externalId) {
    try {
      await this.drive.files.delete({ fileId: externalId });
      logger.info(`Google Drive: deleted ${externalId}`);
    } catch (err) {
      if (err.code === 404) {
        throw ApiError.notFound(`Google Drive file not found: ${externalId}`);
      }
      logger.error(`Google Drive delete failed: ${err.message}`);
      throw ApiError.badGateway(`Google Drive delete failed: ${err.message}`);
    }
  }
}

module.exports = GoogleDriveProvider;
