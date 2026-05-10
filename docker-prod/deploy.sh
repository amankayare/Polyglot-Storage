#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Production deployment script for Polyglot Storage Proxy
#
# Runs on the VPS. Called by the GitHub Actions workflow.
#
# Usage:
#   bash docker-prod/deploy.sh <rebuild_target> <branch>
#
# rebuild_target:
#   all   — rebuild everything (app + db)
#   app   — rebuild app container only
#   db    — restart db container only
#
# Prerequisites on VPS:
#   - Docker & Docker Compose installed
#   - .env file present at /opt/polyglot-storage/.env
#   - Repo cloned at /opt/polyglot-storage
# =============================================================================

set -euo pipefail

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Project root is one level up from docker-prod/
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

REBUILD_TARGET="${1:-all}"
DEPLOY_BRANCH="${2:-main}"
COMPOSE="docker compose -f ${SCRIPT_DIR}/docker-compose.yml --env-file ${SCRIPT_DIR}/.env"

echo "======================================================"
echo " Polyglot Storage — Production Deployment"
echo " Branch  : ${DEPLOY_BRANCH}"
echo " Target  : ${REBUILD_TARGET}"
echo " Dir     : ${APP_DIR}"
echo ""
echo "NOTE: Global-Proxy must already be running ('web-network' must exist)."
echo "======================================================"

cd "${APP_DIR}"

# -----------------------------------------------------------------------------
# Validate .env exists
# -----------------------------------------------------------------------------
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
  echo "ERROR: .env file not found at ${SCRIPT_DIR}/.env"
  echo "       Please create it before deploying."
  exit 1
fi

# -----------------------------------------------------------------------------
# Deploy based on target
# -----------------------------------------------------------------------------
case "${REBUILD_TARGET}" in
  all)
    echo ">>> Rebuilding all containers..."
    ${COMPOSE} build --no-cache app
    ${COMPOSE} up -d --remove-orphans
    ;;

  app)
    echo ">>> Rebuilding app container only..."
    ${COMPOSE} build --no-cache app
    ${COMPOSE} up -d --no-deps --remove-orphans app
    ;;

  db)
    echo ">>> Restarting db container only..."
    ${COMPOSE} restart db
    ;;

  *)
    echo "ERROR: Unknown rebuild target '${REBUILD_TARGET}'. Use: all | app | db"
    exit 1
    ;;
esac

# -----------------------------------------------------------------------------
# Wait for app health check
# -----------------------------------------------------------------------------
echo ">>> Waiting for app to become healthy..."
MAX_WAIT=60
ELAPSED=0
until ${COMPOSE} ps app | grep -q "healthy" || [ "${ELAPSED}" -ge "${MAX_WAIT}" ]; do
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "    ...waiting (${ELAPSED}s / ${MAX_WAIT}s)"
done

if [ "${ELAPSED}" -ge "${MAX_WAIT}" ]; then
  echo "WARNING: App did not become healthy within ${MAX_WAIT}s. Check logs:"
  ${COMPOSE} logs --tail=50 app
else
  echo ">>> App is healthy!"
fi

# -----------------------------------------------------------------------------
# Clean up unused images to free disk space
# -----------------------------------------------------------------------------
echo ">>> Pruning unused Docker images..."
docker image prune -f

echo "======================================================"
echo " Deployment complete! Branch: ${DEPLOY_BRANCH}"
echo "======================================================"
