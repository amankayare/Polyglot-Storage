const { decodeBase64 } = require('../../utils/fileUtils');

class AssetsController {
  /**
   * @param {import('../../services/AssetService')} assetService
   */
  constructor(assetService) {
    this.assetService = assetService;

    // Bind methods so they keep `this` when used as route handlers
    this.upload = this.upload.bind(this);
    this.getUrl = this.getUrl.bind(this);
    this.delete = this.delete.bind(this);
    this.stage = this.stage.bind(this);
    this.confirmStaged = this.confirmStaged.bind(this);
    this.discardStaged = this.discardStaged.bind(this);
  }

  /**
   * POST /api/v1/assets/upload
   */
  async upload(req, res, next) {
    try {
      let fileBuffer;
      let filename;
      let mimeType;

      if (req.file) {
        // multipart/form-data via multer
        fileBuffer = req.file.buffer;
        filename = req.body.filename || req.file.originalname;
        mimeType = req.body.mimeType || req.file.mimetype;
      } else {
        // JSON body with Base64 file
        fileBuffer = decodeBase64(req.body.file);
        filename = req.body.filename;
        mimeType = req.body.mimeType;
      }

      const provider = req.body.provider;
      const result = await this.assetService.upload(fileBuffer, filename, mimeType, provider);

      res.status(201).json({ success: true, data: result, error: null });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/assets/:assetId/url
   */
  async getUrl(req, res, next) {
    try {
      const result = await this.assetService.getUrl(req.params.assetId);
      res.json({ success: true, data: result, error: null });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/assets/:assetId
   */
  async delete(req, res, next) {
    try {
      await this.assetService.delete(req.params.assetId);
      res.json({ success: true, data: { message: 'Asset deleted' }, error: null });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/assets/stage
   */
  async stage(req, res, next) {
    try {
      let fileBuffer;
      let filename;
      let mimeType;

      if (req.file) {
        fileBuffer = req.file.buffer;
        filename = req.body.filename || req.file.originalname;
        mimeType = req.body.mimeType || req.file.mimetype;
      } else {
        fileBuffer = decodeBase64(req.body.file);
        filename = req.body.filename;
        mimeType = req.body.mimeType;
      }

      const result = this.assetService.stage(fileBuffer, filename, mimeType);
      
      // Add previewUrl to the response
      const previewUrl = `/api/v1/assets/stage/${result.stageId}/preview`;
      
      res.status(201).json({ 
        success: true, 
        data: { ...result, previewUrl }, 
        error: null 
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/assets/stage/:stageId/confirm
   */
  async confirmStaged(req, res, next) {
    try {
      const { stageId } = req.params;
      const { provider } = req.body;
      const result = await this.assetService.confirmStaged(stageId, provider);

      res.status(201).json({ success: true, data: result, error: null });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/assets/stage/:stageId
   */
  async discardStaged(req, res, next) {
    try {
      this.assetService.discardStaged(req.params.stageId);
      res.json({ success: true, data: { message: 'Staged asset discarded' }, error: null });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/assets/stage/:stageId/preview
   */
  async previewStaged(req, res, next) {
    try {
      const { stageId } = req.params;
      const { fileBuffer, mimeType } = this.assetService.staging.get(stageId);
      
      res.set('Content-Type', mimeType);
      res.send(fileBuffer);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AssetsController;
