const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const ApiError = require('../utils/ApiError');

class StagingService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.STAGING_TTL_SECONDS,
      checkperiod: 60,
      useClones: false,
    });
  }

  /**
   * Stage a file in the in-memory cache.
   * @returns {{ stageId: string }}
   */
  stage(fileBuffer, filename, mimeType) {
    const stageId = uuidv4();
    this.cache.set(stageId, { fileBuffer, filename, mimeType });
    return { stageId };
  }

  /**
   * Retrieve a staged asset.
   * @returns {{ fileBuffer: Buffer, filename: string, mimeType: string }}
   */
  get(stageId) {
    const entry = this.cache.get(stageId);
    if (!entry) {
      throw ApiError.notFound(`Staged asset not found or expired: ${stageId}`);
    }
    return entry;
  }

  /**
   * Discard a staged asset.
   */
  discard(stageId) {
    const deleted = this.cache.del(stageId);
    if (!deleted) {
      throw ApiError.notFound(`Staged asset not found or expired: ${stageId}`);
    }
  }
}

module.exports = StagingService;
