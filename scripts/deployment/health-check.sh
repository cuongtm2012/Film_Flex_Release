#!/bin/bash
# Wrapper: gọi script health-check chung tại scripts/maintenance/health-check.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/../maintenance/health-check.sh" "$@"
