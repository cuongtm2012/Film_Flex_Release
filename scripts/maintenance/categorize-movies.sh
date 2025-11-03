#!/bin/bash

################################################################################
# Movie Section Categorizer Script
# 
# Description:
#   Automatically categorizes movies into homepage sections based on criteria:
#   - Trending: Movies from last year with high views
#   - Latest: Newest movies by release year + update time
#   - Top Rated: Movies with high ratings (likes) + high views
#   - Popular TV: TV Series with high views and ratings
#   
#   Note: Anime section is handled by backend fallback logic (no script needed)
#
# Usage:
#   ./categorize-movies.sh [--dry-run] [--verbose]
#
# Cronjob Setup:
#   Run every Monday at 6 AM:
#   0 6 * * 1 /path/to/categorize-movies.sh >> /path/to/logs/categorize.log 2>&1
#
# Author: PhimGG Development Team
# Last Updated: 2025-11-03
################################################################################

set -euo pipefail  # Exit on error, undefined variable, or pipe failure

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
CACHE_DIR="${PROJECT_ROOT}/.cache/sections"
BACKUP_DIR="${PROJECT_ROOT}/.backup/sections"

# Create directories if they don't exist
mkdir -p "${LOG_DIR}" "${CACHE_DIR}" "${BACKUP_DIR}"

# Log file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/categorize-movies-${TIMESTAMP}.log"

# Database configuration from environment or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-filmflex}"
DB_USER="${DB_USER:-filmflex}"
DB_PASSWORD="${DB_PASSWORD:-filmflex2024}"

# Section configuration
TRENDING_LIMIT=50
LATEST_LIMIT=50
TOP_RATED_LIMIT=50
POPULAR_TV_LIMIT=50

# Flags
DRY_RUN=false
VERBOSE=false

################################################################################
# Utility Functions
################################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
}

log_warn() {
    log "WARN" "$@"
}

log_error() {
    log "ERROR" "$@"
}

log_success() {
    log "SUCCESS" "$@"
}

log_debug() {
    if [[ "${VERBOSE}" == "true" ]]; then
        log "DEBUG" "$@"
    fi
}

# Execute PostgreSQL query
execute_sql() {
    local query="$1"
    local output_format="${2:-tuples-only}"  # Default: tuples-only, can be 'json' or 'csv'
    
    log_debug "Executing SQL: ${query:0:100}..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would execute SQL query"
        return 0
    fi
    
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -A \
        -c "${query}"
}

# Execute SQL from file
execute_sql_file() {
    local sql_file="$1"
    
    log_debug "Executing SQL file: ${sql_file}"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would execute SQL file: ${sql_file}"
        return 0
    fi
    
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -f "${sql_file}"
}

# Create backup of current sections
create_backup() {
    log_info "Creating backup of current movie sections..."
    
    local backup_file="${BACKUP_DIR}/sections_backup_${TIMESTAMP}.sql"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would create backup at: ${backup_file}"
        return 0
    fi
    
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --table=movies \
        --data-only \
        --column-inserts \
        > "${backup_file}"
    
    log_success "Backup created: ${backup_file}"
}

################################################################################
# Section Categorization Functions
################################################################################

categorize_trending() {
    log_info "Categorizing TRENDING movies..."
    
    local current_year=$(date +%Y)
    local last_year=$((current_year - 1))
    
    local sql="
    -- Clear existing trending section
    UPDATE movies SET section = NULL WHERE section = 'trending_now';
    
    -- Categorize trending movies (last year, high views)
    WITH trending_movies AS (
        SELECT DISTINCT ON (m.slug)
            m.id,
            m.slug,
            COALESCE(m.view, 0) as view_count,
            COUNT(DISTINCT mr.id) as reaction_count,
            (COALESCE(m.view, 0) * 0.7 + COUNT(DISTINCT mr.id) * 10 * 0.3) as trending_score
        FROM movies m
        LEFT JOIN movie_reactions mr ON m.slug = mr.movie_slug
        WHERE m.year >= ${last_year}
        GROUP BY m.id, m.slug
        ORDER BY m.slug, trending_score DESC
        LIMIT ${TRENDING_LIMIT}
    )
    UPDATE movies m
    SET section = 'trending_now', modified_at = NOW()
    FROM trending_movies tm
    WHERE m.id = tm.id;
    "
    
    local count=$(execute_sql "${sql}" | grep -c "^" || echo "0")
    log_success "Categorized ${count} movies as TRENDING"
}

categorize_latest() {
    log_info "Categorizing LATEST movies..."
    
    local current_year=$(date +%Y)
    
    local sql="
    -- Clear existing latest section (except trending)
    UPDATE movies SET section = NULL WHERE section = 'latest_movies';
    
    -- Categorize latest movies (newest by year + update time)
    WITH latest_movies AS (
        SELECT DISTINCT ON (m.slug)
            m.id,
            m.slug,
            (m.year * 1000 - EXTRACT(EPOCH FROM (NOW() - m.modified_at)) / 86400) as latest_score
        FROM movies m
        WHERE m.year IS NOT NULL 
          AND m.year > 1900 
          AND m.year <= ${current_year}
          AND (m.section IS NULL OR m.section != 'trending_now')
        ORDER BY m.slug, latest_score DESC
        LIMIT ${LATEST_LIMIT}
    )
    UPDATE movies m
    SET section = 'latest_movies', modified_at = NOW()
    FROM latest_movies lm
    WHERE m.id = lm.id;
    "
    
    local count=$(execute_sql "${sql}" | grep -c "^" || echo "0")
    log_success "Categorized ${count} movies as LATEST"
}

