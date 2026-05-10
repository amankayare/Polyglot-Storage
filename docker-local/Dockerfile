# =============================================================================
# Local Development Dockerfile — Polyglot Storage Proxy
#
# Copies source from local machine (no git clone).
# Supports hot-reload via nodemon when used with docker-compose volume mount.
# =============================================================================


FROM node:20-alpine AS deps

WORKDIR /app

# Add build tools for native modules
RUN apk add --no-cache python3 make g++ ca-certificates && update-ca-certificates

# Disable SSL validation for npm/node-gyp (local dev only)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV npm_config_strict_ssl=false

COPY package*.json ./
RUN npm install

# =============================================================================
# Runner stage (local dev)
# =============================================================================
FROM node:20-alpine AS runner

ENV NODE_ENV=development
ENV PORT=3000

WORKDIR /app

# Create data directory with correct ownership before switching to node user
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/

EXPOSE 3000

CMD ["node", "src/server.js"]
