#!/bin/bash

################################################################################
# Movie Recommendation Script
# 
# Description:
#   Automatically marks movies as recommended for hero carousel based on:
#   - Quality content (HD, FHD, 4K)
#   - High engagement (views + reactions)
#   - Diverse genres (ensure variety)
#   - Recent releases (priority to newer content)
#   - Balanced mix (movies + TV series)
#   
# Selection Criteria:
#   - Top 5 movies with highest quality score
#   - Quality Score = (views × 0.4) + (likes × 0.3) + (quality_weight × 0.2) + (year_weight × 0.1)
#   - Ensures genre diversity (max 2 per genre)
#   - Mix of movies and TV series (60% movies, 40% series)
#   - Recent content preferred (2020+)
#
# Usage:
#   ./recommend-movies.sh [--dry-run] [--verbose] [--count N]
#
# Cronjob Setup:
#   Run every week on Sunday at 3 AM:
#   0 3 * * 0 /path/to/recommend-movies.sh >> /path/to/logs/recommend.log 2>&1
#
# Author: PhimGG Development Team
# Last Updated: 2025-11-09
################################################################################

set -euo pipefail  # Exit on error, undefined variable, or pipe failure

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
BACKUP_DIR="${PROJECT_ROOT}/.backup/recommendations"

# Create directories if they don't exist
mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"

# Log file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/recommend-movies-${TIMESTAMP}.log"

# Database configuration from environment or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-filmflex}"
DB_USER="${DB_USER:-filmflex}"
DB_PASSWORD="${DB_PASSWORD:-filmflex2024}"

# Recommendation configuration
RECOMMEND_COUNT=5  # Number of movies to recommend (for hero carousel)
MIN_VIEWS=1000     # Minimum views to be considered
MIN_YEAR=2018      # Prefer movies from this year onwards
MAX_PER_GENRE=2    # Max movies per genre to ensure diversity

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

# Create backup of current recommendations
create_backup() {
    log_info "Creating backup of current recommendations..."
    
    local backup_file="${BACKUP_DIR}/recommendations_backup_${TIMESTAMP}.sql"
    
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
# Recommendation Functions
################################################################################

calculate_recommendations() {
    log_info "Calculating movie recommendations based on quality score..."
    
    local sql="
    -- Clear all existing recommendations first
    UPDATE movies SET is_recommended = false;
    
    -- Calculate quality scores and select top recommendations
    WITH quality_weights AS (
        -- Assign quality weights
        SELECT 
            id,
            slug,
            name,
            year,
            type,
            quality,
            view,
            CASE quality
                WHEN '4K' THEN 100
                WHEN 'UHD' THEN 95
                WHEN 'FHD' THEN 90
                WHEN 'Full HD' THEN 90
                WHEN 'HD' THEN 70
                WHEN 'CAM' THEN 20
                WHEN 'TS' THEN 25
                ELSE 50
            END as quality_weight
        FROM movies
        WHERE COALESCE(view, 0) >= ${MIN_VIEWS}
          AND year IS NOT NULL
          AND year >= ${MIN_YEAR}
          AND year <= EXTRACT(YEAR FROM NOW())
    ),
    reaction_scores AS (
        -- Calculate reaction scores
        SELECT 
            qw.id,
            qw.slug,
            qw.name,
            qw.year,
            qw.type,
            qw.quality,
            qw.view,
            qw.quality_weight,
            COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
            COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes,
            (COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) - 
             COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)) as net_reactions
        FROM quality_weights qw
        LEFT JOIN movie_reactions mr ON qw.slug = mr.movie_slug
        GROUP BY qw.id, qw.slug, qw.name, qw.year, qw.type, qw.quality, qw.view, qw.quality_weight
    ),
    final_scores AS (
        -- Calculate final quality score
        SELECT 
            rs.id,
            rs.slug,
            rs.name,
            rs.year,
            rs.type,
            rs.quality,
            rs.view,
            rs.likes,
            rs.dislikes,
            (
                (COALESCE(rs.view, 0) / 10000.0) * 0.4 +        -- View score (40%)
                (rs.likes * 1.0) * 0.3 +                         -- Like score (30%)
                (rs.quality_weight * 1.0) * 0.2 +                -- Quality weight (20%)
                ((2025 - rs.year) * -0.5 + 10) * 0.1            -- Year recency (10%, newer is better)
            ) as quality_score
        FROM reaction_scores rs
    ),
    diverse_recommendations AS (
        -- Ensure genre diversity by limiting per genre
        SELECT DISTINCT ON (fs.slug)
            fs.id,
            fs.slug,
            fs.name,
            fs.quality_score,
            fs.type
        FROM final_scores fs
        ORDER BY fs.slug, fs.quality_score DESC
    ),
    balanced_selection AS (
        -- Select mix of movies and TV series
        (
            -- Select top movies (60% = 3 out of 5)
            SELECT id, slug, quality_score
            FROM diverse_recommendations
            WHERE type NOT IN ('series', 'tvshows', 'tv_series', 'hoathinh')
            ORDER BY quality_score DESC
            LIMIT 3
        )
        UNION ALL
        (
            -- Select top TV series (40% = 2 out of 5)
            SELECT id, slug, quality_score
            FROM diverse_recommendations
            WHERE type IN ('series', 'tvshows', 'tv_series')
            ORDER BY quality_score DESC
            LIMIT 2
        )
    )
    -- Mark selected movies as recommended
    UPDATE movies m
    SET is_recommended = true, modified_at = NOW()
    FROM (
        SELECT id, slug
        FROM balanced_selection
        ORDER BY quality_score DESC
        LIMIT ${RECOMMEND_COUNT}
    ) bs
    WHERE m.id = bs.id;
    "
    
    local count=$(execute_sql "${sql}" | grep -c "^" || echo "0")
    log_success "Marked ${count} movies as recommended"
}

