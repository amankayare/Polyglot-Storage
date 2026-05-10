require('dotenv').config();
const { configSchema } = require('./config.schema');

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

const config = Object.freeze(parsed.data);

module.exports = config;
