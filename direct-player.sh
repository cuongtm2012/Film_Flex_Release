#!/bin/bash

# Film Flex Direct Player
# This script allows you to play m3u8 streams directly using VLC or other players
# Usage: ./direct-player.sh [m3u8_url] [player]

echo "=== Film Flex Direct Player ==="

# Check if VLC is installed
check_vlc() {
  if command -v vlc >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Check if mpv is installed
check_mpv() {
  if command -v mpv >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Get m3u8 URL from input or parameter
get_m3u8_url() {
  if [ -n "$1" ]; then
    STREAM_URL="$1"
  else
    echo "Enter the embed URL (e.g., https://player.phimapi.com/player/?url=https://s5.phim1280.tv/20250516/aZBpSlob/index.m3u8):"
    read -r EMBED_URL
    
    # Extract the m3u8 URL from the embed URL
    STREAM_URL=$(echo "$EMBED_URL" | grep -o 'url=.*' | sed 's/url=//')
    
    # If no URL parameter found, just use the whole URL (maybe it's already a direct m3u8)
    if [ -z "$STREAM_URL" ]; then
      STREAM_URL="$EMBED_URL"
    fi
  fi
  
  echo "Direct stream URL: $STREAM_URL"
}

# Play the stream with the appropriate player
play_stream() {
  local url="$1"
  local player="$2"
  
  case "$player" in
    vlc)
      echo "Playing with VLC..."
      vlc "$url" &
      ;;
    mpv)
      echo "Playing with MPV..."
      mpv "$url" &
      ;;
    browser)
      echo "Opening in browser..."
      if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url"
      elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$url"
      elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        start "$url"
      else
        echo "Unsupported OS for browser opening. Try manually opening: $url"
      fi
      ;;
    *)
      echo "Unknown player: $player"
      echo "Available players: vlc, mpv, browser"
      exit 1
      ;;
  esac
}

# Main function
main() {
  # Get URL from first parameter or prompt user
  get_m3u8_url "$1"
  
  # Determine player to use
  if [ -n "$2" ]; then
    PLAYER="$2"
  else
    echo "Choose a player:"
    echo "1. VLC (recommended)"
    echo "2. MPV"
    echo "3. Browser"
    read -r choice
    
    case "$choice" in
      1) PLAYER="vlc" ;;
      2) PLAYER="mpv" ;;
      3) PLAYER="browser" ;;
      *) PLAYER="vlc" ;;
    esac
  fi
  
  # Check if the selected player is available
  case "$PLAYER" in
    vlc)
      if ! check_vlc; then
        echo "VLC is not installed. Please install VLC or choose another player."
        exit 1
      fi
      ;;
    mpv)
      if ! check_mpv; then
        echo "MPV is not installed. Please install MPV or choose another player."
        exit 1
      fi
      ;;
  esac
  
  # Play the stream
  play_stream "$STREAM_URL" "$PLAYER"
  
  echo "Playback started! If the video doesn't appear, check if your player supports HLS streams."
  echo "Tip: VLC Player generally has the best compatibility with these streams."
}

# Run the main function with arguments
main "$1" "$2" 