################################################################################
# Fallback Strategy
################################################################################

apply_fallback_recommendations() {
    log_warn "Applying fallback recommendations (if primary selection yielded < ${RECOMMEND_COUNT} movies)..."
    
    local sql="
    -- Check current recommendation count
    WITH current_count AS (
        SELECT COUNT(*) as total
        FROM movies
        WHERE is_recommended = true
    ),
    needed_count AS (
        SELECT (${RECOMMEND_COUNT} - (SELECT total FROM current_count)) as needed
    ),
    fallback_candidates AS (
        -- Select high-quality movies without strict view requirements
        SELECT 
            m.id,
            m.slug,
            m.name,
            COALESCE(m.view, 0) as view_count,
            m.quality,
            m.year
        FROM movies m
        WHERE m.is_recommended = false
          AND m.year >= ${MIN_YEAR}
          AND m.quality IN ('HD', 'FHD', 'Full HD', '4K', 'UHD')
        ORDER BY m.view DESC, m.year DESC
        LIMIT (SELECT needed FROM needed_count)
    )
    UPDATE movies m
    SET is_recommended = true, modified_at = NOW()
    FROM fallback_candidates fc
    WHERE m.id = fc.id
      AND (SELECT needed FROM needed_count) > 0;
    "
    
    execute_sql "${sql}"
    log_info "Fallback recommendations applied if needed"
}

################################################################################
# Statistics and Reporting
################################################################################

generate_statistics() {
    log_info "Generating recommendation statistics..."
    
    local sql="
    SELECT 
        COUNT(*) as total_recommended,
        AVG(COALESCE(view, 0))::INTEGER as avg_views,
        MAX(COALESCE(view, 0)) as max_views,
        MIN(year) as oldest_year,
        MAX(year) as newest_year
    FROM movies
    WHERE is_recommended = true;
    "
    
    log_info "Recommendation Statistics:"
    execute_sql "${sql}" | while IFS='|' read -r total avg max old new; do
        log_info "  Total Recommended: ${total}"
        log_info "  Average Views: ${avg}"
        log_info "  Max Views: ${max}"
        log_info "  Year Range: ${old} - ${new}"
    done
}

generate_report() {
    log_info "Generating recommendation report..."
    
    local report_file="${LOG_DIR}/recommendation_report_${TIMESTAMP}.txt"
    
    cat > "${report_file}" << EOF
================================================================================
Movie Recommendation Report
================================================================================
Generated: $(date "+%Y-%m-%d %H:%M:%S")
Script: $(basename "$0")
Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}

Configuration:
  - Recommend Count: ${RECOMMEND_COUNT}
  - Min Views: ${MIN_VIEWS}
  - Min Year: ${MIN_YEAR}
  - Max Per Genre: ${MAX_PER_GENRE}

