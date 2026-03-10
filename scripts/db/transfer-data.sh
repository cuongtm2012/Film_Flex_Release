#!/bin/bash

# Simple PhimGG Data Transfer Script
# Transfers data from local database to Docker container using INSERT statements

set -e

echo "🚀 Starting PhimGG Data Transfer..."

# Configuration
DOCKER_CONTAINER="filmflex-postgres"
DOCKER_DB_USER="filmflex"
DOCKER_DB_NAME="filmflex"
LOCAL_DB_USER="postgres"
LOCAL_DB_NAME="filmflex"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Transfer Users (most important for authentication)
info "Transferring users data..."
psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "
SELECT 'INSERT INTO users (username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (' ||
  quote_literal(username) || ', ' ||
  COALESCE(quote_literal(password), 'NULL') || ', ' ||
  quote_literal(email) || ', ' ||
  quote_literal(role) || ', ' ||
  quote_literal(status) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  COALESCE(quote_literal(last_login::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(google_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(avatar), 'NULL') || ', ' ||
  COALESCE(quote_literal(display_name), 'NULL') || ');'
FROM users;
" | docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME

if [ $? -eq 0 ]; then
    USER_COUNT=$(docker exec $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    log "Users transferred: $USER_COUNT"
else
    error "Failed to transfer users"
fi

# Step 2: Transfer Movies (core content)
info "Transferring movies data..."
psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "
SELECT 'INSERT INTO movies (movie_id, slug, name, origin_name, poster_url, thumb_url, year, type, quality, lang, time, view, description, status, trailer_url, section, is_recommended, categories, countries, actors, directors, episode_current, episode_total, modified_at) VALUES (' ||
  quote_literal(movie_id) || ', ' ||
  quote_literal(slug) || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(origin_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(poster_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(thumb_url), 'NULL') || ', ' ||
  COALESCE(year::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(type), 'NULL') || ', ' ||
  COALESCE(quote_literal(quality), 'NULL') || ', ' ||
  COALESCE(quote_literal(lang), 'NULL') || ', ' ||
  COALESCE(quote_literal(time), 'NULL') || ', ' ||
  COALESCE(view::text, '0') || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  COALESCE(quote_literal(status), '''ongoing''') || ', ' ||
  COALESCE(quote_literal(trailer_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(COALESCE(section, sections)), 'NULL') || ', ' ||
  COALESCE(is_recommended::text, 'false') || ', ' ||
  COALESCE(quote_literal(categories::text), '''[]''') || ', ' ||
  COALESCE(quote_literal(countries::text), '''[]''') || ', ' ||
  COALESCE(quote_literal(actors), 'NULL') || ', ' ||
  COALESCE(quote_literal(directors), 'NULL') || ', ' ||
  COALESCE(quote_literal(episode_current), 'NULL') || ', ' ||
  COALESCE(quote_literal(episode_total), 'NULL') || ', ' ||
  quote_literal(modified_at::text) || ');'
FROM movies;
" | docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME

if [ $? -eq 0 ]; then
    MOVIE_COUNT=$(docker exec $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME -t -c "SELECT COUNT(*) FROM movies;" | tr -d ' ')
    log "Movies transferred: $MOVIE_COUNT"
else
    error "Failed to transfer movies"
fi

# Step 3: Transfer Episodes (video content)
info "Transferring episodes data..."
psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "
SELECT 'INSERT INTO episodes (name, slug, movie_slug, server_name, filename, link_embed, link_m3u8) VALUES (' ||
  quote_literal(name) || ', ' ||
  quote_literal(slug) || ', ' ||
  quote_literal(movie_slug) || ', ' ||
  quote_literal(server_name) || ', ' ||
  COALESCE(quote_literal(filename), 'NULL') || ', ' ||
  quote_literal(link_embed) || ', ' ||
  COALESCE(quote_literal(link_m3u8), 'NULL') || ');'
FROM episodes;
" | docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME

if [ $? -eq 0 ]; then
    EPISODE_COUNT=$(docker exec $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME -t -c "SELECT COUNT(*) FROM episodes;" | tr -d ' ')
    log "Episodes transferred: $EPISODE_COUNT"
else
    error "Failed to transfer episodes"
fi

# Step 4: Transfer Comments (user engagement)
info "Transferring comments data..."
psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "
SELECT 'INSERT INTO comments (user_id, movie_slug, content, likes, dislikes, created_at) VALUES (' ||
  user_id || ', ' ||
  quote_literal(movie_slug) || ', ' ||
  quote_literal(content) || ', ' ||
  COALESCE(likes::text, '0') || ', ' ||
  COALESCE(dislikes::text, '0') || ', ' ||
  quote_literal(created_at::text) || ');'
FROM comments;
" | docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME

if [ $? -eq 0 ]; then
    COMMENT_COUNT=$(docker exec $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME -t -c "SELECT COUNT(*) FROM comments;" | tr -d ' ')
    log "Comments transferred: $COMMENT_COUNT"
else
    error "Failed to transfer comments"
fi

# Step 5: Verify the transfer
echo ""
info "Verifying data transfer..."
echo "Data counts in Docker database:"
docker exec $DOCKER_CONTAINER psql -U $DOCKER_DB_USER -d $DOCKER_DB_NAME -c "
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'movies', COUNT(*) FROM movies  
UNION ALL
SELECT 'episodes', COUNT(*) FROM episodes
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
ORDER BY table_name;
"

echo ""
log "🎉 PhimGG data transfer completed!"
echo "Your Docker application now has all your local data."
echo "Test your app at: http://localhost:5000"