#!/bin/bash
# One-time: tạo swap file 2GB trên server để tránh OOM khi RAM đầy.
# Chạy với quyền root: sudo bash scripts/maintenance/setup-swap.sh

set -e
SWAP_FILE="${SWAP_FILE:-/swapfile}"
SWAP_GB="${SWAP_GB:-2}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  log "${RED}Chạy với root: sudo bash $0${NC}"
  exit 1
fi

if [ -f "$SWAP_FILE" ] && grep -q "$SWAP_FILE" /proc/swaps 2>/dev/null; then
  log "${GREEN}Swap đã tồn tại và đang bật.${NC}"
  swapon --show
  exit 0
fi

if [ -f "$SWAP_FILE" ]; then
  log "${YELLOW}$SWAP_FILE đã tồn tại nhưng chưa bật. Bật swap...${NC}"
  chmod 600 "$SWAP_FILE"
  swapon "$SWAP_FILE" && log "${GREEN}Đã bật swap.${NC}" || exit 1
else
  log "Tạo swap file ${SWAP_GB}GB tại $SWAP_FILE ..."
  fallocate -l "${SWAP_GB}G" "$SWAP_FILE" || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=$((SWAP_GB * 1024)) status=progress
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
  swapon "$SWAP_FILE"
  log "${GREEN}Swap ${SWAP_GB}GB đã tạo và bật.${NC}"
fi

if ! grep -q "^$SWAP_FILE " /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
  log "${GREEN}Đã thêm vào /etc/fstab (giữ swap sau reboot).${NC}"
fi

log "${GREEN}Kết quả:${NC}"
free -h
swapon --show
