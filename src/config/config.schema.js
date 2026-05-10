const { z } = require('zod');

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // API Key for endpoint protection
  API_KEY: z.string().min(1, 'API_KEY is required'),

  // Database
  DB_CLIENT: z.enum(['pg', 'sqlite3','better-sqlite3']).default('sqlite3'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('polyglot_storage'),

  // GitHub provider
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_BRANCH: z.string().default('main'),
  GITHUB_UPLOAD_PATH: z.string().default('assets'),

  // Google Drive provider
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),

  // Staging
  STAGING_TTL_SECONDS: z.coerce.number().default(1800),

  // Upload limits
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

module.exports = { configSchema };
