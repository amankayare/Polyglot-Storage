# Product Requirements Document (PRD): Storage Agnostic Asset Microservice

**Version:** 2.0  
**Date:** May 8, 2026  
**Status:** Refined

---

## 1. Overview and Vision

**Project Name:** Polyglot Storage Proxy  
**Runtime:** Node.js (v20 LTS)  
**Framework:** Express.js  

**Objective:** To build a centralized, standalone Node.js microservice that acts as a universal API gateway for uploading, retrieving, and deleting assets (cover images, PDFs, raw documents) across multiple free-tier cloud storage providers (GitHub, Google Drive, OneDrive). Any application can integrate with it via a single REST API, regardless of which storage backend is used. The service is designed from the ground up around SOLID principles and industry-standard patterns.

---

## 2. Problem Statement

Applications that need to store files across multiple cloud providers typically end up embedding each provider's SDK and auth logic directly into their own codebase. This approach results in:

- High coupling between the application and individual storage providers
- Scattered, duplicated authentication logic (OAuth2 token refresh, PAT management)
- Poor extensibility — adding a new provider requires invasive changes to core application logic
- No clean separation of concerns for staging/preview workflows

Polyglot Storage Proxy solves this by centralising all storage concerns into one dedicated, independently deployable service.

---

## 3. Core Features & Requirements

### 3.1. Unified API Interface

The microservice exposes a single, provider-agnostic REST API. The calling client never needs to know which storage backend is used.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/assets/upload` | Upload a file (Base64 or `multipart/form-data`). Body includes `provider`, `filename`, `mimeType`, and `file`. Returns `{ assetId, publicUrl, provider }`. |
| `GET` | `/api/v1/assets/:assetId/url` | Retrieve the public URL for a stored asset by its internal ID. |
| `DELETE` | `/api/v1/assets/:assetId` | Permanently delete an asset from its provider. |
| `POST` | `/api/v1/assets/stage` | Upload a file to temporary staging storage. Returns a `stageId`. |
| `POST` | `/api/v1/assets/stage/:stageId/confirm` | Promote a staged asset to permanent storage on the specified provider. |
| `DELETE` | `/api/v1/assets/stage/:stageId` | Discard a staged (preview) asset. |
| `GET` | `/api/v1/health` | Health check endpoint for liveness/readiness probes. |

**Standard Response Envelope:**
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 3.2. Provider Strategy System

The architecture implements the **Strategy Design Pattern** backed by a **Factory**. The `AssetService` depends on the `IStorageProvider` abstraction, never on a concrete provider class.

**`IStorageProvider` Interface (contract all providers must fulfill):**
```
upload(fileBuffer, filename, mimeType, options)  → Promise<{ assetId, publicUrl }>
getUrl(assetId)                                  → Promise<{ publicUrl }>
delete(assetId)                                  → Promise<void>
```

**Initial Providers:**

| Provider | Use Case | Auth Method | SDK |
|----------|----------|-------------|-----|
| `GitHubProvider` | Cover images | PAT via env var | `@octokit/rest` |
| `GoogleDriveProvider` | PDFs / Docs | OAuth2 with token refresh | `googleapis` |

### 3.3. Authentication Management

- **GitHub:** PAT stored in `GITHUB_TOKEN` env variable, injected via the `GitHubAuthService`. Never hardcoded.
- **Google Drive:** OAuth2 credentials stored in env variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`). The `GoogleAuthService` handles proactive token refresh using `google-auth-library`, ensuring backend calls never fail due to expired access tokens.
- All secrets are loaded via `dotenv` at startup and validated against a config schema (`zod`) to fail fast on misconfiguration.

### 3.4. Staging and Temporary Storage

- A `StagingService` manages short-lived preview assets using an in-memory TTL cache (`node-cache`) with a configurable expiry (default: 30 minutes).
- On "Confirm", the staged buffer is passed directly to the selected provider strategy without re-upload from the client.
- On TTL expiry or explicit discard, the buffer is cleared from memory.

### 3.5. Asset Record Keeping (Database)

- Every successfully uploaded asset is persisted to a database via the `AssetRepository` layer.
- The repository maps an internal `assetId` (UUID) to its provider, external URL, filename, MIME type, and timestamps.
- **Database strategy:**
  - **Development / test:** SQLite via `better-sqlite3` — zero infrastructure, file-based.
  - **Production:** PostgreSQL via `pg` — robust, production-grade.
  - The target DB is selected via the `DB_CLIENT` env variable (`sqlite3` | `pg`).
- Schema migrations are managed by `knex` — versioned, repeatable, and run automatically on startup.
- The `AssetRepository` is injected into `AssetService` (Dependency Inversion) — the service never touches a DB client directly.

