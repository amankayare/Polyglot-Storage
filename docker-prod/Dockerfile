# =============================================================================
# Production Dockerfile — Polyglot Storage Proxy
#
# Industry-standard multi-stage build:
#   Stage 1 (builder): Clone source from git, install deps, prune dev deps
#   Stage 2 (runner):  Minimal runtime image, non-root user, no secrets
#
# Build args (pass via docker build or docker-compose build args):
#   GIT_REPO    — full HTTPS/SSH URL of the git repository
#   GIT_BRANCH  — branch or tag to check out (default: main)
# =============================================================================

ARG GIT_REPO
ARG GIT_BRANCH=main

# =============================================================================
# Stage 1 — builder: clone source, install production deps
# =============================================================================
FROM node:20-alpine AS builder

# Install git for source cloning
RUN apk add --no-cache git

ARG GIT_REPO
ARG GIT_BRANCH=main

WORKDIR /build

# Clone only the specified branch/tag (shallow clone for speed)
RUN git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" .

# Install only production dependencies (removing lockfile to avoid private registry issues)
RUN rm -f package-lock.json && npm install --omit=dev

# =============================================================================
# Stage 2 — runner: minimal, secure, production image
# =============================================================================
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling (PID 1 best practice)
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Run as non-root user (principle of least privilege)
USER node

# Copy only what is needed from builder — no source code, no dev tools, no secrets
COPY --chown=node:node --from=builder /build/node_modules ./node_modules
COPY --chown=node:node --from=builder /build/src ./src
COPY --chown=node:node --from=builder /build/package.json ./package.json

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
