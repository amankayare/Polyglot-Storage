const { Router } = require('express');
const multer = require('multer');
const { z } = require('zod');
const validate = require('../middlewares/validate.middleware');
const config = require('../../config');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
});

// ----- Validation Schemas -----

const uploadJsonSchema = z.object({
  provider: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  file: z.string().min(1), // Base64
});

const confirmSchema = z.object({
  provider: z.string().min(1),
});

const stageJsonSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  file: z.string().min(1),
});

/**
 * @openapi
 * tags:
 *   - name: Assets
 *     description: Upload, retrieve and delete assets across storage providers
 *   - name: Staging
 *     description: Temporary staging for preview before committing to a provider
 */

/**
 * Creates and returns the assets router.
 * @param {import('../controllers/assets.controller')} controller
 */
function createAssetsRouter(controller) {
  const router = Router();

  /**
   * @openapi
   * /assets/upload:
   *   post:
   *     tags: [Assets]
   *     summary: Upload a file to a storage provider
   *     description: |
   *       Accepts either a `multipart/form-data` upload (with a `file` field) or
   *       a JSON body containing a Base64-encoded `file` string.
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [provider, file]
   *             properties:
   *               provider:
   *                 type: string
   *                 example: github
   *               filename:
   *                 type: string
   *                 example: cover.png
   *               mimeType:
   *                 type: string
   *                 example: image/png
   *               file:
   *                 type: string
   *                 format: binary
   *         application/json:
   *           schema:
   *             type: object
   *             required: [provider, filename, mimeType, file]
   *             properties:
   *               provider:
   *                 type: string
   *                 example: github
   *               filename:
   *                 type: string
   *                 example: cover.png
   *               mimeType:
   *                 type: string
   *                 example: image/png
   *               file:
   *                 type: string
   *                 description: Base64-encoded file content
   *     responses:
   *       201:
   *         description: Asset uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessEnvelope'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/AssetResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorEnvelope'
   *       401:
   *         description: Unauthorized — missing or invalid API key
   *       502:
   *         description: Provider error
   */
  router.post(
    '/upload',
    upload.single('file'),
    (req, res, next) => {
      if (req.file) return next();
      return validate(uploadJsonSchema)(req, res, next);
    },
    controller.upload
  );

  /**
   * @openapi
   * /assets/{assetId}/url:
   *   get:
   *     tags: [Assets]
   *     summary: Get the public URL of a stored asset
   *     parameters:
   *       - in: path
   *         name: assetId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Internal asset ID returned at upload time
   *     responses:
   *       200:
   *         description: Public URL retrieved
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessEnvelope'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/UrlResponse'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Asset not found
   */
  router.get('/:assetId/url', controller.getUrl);

  /**
   * @openapi
   * /assets/{assetId}:
   *   delete:
   *     tags: [Assets]
   *     summary: Delete an asset from its provider and the database
   *     parameters:
   *       - in: path
   *         name: assetId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Asset deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessEnvelope'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Asset not found
   *       502:
   *         description: Provider error
   */
  router.delete('/:assetId', controller.delete);

  /**
   * @openapi
   * /assets/stage:
   *   post:
   *     tags: [Staging]
   *     summary: Stage a file for preview (temporary storage)
   *     description: |
   *       Stores the file in an in-memory TTL cache. Returns a `stageId` to confirm
   *       or discard later. Staged assets expire after the configured TTL (default 30 min).
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [file]
   *             properties:
   *               filename:
   *                 type: string
   *               mimeType:
   *                 type: string
   *               file:
   *                 type: string
   *                 format: binary
   *         application/json:
   *           schema:
   *             type: object
   *             required: [filename, mimeType, file]
   *             properties:
   *               filename:
   *                 type: string
   *               mimeType:
   *                 type: string
   *               file:
   *                 type: string
   *                 description: Base64-encoded file content
   *     responses:
   *       201:
   *         description: File staged successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessEnvelope'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/StageResponse'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.post(
    '/stage',
    upload.single('file'),
    (req, res, next) => {
      if (req.file) return next();
      return validate(stageJsonSchema)(req, res, next);
    },
    controller.stage
  );

  /**
   * @openapi
   * /assets/stage/{stageId}/confirm:
   *   post:
   *     tags: [Staging]
   *     summary: Confirm a staged asset and promote it to permanent storage
   *     parameters:
   *       - in: path
   *         name: stageId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [provider]
   *             properties:
   *               provider:
   *                 type: string
   *                 example: github
   *     responses:
   *       201:
   *         description: Asset promoted to permanent storage
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessEnvelope'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/AssetResponse'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Staged asset not found or expired
   *       502:
   *         description: Provider error
   */
  router.post('/stage/:stageId/confirm', validate(confirmSchema), controller.confirmStaged);

  /**
   * @openapi
   * /assets/stage/{stageId}/preview:
   *   get:
   *     tags: [Staging]
   *     summary: Get a preview of a staged asset
   *     parameters:
   *       - in: path
   *         name: stageId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Binary file content
   *         content:
   *           image/*:
   *             schema:
   *               type: string
   *               format: binary
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Staged asset not found or expired
   */
  router.get('/stage/:stageId/preview', controller.previewStaged);

  /**
   * @openapi
   * /assets/stage/{stageId}:
   *   delete:
   *     tags: [Staging]
   *     summary: Discard a staged asset
   *     parameters:
   *       - in: path
   *         name: stageId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Staged asset discarded
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessEnvelope'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Staged asset not found or expired
   */
  router.delete('/stage/:stageId', controller.discardStaged);

  return router;
}

module.exports = createAssetsRouter;