**`AssetRepository` interface:**
```
create(record)              → Promise<Asset>   // called after successful provider upload
findById(assetId)           → Promise<Asset>   // used by GET /url and DELETE
delete(assetId)             → Promise<void>    // called before provider delete
list(filters)               → Promise<Asset[]> // optional: list/search assets
```

**Asset record schema:**
```
assets
├── id          UUID PRIMARY KEY
├── provider    VARCHAR  (e.g. 'github', 'google-drive')
├── external_id VARCHAR  (provider-specific file/blob ID)
├── public_url  TEXT
├── filename    VARCHAR
├── mime_type   VARCHAR
├── created_at  TIMESTAMP
└── deleted_at  TIMESTAMP (soft delete)
```

---

## 4. System Architecture

### 4.1. SOLID Principles Applied

| Principle | Application |
|-----------|-------------|
| **Single Responsibility (S)** | Each class has one job: `AssetsController` only handles HTTP, `AssetService` only orchestrates business logic, each `*Provider` only talks to its external API, each `*AuthService` only manages credentials. |
| **Open/Closed (O)** | New providers are added by creating a new class implementing `IStorageProvider` and registering it in `ProviderFactory`. Zero changes to `AssetService` or controllers. |
| **Liskov Substitution (L)** | Any `IStorageProvider` implementation can replace another without breaking the `AssetService` contract. |
| **Interface Segregation (I)** | `IStorageProvider` defines only what every provider must support. Optional capabilities (e.g., CDN wrapping) are handled as separate, opt-in decorators. |
| **Dependency Inversion (D)** | `AssetService` receives an `IStorageProvider` instance injected by `ProviderFactory` — it never instantiates a concrete provider directly. |

### 4.2. Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Any HTTP Client                       │
│          (web app, mobile app, CLI, another service)     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────┐
│              Express Router  /api/v1/assets              │
│              + Validation Middleware (zod)               │
│              + Rate Limiter (express-rate-limit)         │
│              + Auth Middleware (API Key check)           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   AssetsController                       │
│     (maps HTTP request/response, delegates to service)  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    AssetService                          │
│   (core business logic — provider selection, staging)   │
└──────┬─────────────────┬──────────────────┬─────────────┘
       │                 │                  │
┌──────▼──────┐  ┌───────▼────────┐  ┌─────▼──────────┐
│ProviderFact.│  │ StagingService │  │AssetRepository │
│             │  │  (node-cache)  │  │ (knex + pg /   │
└──────┬──────┘  └────────────────┘  │  sqlite3)      │
                                     └────────┬───────┘
                                              │
                                     ┌────────▼───────┐
                                     │   PostgreSQL   │
                                     │  (prod) /      │
                                     │  SQLite (dev)  │
                                     └────────────────┘
       │ resolves IStorageProvider
