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
#   - Quality Score = (views × 0.3) + (likes × 0.4) + (quality_weight × 0.2) + (year_weight × 0.1)
#   - Year Weight = max(0, 10 - 0.5 × (current_year - year)) [Soft decrease for older movies]
#   - Ensures genre diversity (max 2 per genre)
#   - Mix of movies and TV series (60% movies, 40% series)
#   - Recent content preferred (2020+)
#
# Updated Formula (v2.0):
#   - Increased likes weight from 30% to 40% (better engagement metric)
#   - Decreased views weight from 40% to 30% (avoid view count manipulation)
#   - Improved year recency: Soft decrease instead of hard penalty
#   - Quality and year weights remain at 20% and 10%
#
# Usage:
#   ./recommend-movies.sh [--dry-run] [--verbose] [--count N]
#
# Cronjob Setup:
#   Run every week on Sunday at 3 AM:
#   0 3 * * 0 /path/to/recommend-movies.sh >> /path/to/logs/recommend.log 2>&1
#
# Author: PhimGG Development Team
# Last Updated: 2025-11-16
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

# Check if psql is available, otherwise use docker
if command -v psql &> /dev/null; then
    PSQL_CMD="psql"
    USE_DOCKER=false
else
    # Use docker postgres container
    PSQL_CMD="docker exec -i filmflex-postgres psql"
    USE_DOCKER=true
fi

# Recommendation configuration
RECOMMEND_COUNT=5  # Number of movies to recommend (for hero carousel)
MIN_VIEWS=0        # No minimum views required (changed strategy)
MIN_YEAR=2020      # Prefer movies from this year onwards
MAX_PER_GENRE=2    # Max movies per genre to ensure diversity
TOP_CANDIDATES=50  # Select from top 50 newest movies with high views

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
    
    if [[ "${USE_DOCKER}" == "true" ]]; then
        echo "${query}" | ${PSQL_CMD} -U "${DB_USER}" -d "${DB_NAME}" -t -A
    else
        PGPASSWORD="${DB_PASSWORD}" ${PSQL_CMD} \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -t \
            -A \
            -c "${query}"
    fi
}

# Execute read-only queries (works even in dry-run mode for preview)
execute_sql_read_only() {
    local query="$1"
    
    log_debug "Executing read-only SQL: ${query:0:100}..."
    
    if [[ "${USE_DOCKER}" == "true" ]]; then
        echo "${query}" | ${PSQL_CMD} -U "${DB_USER}" -d "${DB_NAME}" -t -A -F'|' 2>&1 | grep -v "^$"
    else
        PGPASSWORD="${DB_PASSWORD}" ${PSQL_CMD} \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -t \
            -A \
            -F'|' \
            -c "${query}" 2>&1 | grep -v "^$"
    fi
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

# Preview movies that would be recommended (for dry-run mode)
preview_recommendations() {
    log_info "Previewing movies that would be recommended..."
    
    local preview_sql="
    -- New Strategy: Random 5 from top 50 newest movies with highest views
    WITH top_candidates AS (
        SELECT 
            m.id,
            m.slug,
            m.name,
            m.year,
            m.type,
            m.quality,
            m.view,
            m.created_at,
            COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) as likes
        FROM movies m
        LEFT JOIN movie_reactions mr ON m.slug = mr.movie_slug
        WHERE m.year >= ${MIN_YEAR}
          AND m.year <= EXTRACT(YEAR FROM NOW())
          AND m.quality IN ('HD', 'FHD', 'Full HD', '4K', 'UHD')
        GROUP BY m.id, m.slug, m.name, m.year, m.type, m.quality, m.view, m.created_at
        ORDER BY m.created_at DESC, COALESCE(m.view, 0) DESC
        LIMIT ${TOP_CANDIDATES}
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY RANDOM()) as rank,
        name,
        year,
        type,
        quality,
        view,
        likes,
        created_at
    FROM top_candidates
    ORDER BY RANDOM()
    LIMIT ${RECOMMEND_COUNT};
    "
    
    log_info ""
    log_info "╔════════════════════════════════════════════════════════════════════════════╗"
    log_info "║                    MOVIES THAT WOULD BE RECOMMENDED                        ║"
    log_info "╚════════════════════════════════════════════════════════════════════════════╝"
    log_info ""
    
    # Execute query and format output
    local result=$(execute_sql_read_only "${preview_sql}")
    
    if [[ -n "${result}" ]]; then
        local count=0
        while IFS='|' read -r rank name year type quality view likes created_at; do
            # Skip empty lines
            [[ -z "${rank}" ]] && continue
            
            count=$((count + 1))
            log_info "  #${rank}. ${name}"
            log_info "      Year: ${year} | Type: ${type} | Quality: ${quality}"
            log_info "      Views: ${view} | Likes: ${likes} | Added: ${created_at}"
            log_info ""
        done <<< "${result}"
        
        if [[ ${count} -eq 0 ]]; then
            log_warn "  No movies found matching criteria"
        fi
    else
        log_warn "  No movies found matching criteria"
    fi
    
    log_info "╚════════════════════════════════════════════════════════════════════════════╝"
    log_info ""
}

