#!/bin/bash

################################################################################
# Docker Wrapper for Movie Categorization Script
# 
# Description:
#   Runs the categorization script inside the PostgreSQL Docker container
#   This is used on production servers where database is in Docker
#   
#   Manages 4 sections: Trending, Latest, Top Rated, Popular TV
#   Note: Anime section uses backend fallback (no script needed)
#
# Usage:
#   ./categorize-movies-docker.sh [--dry-run] [--verbose]
#
# Examples:
#   ./categorize-movies-docker.sh                # Normal run
#   ./categorize-movies-docker.sh --dry-run      # Test without changes
#   ./categorize-movies-docker.sh --verbose      # Detailed logging
#
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Docker container name for PostgreSQL
DOCKER_CONTAINER="${DOCKER_CONTAINER:-filmflex-postgres}"

echo "=========================================="
echo "Movie Categorization (Docker Mode)"
echo "=========================================="
echo "Container: ${DOCKER_CONTAINER}"
echo "Sections: 4 (Trending, Latest, Top Rated, Popular TV)"
echo "Note: Anime uses backend fallback"
echo "=========================================="
echo ""

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER}$"; then
    echo "❌ Error: Docker container '${DOCKER_CONTAINER}' is not running"
    echo ""
    echo "Available containers:"
    docker ps --format "  - {{.Names}} ({{.Status}})"
    exit 1
fi

echo "✅ Docker container is running"
echo ""

# Copy script into container
echo "📋 Copying categorization script to container..."
docker cp "${SCRIPT_DIR}/categorize-movies.sh" "${DOCKER_CONTAINER}:/tmp/"

# Make script executable
echo "🔧 Making script executable..."
docker exec "${DOCKER_CONTAINER}" chmod +x /tmp/categorize-movies.sh

# Run script inside container with all arguments passed through
echo "🚀 Running categorization script..."
echo ""

docker exec -e DB_HOST=localhost \
    -e DB_PORT=5432 \
    -e DB_NAME=filmflex \
    -e DB_USER=filmflex \
    -e DB_PASSWORD=filmflex2024 \
    "${DOCKER_CONTAINER}" \
    /tmp/categorize-movies.sh "$@"

EXIT_CODE=$?

echo ""
echo "=========================================="

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Categorization completed successfully!"
    
    # Try to copy logs back to host
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    LOG_PATTERN="categorize-movies-*.log"
    
    echo ""
    echo "📝 Copying logs from container..."
    
    # Get the most recent log file
    RECENT_LOG=$(docker exec "${DOCKER_CONTAINER}" sh -c "ls -t /logs/${LOG_PATTERN} 2>/dev/null | head -1" || echo "")
    
    if [ -n "$RECENT_LOG" ]; then
        mkdir -p "${PROJECT_ROOT}/logs"
        docker cp "${DOCKER_CONTAINER}:${RECENT_LOG}" "${PROJECT_ROOT}/logs/" 2>/dev/null || true
        echo "   Log copied to: ${PROJECT_ROOT}/logs/$(basename ${RECENT_LOG})"
    else
        echo "   ⚠️  No log file found in container"
    fi
    
    echo ""
    echo "📊 Section Summary:"
    echo "   ✅ 4 sections categorized (Trending, Latest, Top Rated, Popular TV)"
    echo "   ℹ️  Anime: Backend fallback (always current)"
    
else
    echo "❌ Categorization failed with exit code: $EXIT_CODE"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check container logs: docker logs ${DOCKER_CONTAINER}"
    echo "  2. Verify database connection"
    echo "  3. Run with --verbose for detailed output"
fi

echo "=========================================="
echo ""

exit $EXIT_CODE