┌──────▼─────────────────────────────────────────────────┐
│              IStorageProvider (abstraction)             │
├────────────────────────┬───────────────────────────────┤
│    GitHubProvider      │      GoogleDriveProvider       │
│  + GitHubAuthService   │   + GoogleDriveAuthService     │
│  (@octokit/rest)       │   (googleapis + token refresh) │
└────────────────────────┴───────────────────────────────┘
```

### 4.3. Project Structure

```
polyglot-storage/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   └── assets.routes.js          # Express router definitions
│   │   ├── controllers/
│   │   │   └── assets.controller.js      # HTTP layer — delegates to AssetService
│   │   └── middlewares/
│   │       ├── validate.middleware.js     # Request schema validation (zod)
│   │       ├── auth.middleware.js         # API key guard
│   │       └── error.middleware.js        # Centralised error handler
│   ├── providers/
│   │   ├── IStorageProvider.js            # Abstract base class (interface contract)
│   │   ├── ProviderFactory.js             # Resolves provider name → implementation
│   │   ├── github/
│   │   │   ├── GitHubProvider.js          # Implements IStorageProvider
│   │   │   └── GitHubAuthService.js       # PAT credential loader
│   │   └── google-drive/
│   │       ├── GoogleDriveProvider.js     # Implements IStorageProvider
│   │       └── GoogleDriveAuthService.js  # OAuth2 token refresh logic
│   ├── services/
│   │   ├── AssetService.js               # Core business logic orchestrator
│   │   └── StagingService.js             # In-memory TTL staging cache
│   ├── repository/
│   │   ├── AssetRepository.js            # DB queries — maps assetId to provider/URL
│   │   └── migrations/
│   │       └── 001_create_assets.js      # Initial schema (knex migration)
│   ├── config/
│   │   ├── index.js                      # Centralised config (reads env vars)
│   │   └── config.schema.js              # zod schema — validates env on startup
│   ├── utils/
│   │   ├── logger.js                     # Winston structured logger
│   │   ├── ApiError.js                   # Custom error class with HTTP status
│   │   └── fileUtils.js                  # Base64 decode, MIME helpers
│   ├── app.js                            # Express app factory (no listen call)
│   └── server.js                         # Entry point — binds app to port
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── providers/
│   └── integration/
│       └── api/
├── .env.example
├── .gitignore
├── package.json
├── Dockerfile                            # Multi-stage production image
├── docker-compose.yml                    # Orchestrates app (+ future services)
├── .dockerignore
└── README.md
```

---

## 5. Technology Stack

| Concern | Library / Tool | Reason |
|---------|---------------|--------|
| Runtime | Node.js v20 LTS | Stability, long-term support |
| Framework | Express.js | Lightweight, widely adopted |
| GitHub API | `@octokit/rest` | Official GitHub SDK |
| Google APIs | `googleapis` | Official Google client |
| File upload | `multer` | Multipart form handling |
| Validation | `zod` | Schema-first, type-safe validation |
| Config | `dotenv` | Env var loading |
| Staging cache | `node-cache` | Zero-dependency in-memory TTL store |
| Logging | `winston` | Structured JSON logging, log levels |
| Rate limiting | `express-rate-limit` | Abuse prevention |
| Testing | `jest` + `supertest` | Unit and integration tests |
| Linting | `eslint` + `prettier` | Code quality and consistency |
| Database (prod) | `pg` (PostgreSQL) | Robust production-grade SQL store |
| Database (dev) | `better-sqlite3` | Zero-config local development |
| Query builder | `knex` | SQL query builder + schema migrations |
| Containerization | `Docker` + `Docker Compose` | Reproducible builds, environment parity |

---

## 6. Containerization

### 6.1. Dockerfile (Multi-Stage Build)

A two-stage `Dockerfile` is used to keep the production image lean:

- **Stage 1 — `deps`:** Installs only production dependencies (`npm ci --omit=dev`) on `node:20-alpine`.
- **Stage 2 — `runner`:** Copies the installed `node_modules` and `src/` into a clean image. Runs as a non-root user (`node`) for security.

Key decisions:
- `node:20-alpine` base — minimal attack surface, small image size
- Non-root user — principle of least privilege
- `EXPOSE 3000` — documents the service port
- `NODE_ENV=production` baked in as default; overridden per environment via Compose

### 6.2. Docker Compose

`docker-compose.yml` defines the full local and deployment environment:

| Service | Description |
|---------|-------------|
| `app` | The Polyglot Storage Proxy service |

**Profiles:**
- **`production`** (default): Builds from `Dockerfile`, no volume mounts, reads from `.env`.
- **`dev`**: Mounts `./src` as a volume and uses `nodemon` for hot reload without rebuilding the image.

**Environment variables** are supplied via `.env` file (referenced with `env_file: .env` in Compose) — never hardcoded in `docker-compose.yml`.

**Port mapping:** `3000:3000` (configurable via `PORT` env var).

**Healthcheck:** Compose-level healthcheck polls `GET /api/v1/health` every 30s to gate dependent services.

### 6.3. Compose Services — Database

A `db` service (PostgreSQL) is included in `docker-compose.yml` for production. SQLite is used automatically in development/test environments (no additional Compose service required).

- Named volume `postgres_data` persists database files across container restarts.
- The `app` service declares `depends_on: db` with `condition: service_healthy` so it only starts after PostgreSQL passes its healthcheck.
- Knex migrations run automatically on `app` startup via a hook in `server.js`.

---

## 7. Security Requirements

- All endpoints protected by an API key (`X-API-Key` header) validated in `auth.middleware.js`.
- Secrets (PATs, OAuth credentials) loaded exclusively from environment variables — never committed to source control.
- File upload size capped (configurable via `MAX_UPLOAD_SIZE_MB` env var, default 10MB).
- Input validation on all request payloads via `zod` schemas before reaching the controller.
- Dependency on `express-rate-limit` to prevent abuse.
- `.env` listed in `.gitignore`; `.env.example` committed with placeholder values only.

---

## 8. Error Handling Strategy

- A single `error.middleware.js` at the Express app level catches all thrown errors.
- A custom `ApiError` class carries `statusCode`, `message`, and optional `details`.
- All provider-level failures (network errors, API rate limits, auth failures) are caught and re-thrown as `ApiError` instances with appropriate HTTP status codes (502, 401, 404).
- Unhandled promise rejections and uncaught exceptions are logged and trigger a graceful process exit.

---

## 9. Future Scope

- **CDN Integration:** Decorate `GitHubProvider` output URLs with jsDelivr/Cloudflare CDN prefix via an optional `CdnDecorator` wrapping the provider (Open/Closed, no provider code changes).
- **OneDrive Provider:** Implement `OneDriveProvider` conforming to `IStorageProvider` — zero changes to `AssetService`.
- **Event Streaming:** Publish asset lifecycle events (uploaded, deleted) to a message queue (Redis Pub/Sub or a lightweight event emitter) for client-side audit logging or webhooks.
