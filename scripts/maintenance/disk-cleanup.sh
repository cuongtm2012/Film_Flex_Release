#!/bin/bash
# Weekly disk cleanup - Docker, journal, apt cache
# Chạy từ cron: 0 4 * * 0 (Chủ nhật 4h sáng)

LOG_FILE="${LOG_FILE:-/var/log/filmflex/disk-cleanup.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "=== Disk cleanup started ==="

# Docker - xóa container/image/volume không dùng
log "Docker prune..."
docker system prune -f >> "$LOG_FILE" 2>&1
docker image prune -f >> "$LOG_FILE" 2>&1

# Journal - giữ 7 ngày
if command -v journalctl >/dev/null 2>&1; then
    log "Journal vacuum..."
    journalctl --vacuum-time=7d >> "$LOG_FILE" 2>&1
fi

# Apt cache (nếu có)
if command -v apt-get >/dev/null 2>&1; then
    log "Apt clean..."
    apt-get clean >> "$LOG_FILE" 2>&1
    apt-get autoclean -y >> "$LOG_FILE" 2>&1
fi

log "=== Disk cleanup finished ==="
df -h / >> "$LOG_FILE" 2>&1
