const knex = require('knex');
const path = require('path');
const config = require('./config');
const createApp = require('./app');
const logger = require('./utils/logger');

async function start() {
  // --- Initialise database ---
  const knexConfig = {
    client: config.DB_CLIENT,
    migrations: {
      directory: path.join(__dirname, 'repository', 'migrations'),
    },
  };

  if (config.DB_CLIENT === 'pg') {
    knexConfig.connection = {
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
    };
  } else {
    // SQLite
    knexConfig.connection = {
      filename: path.join(__dirname, '..', 'data', 'polyglot-storage.sqlite'),
    };
    knexConfig.useNullAsDefault = true;
  }

  const db = knex(knexConfig);

  // Run migrations automatically on startup
  logger.info('Running database migrations...');
  await db.migrate.latest();
  logger.info('Migrations complete');

  // --- Create and start Express app ---
  const app = createApp(db);

  const port = config.PORT;
  const server = app.listen(port, () => {
    logger.info(`Polyglot Storage Proxy running on port ${port} [${config.NODE_ENV}]`);
    logger.info(`Registered providers: ${require('./providers/ProviderFactory').list().join(', ') || 'none'}`);
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down...`);
    server.close(async () => {
      await db.destroy();
      logger.info('Database connection closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

start();