categorize_top_rated() {
    log_info "Categorizing TOP RATED movies..."
    
    local sql="
    -- Clear existing top rated section
    UPDATE movies SET section = NULL WHERE section = 'top_rated';
    
    -- Categorize top rated movies (high ratings + views)
    WITH top_rated_movies AS (
        SELECT DISTINCT ON (m.slug)
            m.id,
            m.slug,
            COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
            COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes,
            COALESCE(m.view, 0) as view_count,
            (
                (COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) - 
                 COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)) * 0.6 + 
                (COALESCE(m.view, 0) / 100.0) * 0.4
            ) as rating_score
        FROM movies m
        LEFT JOIN movie_reactions mr ON m.slug = mr.movie_slug
        WHERE COALESCE(m.view, 0) > 100
          AND (m.section IS NULL OR m.section NOT IN ('trending_now', 'latest_movies'))
        GROUP BY m.id, m.slug
        ORDER BY m.slug, rating_score DESC
        LIMIT ${TOP_RATED_LIMIT}
    )
    UPDATE movies m
    SET section = 'top_rated', modified_at = NOW()
    FROM top_rated_movies trm
    WHERE m.id = trm.id;
    "
    
    local count=$(execute_sql "${sql}" | grep -c "^" || echo "0")
    log_success "Categorized ${count} movies as TOP RATED"
}

categorize_popular_tv() {
    log_info "Categorizing POPULAR TV SERIES..."
    
    local sql="
    -- Clear existing popular TV section
    UPDATE movies SET section = NULL WHERE section = 'popular_tv';
    
    -- Categorize popular TV series (series type + high views + ratings)
    -- Only keep the latest season/part for multi-season series
    WITH series_base_names AS (
        -- Extract base name by removing season/part patterns
        SELECT 
            m.id,
            m.slug,
            m.name,
            m.year,
            -- Remove patterns like (Phần 1), (Season 1), (Mùa 1), etc.
            REGEXP_REPLACE(
                m.name, 
                '\\s*\\((Phần|Season|Mùa|Part)\\s*[0-9]+\\)\\s*$', 
                '', 
                'i'
            ) as base_name,
            COALESCE(m.view, 0) as view_count,
            m.type,
            m.episode_total,
            m.episode_current,
            m.section
        FROM movies m
        WHERE (
            m.type IN ('series', 'tvshows', 'tv_series')
        )
        AND m.type != 'hoathinh'
        AND (m.section IS NULL OR m.section NOT IN ('trending_now', 'latest_movies', 'top_rated'))
    ),
    series_with_reactions AS (
        -- Add reaction counts
        SELECT 
            sbn.id,
            sbn.slug,
            sbn.name,
            sbn.base_name,
            sbn.year,
            sbn.view_count,
            COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
            COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes,
            (
                sbn.view_count * 0.5 + 
                (COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) - 
                 COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)) * 0.5
            ) as popularity_score
        FROM series_base_names sbn
        LEFT JOIN movie_reactions mr ON sbn.slug = mr.movie_slug
        GROUP BY sbn.id, sbn.slug, sbn.name, sbn.base_name, sbn.year, sbn.view_count
    ),
    latest_seasons_only AS (
        -- For each base_name, only keep the latest year (newest season)
        SELECT DISTINCT ON (base_name)
            id,
            slug,
            popularity_score
        FROM series_with_reactions
        ORDER BY base_name, year DESC NULLS LAST, popularity_score DESC
    ),
    top_popular_tv AS (
        -- Select top N by popularity score
        SELECT id, slug
        FROM latest_seasons_only
        ORDER BY popularity_score DESC
        LIMIT ${POPULAR_TV_LIMIT}
    )
    UPDATE movies m
    SET section = 'popular_tv', modified_at = NOW()
    FROM top_popular_tv tpt
    WHERE m.id = tpt.id;
    "
    
    local count=$(execute_sql "${sql}" | grep -c "^" || echo "0")
    log_success "Categorized ${count} movies as POPULAR TV (unique series only)"
}

################################################################################
# Statistics and Reporting
################################################################################

generate_statistics() {
    log_info "Generating categorization statistics..."
    
    local sql="
    SELECT 
        COALESCE(section, 'uncategorized') as section,
        COUNT(*) as count
    FROM movies
    GROUP BY section
    ORDER BY count DESC;
    "
    
    log_info "Section Distribution:"
    execute_sql "${sql}" | while IFS='|' read -r section count; do
        log_info "  ${section}: ${count} movies"
    done
}

