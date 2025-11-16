#!/bin/bash

################################################################################
# Test Script for Recommendation Preview
# Tests the preview_recommendations function to debug output issues
################################################################################

# Source database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD=""
DB_NAME="filmflex"

# Configuration
MIN_VIEWS=1000
MIN_YEAR=2018
RECOMMEND_COUNT=5

# PostgreSQL command (use docker if psql not available)
if command -v psql &> /dev/null; then
    PSQL_CMD="psql"
else
    # Use docker postgres container
    PSQL_CMD="docker exec -i filmflex-postgres psql"
    DB_HOST="localhost"
fi

################################################################################
# Test Functions
################################################################################

echo "=================================="
echo "Testing Recommendation Preview"
echo "=================================="
echo ""

# Test 1: Basic connection
echo "Test 1: Database Connection"
echo "----------------------------"
if [[ "${PSQL_CMD}" == "psql" ]]; then
    PGPASSWORD="${DB_PASSWORD}" ${PSQL_CMD} \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "SELECT version();" 2>&1 | head -1
else
    ${PSQL_CMD} -U "${DB_USER}" -d "${DB_NAME}" \
        -c "SELECT version();" 2>&1 | head -1
fi
echo ""

# Test 2: Count eligible movies
echo "Test 2: Count Eligible Movies"
echo "------------------------------"
if [[ "${PSQL_CMD}" == "psql" ]]; then
    PGPASSWORD="${DB_PASSWORD}" ${PSQL_CMD} \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t -A \
        -c "SELECT COUNT(*) FROM movies WHERE COALESCE(view, 0) >= ${MIN_VIEWS} AND year >= ${MIN_YEAR};"
else
    ${PSQL_CMD} -U "${DB_USER}" -d "${DB_NAME}" -t -A \
        -c "SELECT COUNT(*) FROM movies WHERE COALESCE(view, 0) >= ${MIN_VIEWS} AND year >= ${MIN_YEAR};"
fi
echo ""

# Test 3: Simple query with format
echo "Test 3: Simple Formatted Query"
echo "-------------------------------"
if [[ "${PSQL_CMD}" == "psql" ]]; then
    PGPASSWORD="${DB_PASSWORD}" ${PSQL_CMD} \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t -A -F'|' \
        -c "SELECT name, year, type, quality, view FROM movies WHERE COALESCE(view, 0) >= ${MIN_VIEWS} AND year >= ${MIN_YEAR} ORDER BY view DESC LIMIT 3;"
else
    ${PSQL_CMD} -U "${DB_USER}" -d "${DB_NAME}" -t -A -F'|' \
        -c "SELECT name, year, type, quality, view FROM movies WHERE COALESCE(view, 0) >= ${MIN_VIEWS} AND year >= ${MIN_YEAR} ORDER BY view DESC LIMIT 3;"
fi
echo ""

# Test 4: Preview query (simplified)
echo "Test 4: Preview Query (Simplified)"
echo "-----------------------------------"
preview_sql="
WITH quality_weights AS (
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
        COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes
    FROM quality_weights qw
    LEFT JOIN movie_reactions mr ON qw.slug = mr.movie_slug
    GROUP BY qw.id, qw.slug, qw.name, qw.year, qw.type, qw.quality, qw.view, qw.quality_weight
),
final_scores AS (
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
            (COALESCE(rs.view, 0) / 10000.0) * 0.3 +
            (rs.likes * 1.0) * 0.4 +
            (rs.quality_weight * 1.0) * 0.2 +
            (GREATEST(0, 10 - 0.5 * (EXTRACT(YEAR FROM NOW()) - rs.year))) * 0.1
        ) as quality_score
    FROM reaction_scores rs
)
SELECT 
    ROW_NUMBER() OVER (ORDER BY quality_score DESC) as rank,
    name,
    year,
    type,
    quality,
    view,
    likes,
    ROUND(quality_score::numeric, 2) as score
FROM final_scores
ORDER BY quality_score DESC
LIMIT ${RECOMMEND_COUNT};
"

if [[ "${PSQL_CMD}" == "psql" ]]; then
    PGPASSWORD="${DB_PASSWORD}" ${PSQL_CMD} \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t -A -F'|' \
        -c "${preview_sql}"
else
    ${PSQL_CMD} -U "${DB_USER}" -d "${DB_NAME}" -t -A -F'|' \
        -c "${preview_sql}"
fi
echo ""

# Test 5: Parse output
echo "Test 5: Parse Output"
echo "--------------------"
if [[ "${PSQL_CMD}" == "psql" ]]; then
    result=$(PGPASSWORD="${DB_PASSWORD}" ${PSQL_CMD} \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t -A -F'|' \
        -c "${preview_sql}" 2>&1 | grep -v "^$")
else
    result=$(${PSQL_CMD} -U "${DB_USER}" -d "${DB_NAME}" -t -A -F'|' \
        -c "${preview_sql}" 2>&1 | grep -v "^$")
fi

if [[ -n "${result}" ]]; then
    echo "Found results, parsing..."
    echo ""
    count=0
    while IFS='|' read -r rank name year type quality view likes score; do
        # Skip empty lines
        [[ -z "${rank}" ]] && continue
        
        count=$((count + 1))
        echo "  #${rank}. ${name}"
        echo "      Year: ${year} | Type: ${type} | Quality: ${quality}"
        echo "      Views: ${view} | Likes: ${likes} | Score: ${score}"
        echo ""
    done <<< "${result}"
    
    echo "Total movies parsed: ${count}"
else
    echo "No results found!"
fi

echo ""
echo "=================================="
echo "Test Complete"
echo "=================================="