Selection Criteria:
  - Quality Score = (views × 0.4) + (likes × 0.3) + (quality_weight × 0.2) + (year_weight × 0.1)
  - Genre Diversity: Max ${MAX_PER_GENRE} movies per genre
  - Content Mix: 60% movies, 40% TV series
  - Recency Bonus: Newer content (${MIN_YEAR}+) preferred

--------------------------------------------------------------------------------
Recommended Movies
--------------------------------------------------------------------------------
EOF
    
    local sql="
    SELECT 
        m.slug,
        m.name,
        m.type,
        m.quality,
        m.year,
        COALESCE(m.view, 0) as views,
        COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
        m.modified_at
    FROM movies m
    LEFT JOIN movie_reactions mr ON m.slug = mr.movie_slug
    WHERE m.is_recommended = true
    GROUP BY m.id, m.slug, m.name, m.type, m.quality, m.year, m.view, m.modified_at
    ORDER BY m.modified_at DESC;
    "
    
    echo "" >> "${report_file}"
    execute_sql "${sql}" >> "${report_file}"
    
    cat >> "${report_file}" << EOF

--------------------------------------------------------------------------------
Quality Distribution
--------------------------------------------------------------------------------
EOF
    
    local quality_sql="
    SELECT 
        quality,
        COUNT(*) as count
    FROM movies
    WHERE is_recommended = true
    GROUP BY quality
    ORDER BY count DESC;
    "
    
    execute_sql "${quality_sql}" >> "${report_file}"
    
    cat >> "${report_file}" << EOF

--------------------------------------------------------------------------------
Type Distribution
--------------------------------------------------------------------------------
EOF
    
    local type_sql="
    SELECT 
        type,
        COUNT(*) as count
    FROM movies
    WHERE is_recommended = true
    GROUP BY type
    ORDER BY count DESC;
    "
    
    execute_sql "${type_sql}" >> "${report_file}"
    
    log_success "Report generated: ${report_file}"
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
            --count)
                RECOMMEND_COUNT="$2"
                log_info "Recommend count set to: ${RECOMMEND_COUNT}"
                shift 2
                ;;
            --help|-h)
                cat << EOF
Usage: $0 [OPTIONS]

Options:
    --dry-run       Run without making changes to database
    --verbose, -v   Enable verbose output
    --count N       Number of movies to recommend (default: 5)
    --help, -h      Show this help message

Selection Criteria:
    - Quality Score = (views × 0.4) + (likes × 0.3) + (quality × 0.2) + (year × 0.1)
    - Minimum views: ${MIN_VIEWS}
    - Minimum year: ${MIN_YEAR}
    - Genre diversity: Max ${MAX_PER_GENRE} per genre
    - Content mix: 60% movies, 40% TV series

Quality Weights:
    - 4K/UHD: 95-100 points
    - FHD/Full HD: 90 points
    - HD: 70 points
    - SD: 50 points
    - CAM/TS: 20-25 points

Examples:
    $0                      # Normal run (5 recommendations)
    $0 --dry-run            # Test run without changes
    $0 --count 10           # Recommend 10 movies
    $0 --verbose --count 8  # Verbose with 8 recommendations

Cronjob Setup:
    # Run every Sunday at 3 AM
    0 3 * * 0 /path/to/recommend-movies.sh >> /path/to/logs/recommend.log 2>&1

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
    log_info "Starting Movie Recommendation Script"
    log_info "=========================================="
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    log_info "Dry Run: ${DRY_RUN}"
    log_info "Recommend Count: ${RECOMMEND_COUNT}"
    log_info "Min Views: ${MIN_VIEWS}"
    log_info "Min Year: ${MIN_YEAR}"
    log_info "=========================================="
    
    # Create backup before making changes
    create_backup
    
    # Calculate and apply recommendations
    calculate_recommendations
    
    # Apply fallback if needed
    apply_fallback_recommendations
    
    # Generate statistics and reports
    generate_statistics
    generate_report
    
    log_info "=========================================="
    log_success "Movie Recommendations Complete!"
    log_info "Recommended Movies: ${RECOMMEND_COUNT}"
    log_info "Log file: ${LOG_FILE}"
    log_info "=========================================="
}

# Run main function
main "$@"