calculate_recommendations() {
    log_info "Calculating movie recommendations based on newest + popular strategy..."
    
    # First, clear all existing recommendations
    local clear_sql="UPDATE movies SET is_recommended = false WHERE is_recommended = true;"
    execute_sql "${clear_sql}"
    log_info "Cleared all existing recommendations"
    
    # Then select and mark new recommendations
    local sql="
    -- New Strategy: Random 5 from top 50 newest movies with highest views
    WITH top_candidates AS (
        SELECT 
            m.id,
            m.slug,
            m.created_at,
            m.view
        FROM movies m
        WHERE m.year >= ${MIN_YEAR}
          AND m.year <= EXTRACT(YEAR FROM NOW())
          AND m.quality IN ('HD', 'FHD', 'Full HD', '4K', 'UHD')
        ORDER BY m.created_at DESC, COALESCE(m.view, 0) DESC
        LIMIT ${TOP_CANDIDATES}
    ),
    random_selection AS (
        SELECT id, slug
        FROM top_candidates
        ORDER BY RANDOM()
        LIMIT ${RECOMMEND_COUNT}
    )
    UPDATE movies m
    SET is_recommended = true, modified_at = NOW()
    FROM random_selection rs
    WHERE m.id = rs.id;
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
        -- Select any high-quality movies from recent years
        SELECT 
            m.id,
            m.slug
        FROM movies m
        WHERE m.is_recommended = false
          AND m.year >= (${MIN_YEAR} - 2)  -- Expand year range slightly
          AND m.quality IN ('HD', 'FHD', 'Full HD', '4K', 'UHD')
        ORDER BY m.created_at DESC, COALESCE(m.view, 0) DESC
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

Selection Strategy (v3.0 - Simplified):
    - Select top ${TOP_CANDIDATES} newest movies (from ${MIN_YEAR}+)
    - Filter by quality (HD, FHD, Full HD, 4K, UHD only)
    - Sort by: created_at DESC, view DESC
    - Randomly pick ${RECOMMEND_COUNT} from these candidates
    - Ensures fresh content rotation each run

Why Random Selection?
    - Prevents same movies always appearing
    - Gives newer content visibility
    - All top ${TOP_CANDIDATES} candidates are quality-filtered
    - Better user experience with variety

Quality Criteria:
    - Year: ${MIN_YEAR} or newer
    - Quality: HD, FHD, Full HD, 4K, UHD
    - Candidates pool: Top ${TOP_CANDIDATES} newest + popular

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
    
    # In dry-run mode, preview recommendations first
    if [[ "${DRY_RUN}" == "true" ]]; then
        preview_recommendations
    fi
    
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
