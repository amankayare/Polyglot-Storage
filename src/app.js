const express = require('express');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const authMiddleware = require('./api/middlewares/auth.middleware');
const errorMiddleware = require('./api/middlewares/error.middleware');
const createAssetsRouter = require('./api/routes/assets.routes');
const AssetsController = require('./api/controllers/assets.controller');
const AssetService = require('./services/AssetService');
const StagingService = require('./services/StagingService');
const AssetRepository = require('./repository/AssetRepository');
const ProviderFactory = require('./providers/ProviderFactory');
const GitHubProvider = require('./providers/github/GitHubProvider');
const GoogleDriveProvider = require('./providers/google-drive/GoogleDriveProvider');
const swaggerSpec = require('./config/swagger');
const config = require('./config');

/**
 * Create and configure the Express app.
 * @param {import('knex').Knex} db  — initialised knex instance
 */
function createApp(db) {
  const app = express();

  // --- Body parsing ---
  app.use(express.json({ limit: `${config.MAX_UPLOAD_SIZE_MB}mb` }));
  app.use(express.urlencoded({ extended: true }));

  // --- Rate limiter ---
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // --- Swagger UI (no auth) ---
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/v1/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // --- Health check (no auth) ---
  app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok' }, error: null });
  });

  // --- Auth guard for all asset routes ---
  app.use('/api/v1/assets', authMiddleware);

  // --- Register providers ---
  if (config.GITHUB_TOKEN) {
    ProviderFactory.register('github', new GitHubProvider());
  }
  if (config.GOOGLE_CLIENT_ID) {
    ProviderFactory.register('google-drive', new GoogleDriveProvider());
  }

  // --- Wire dependencies (Dependency Inversion) ---
  const assetRepository = new AssetRepository(db);
  const stagingService = new StagingService();
  const assetService = new AssetService(assetRepository, stagingService);
  const assetsController = new AssetsController(assetService);

  // --- Mount routes ---
  app.use('/api/v1/assets', createAssetsRouter(assetsController));

  // --- Centralised error handler ---
  app.use(errorMiddleware);

  return app;
}

module.exports = createApp;
