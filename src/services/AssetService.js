const { v4: uuidv4 } = require('uuid');
const ProviderFactory = require('../providers/ProviderFactory');
const logger = require('../utils/logger');

class AssetService {
  /**
   * @param {import('../repository/AssetRepository')} assetRepository
   * @param {import('./StagingService')} stagingService
   */
  constructor(assetRepository, stagingService) {
    this.repo = assetRepository;
    this.staging = stagingService;
  }

  /**
   * Upload a file directly to a provider and persist the record.
   */
  async upload(fileBuffer, filename, mimeType, providerName) {
    const provider = ProviderFactory.resolve(providerName);
    const { externalId, publicUrl } = await provider.upload(fileBuffer, filename, mimeType);

    const assetId = uuidv4();
    const asset = await this.repo.create({
      id: assetId,
      provider: providerName,
      external_id: externalId,
      public_url: publicUrl,
      filename,
      mime_type: mimeType,
    });

    logger.info(`Asset created: ${assetId} via ${providerName}`);
    return { assetId: asset.id, publicUrl: asset.public_url, provider: asset.provider };
  }

  /**
   * Retrieve the public URL for an asset by its internal ID.
   */
  async getUrl(assetId) {
    const asset = await this.repo.findById(assetId);
    return { publicUrl: asset.public_url };
  }

  /**
   * Delete an asset: remove from provider, then soft-delete the DB record.
   */
  async delete(assetId) {
    const asset = await this.repo.findById(assetId);
    const provider = ProviderFactory.resolve(asset.provider);
    await provider.delete(asset.external_id);
    await this.repo.delete(assetId);
    logger.info(`Asset deleted: ${assetId}`);
  }

  /**
   * Stage a file for preview.
   */
  stage(fileBuffer, filename, mimeType) {
    return this.staging.stage(fileBuffer, filename, mimeType);
  }

  /**
   * Confirm a staged asset — promote it to permanent provider storage.
   */
  async confirmStaged(stageId, providerName) {
    const { fileBuffer, filename, mimeType } = this.staging.get(stageId);
    const result = await this.upload(fileBuffer, filename, mimeType, providerName);
    this.staging.discard(stageId);
    return result;
  }

  /**
   * Discard a staged asset.
   */
  discardStaged(stageId) {
    this.staging.discard(stageId);
  }
}

module.exports = AssetService;