generate_report() {
    log_info "Generating categorization report..."
    
    local report_file="${LOG_DIR}/categorization_report_${TIMESTAMP}.txt"
    
    cat > "${report_file}" << EOF
================================================================================
Movie Categorization Report
================================================================================
Generated: $(date "+%Y-%m-%d %H:%M:%S")
Script: $(basename "$0")
Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}

Sections Managed: 4 (Trending, Latest, Top Rated, Popular TV)
Note: Anime section uses backend fallback logic (type='hoathinh' or categories)

--------------------------------------------------------------------------------
Categorization Summary
--------------------------------------------------------------------------------
EOF
    
    local sql="
    SELECT 
        COALESCE(section, 'uncategorized') as section,
        COUNT(*) as total,
        AVG(COALESCE(view, 0))::INTEGER as avg_views,
        MAX(COALESCE(view, 0)) as max_views,
        MIN(year) as oldest_year,
        MAX(year) as newest_year
    FROM movies
    GROUP BY section
    ORDER BY total DESC;
    "
    
    echo "" >> "${report_file}"
    execute_sql "${sql}" >> "${report_file}"
    
    cat >> "${report_file}" << EOF

--------------------------------------------------------------------------------
Anime Section Info (Backend Fallback)
--------------------------------------------------------------------------------
Anime movies are automatically detected by backend API using:
  - type = 'hoathinh' OR
  - categories containing 'anime' or 'hoạt hình'

This approach provides better flexibility and doesn't require script updates.

--------------------------------------------------------------------------------
Recent Changes
--------------------------------------------------------------------------------
EOF
    
    local changes_sql="
    SELECT 
        slug,
        name,
        section,
        year,
        view,
        modified_at
    FROM movies
    WHERE modified_at >= NOW() - INTERVAL '1 hour'
    ORDER BY modified_at DESC
    LIMIT 50;
    "
    
    execute_sql "${changes_sql}" >> "${report_file}"
    
    log_success "Report generated: ${report_file}"
}

################################################################################
# Cache Management
################################################################################

update_cache() {
    log_info "Updating section cache files..."
    
    # Only cache the 4 managed sections (no anime)
    local sections=("trending_now" "latest_movies" "top_rated" "popular_tv")
    
    for section in "${sections[@]}"; do
        local cache_file="${CACHE_DIR}/${section}.json"
        
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY RUN] Would update cache: ${cache_file}"
            continue
        fi
        
        local sql="
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT 
                slug,
                name,
                poster_url,
                thumb_url,
                year,
                type,
                quality,
                view,
                episode_current,
                episode_total
            FROM movies
            WHERE section = '${section}'
            ORDER BY modified_at DESC
            LIMIT 50
        ) t;
        "
        
        execute_sql "${sql}" > "${cache_file}"
        log_debug "Cache updated: ${cache_file}"
    done
    
    log_success "Cache files updated (4 sections)"
    log_info "Note: Anime cache not generated (uses backend fallback)"
}

################################################################################
# Main Execution
################################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                log_info "Running in DRY RUN mode"
                shift
                ;;
            --verbose|-v)
                VERBOSE=true
                log_info "Verbose mode enabled"
                shift
                ;;
            --help|-h)
                cat << EOF
Usage: $0 [OPTIONS]

Options:
    --dry-run       Run without making changes to database
    --verbose, -v   Enable verbose output
    --help, -h      Show this help message

Sections Managed:
    - Trending      Movies from last year with high views
    - Latest        Newest movies by release year + update time
    - Top Rated     Movies with high ratings + views
    - Popular TV    TV series with high views + ratings

Note: Anime section is handled by backend fallback logic
      (searches for type='hoathinh' or categories containing anime)

Examples:
    $0                    # Normal run
    $0 --dry-run          # Test run without changes
    $0 --verbose          # Run with detailed logs

Cronjob Setup:
    # Run every Monday at 6 AM
    0 6 * * 1 /path/to/categorize-movies.sh >> /path/to/logs/categorize.log 2>&1

EOF
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

main() {
    parse_arguments "$@"
    
    log_info "=========================================="
    log_info "Starting Movie Categorization Script"
    log_info "=========================================="
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    log_info "Dry Run: ${DRY_RUN}"
    log_info "Sections: 4 (Trending, Latest, Top Rated, Popular TV)"
    log_info "Note: Anime uses backend fallback"
    log_info "=========================================="
    
    # Create backup before making changes
    create_backup
    
    # Categorize movies into 4 sections only
    categorize_trending
    categorize_latest
    categorize_top_rated
    categorize_popular_tv
    
    # Generate statistics and reports
    generate_statistics
    generate_report
    
    # Update cache files (4 sections only)
    update_cache
    
    log_info "=========================================="
    log_success "Movie Categorization Complete!"
    log_info "Categorized: 4 sections"
    log_info "Anime: Backend fallback (no script needed)"
    log_info "Log file: ${LOG_FILE}"
    log_info "=========================================="
}

# Run main function
main "$@"
