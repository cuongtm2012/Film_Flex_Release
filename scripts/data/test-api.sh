#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API endpoints
API_BASE_URL="https://phimapi.com"
MOVIE_LIST_ENDPOINT="/danh-sach/phim-moi-cap-nhat"

echo -e "${BLUE}Testing API connectivity${NC}"

# Test movie list endpoint
echo -e "${BLUE}Testing movie list endpoint: ${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=1${NC}"
curl -s "${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=1" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
  -H "Accept: application/json" \
  -H "Referer: ${API_BASE_URL}" \
  -H "Connection: keep-alive" -o movielist.json

# Check response
echo -e "${BLUE}Response for movie list (first 100 characters):${NC}"
head -c 100 movielist.json
echo

# Validate JSON
if jq -e . movielist.json >/dev/null 2>&1; then
  echo -e "${GREEN}Response is valid JSON${NC}"
else
  echo -e "${RED}Response is NOT valid JSON${NC}"
  echo -e "${BLUE}First 300 characters of response:${NC}"
  head -c 300 movielist.json
  echo
fi

# Check for specific movie
echo -e "\n${BLUE}Testing movie detail endpoint: ${API_BASE_URL}/phim/ngoi-den-ky-quai-4${NC}"
curl -s "${API_BASE_URL}/phim/ngoi-den-ky-quai-4" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
  -H "Accept: application/json" \
  -H "Referer: ${API_BASE_URL}" \
  -H "Connection: keep-alive" -o moviedetail.json

echo -e "${BLUE}Response for movie detail (first 100 characters):${NC}"
head -c 100 moviedetail.json
echo

# Validate JSON
if jq -e . moviedetail.json >/dev/null 2>&1; then
  echo -e "${GREEN}Response is valid JSON${NC}"
else
  echo -e "${RED}Response is NOT valid JSON${NC}"
  echo -e "${BLUE}First 300 characters of response:${NC}"
  head -c 300 moviedetail.json
  echo
fi