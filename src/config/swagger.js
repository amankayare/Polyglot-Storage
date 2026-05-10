const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Polyglot Storage Proxy',
      version: '1.0.0',
      description:
        'A storage-agnostic asset microservice that abstracts file uploads, retrieval, and deletion across multiple cloud providers (GitHub, Google Drive).',
      contact: {
        name: 'Polyglot Storage Proxy',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Current environment',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            error: { type: 'string', nullable: true, example: null },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'string', nullable: true, example: null },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        AssetResponse: {
          type: 'object',
          properties: {
            assetId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            publicUrl: { type: 'string', format: 'uri', example: 'https://raw.githubusercontent.com/owner/repo/main/assets/image.png' },
            provider: { type: 'string', example: 'github' },
          },
        },
        UrlResponse: {
          type: 'object',
          properties: {
            publicUrl: { type: 'string', format: 'uri' },
          },
        },
        StageResponse: {
          type: 'object',
          properties: {
            stageId: { type: 'string', format: 'uuid', example: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210' },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apis: [
    path.join(__dirname, '../api/routes/*.routes.js'),
    path.join(__dirname, 'swagger.paths.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
