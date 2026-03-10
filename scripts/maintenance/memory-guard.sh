#!/bin/bash
# Memory Guard - kiểm tra RAM và tự động giảm tải khi sắp hết (tránh OOM).
# Chạy từ cron mỗi 10–15 phút. Cần root để restart container.
#
# Cách dùng:
#   ./memory-guard.sh           # chỉ kiểm tra và ghi log
#   ./memory-guard.sh --auto    # khi critical: restart Elasticsearch (và có thể thêm app nếu cần)
#   ./memory-guard.sh --setup-swap  # nếu chưa có swap thì tạo 2G (một lần)
#
# Cron (chạy mỗi 10 phút, có auto-action):
#   */10 * * * * root /root/Film_Flex_Release/scripts/maintenance/memory-guard.sh --auto >> /var/log/filmflex/memory-guard.log 2>&1

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${LOG_FILE:-/var/log/filmflex/memory-guard-$(date +%Y%m%d).log}"
# Ngưỡng: available memory (MB) dưới mức này = critical
AVAIL_CRITICAL_MB="${AVAIL_CRITICAL_MB:-80}"
AVAIL_WARN_MB="${AVAIL_WARN_MB:-200}"
# Container ưu tiên restart khi thiếu RAM (ES thường ăn nhiều nhất)
RESTART_CONTAINER_CRITICAL="${RESTART_CONTAINER_CRITICAL:-filmflex-elasticsearch}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo -e "$msg" | tee -a "$LOG_FILE"
}

# Lấy available memory (MB) - cột "available" từ `free`
get_available_mb() {
  free -m | awk 'NR==2{print $7}'
}

# Kiểm tra có swap đang dùng không
has_swap() {
  [ "$(awk '/^SwapTotal:/{print $2}' /proc/meminfo)" -gt 0 ] && grep -q . /proc/swaps 2>/dev/null
}

do_setup_swap() {
  local setup_script="${SCRIPT_DIR}/setup-swap.sh"
  if [ -x "$setup_script" ]; then
    log "Chạy setup swap..."
    "$setup_script" 2>&1 | tee -a "$LOG_FILE"
  else
    log "${YELLOW}Không tìm thấy $setup_script${NC}"
  fi
}

do_restart_container() {
  local name="$1"
  if docker ps --format '{{.Names}}' | grep -qx "$name"; then
    log "${YELLOW}Restart container: $name${NC}"
    docker restart "$name" >> "$LOG_FILE" 2>&1 && log "${GREEN}Đã restart $name${NC}" || log "${RED}Restart $name thất bại${NC}"
  else
    log "Container $name không chạy, bỏ qua."
  fi
}

AUTO=""
SETUP_SWAP=""
for arg in "$@"; do
  case "$arg" in
    --auto)        AUTO=1 ;;
    --setup-swap)  SETUP_SWAP=1 ;;
  esac
done

AVAIL=$(get_available_mb)
TOTAL_MB=$(free -m | awk 'NR==2{print $2}')
USED_PCT=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')

log "Memory: available=${AVAIL}MB, used=${USED_PCT}%, total=${TOTAL_MB}MB"

# (Tùy chọn) Một lần: nếu không có swap và available thấp thì gợi ý / tự tạo swap
if [ -n "$SETUP_SWAP" ]; then
  if ! has_swap; then
    do_setup_swap
  else
    log "Đã có swap, bỏ qua setup."
  fi
  exit 0
fi

# Cảnh báo khi available thấp
if [ "$AVAIL" -lt "$AVAIL_CRITICAL_MB" ]; then
  log "${RED}CRITICAL: Available memory ${AVAIL}MB < ${AVAIL_CRITICAL_MB}MB${NC}"
  if ! has_swap; then
    log "${YELLOW}Không có swap. Chạy: $0 --setup-swap (hoặc scripts/maintenance/setup-swap.sh)${NC}"
  fi
  if [ -n "$AUTO" ]; then
    do_restart_container "$RESTART_CONTAINER_CRITICAL"
    sleep 5
    AVAIL_AFTER=$(get_available_mb)
    log "Sau restart: available=${AVAIL_AFTER}MB"
  fi
  exit 2
fi

if [ "$AVAIL" -lt "$AVAIL_WARN_MB" ]; then
  log "${YELLOW}WARNING: Available memory ${AVAIL}MB < ${AVAIL_WARN_MB}MB${NC}"
  if ! has_swap; then
    log "Gợi ý: thêm swap: sudo $0 --setup-swap"
  fi
  exit 1
fi

log "${GREEN}Memory OK (available=${AVAIL}MB)${NC}"
exit 0
