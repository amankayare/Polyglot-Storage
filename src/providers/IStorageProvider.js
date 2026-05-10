/**
 * IStorageProvider — abstract base class (interface contract).
 * Every storage provider must extend this and implement all methods.
 */
class IStorageProvider {
  /**
   * Upload a file to the provider.
   * @param {Buffer} fileBuffer
   * @param {string} filename
   * @param {string} mimeType
   * @param {object} [options]
   * @returns {Promise<{ externalId: string, publicUrl: string }>}
   */
  async upload(fileBuffer, filename, mimeType, options = {}) {
    throw new Error('upload() must be implemented by the provider');
  }

  /**
   * Get the public URL for an asset by its provider-specific external ID.
   * @param {string} externalId
   * @returns {Promise<{ publicUrl: string }>}
   */
  async getUrl(externalId) {
    throw new Error('getUrl() must be implemented by the provider');
  }

  /**
   * Delete an asset by its provider-specific external ID.
   * @param {string} externalId
   * @returns {Promise<void>}
   */
  async delete(externalId) {
    throw new Error('delete() must be implemented by the provider');
  }
}

module.exports = IStorageProvider;
