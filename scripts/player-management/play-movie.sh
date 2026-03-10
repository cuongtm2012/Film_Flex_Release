#!/bin/bash

# PhimGG Direct Player CLI
# This script allows you to play movies directly from the command line

# Default values
SERVER_URL="http://localhost:5000"
MOVIE_SLUG=""
PLAYER="browser"  # Options: browser, vlc, mpv

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--slug)
      MOVIE_SLUG="$2"
      shift 2
      ;;
    -p|--player)
      PLAYER="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./play-movie.sh [options]"
      echo ""
      echo "Options:"
      echo "  -s, --slug SLUG    Movie slug to play (e.g., ma-bup-be-6)"
      echo "  -p, --player TYPE  Player to use: browser, vlc, mpv (default: browser)"
      echo "  -h, --help         Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./play-movie.sh -s ma-bup-be-6"
      echo "  ./play-movie.sh -s ca-map-con-bao -p vlc"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run './play-movie.sh --help' for usage information."
      exit 1
      ;;
  esac
done

# Check if movie slug is provided
if [ -z "$MOVIE_SLUG" ]; then
  echo "Please enter the movie slug (e.g., ma-bup-be-6):"
  read -r MOVIE_SLUG
fi

echo "=== PhimGG Direct Player CLI ==="
echo "Fetching stream information for: $MOVIE_SLUG"

# Fetch movie data from API
MOVIE_DATA=$(curl -s "$SERVER_URL/api/movies/$MOVIE_SLUG")

if [ -z "$MOVIE_DATA" ]; then
  echo "Error: Could not fetch movie data. Make sure the server is running at $SERVER_URL"
  exit 1
fi

# Extract direct stream URL from movie data
STREAM_URL=$(echo "$MOVIE_DATA" | grep -o '"link_embed":"[^"]*' | head -1 | sed 's/"link_embed":"//g')

if [ -z "$STREAM_URL" ]; then
  echo "Error: Could not find stream URL in movie data."
  exit 1
fi

# Extract m3u8 URL from the embed URL
M3U8_URL=$(echo "$STREAM_URL" | grep -o 'url=[^&"]*' | sed 's/url=//g')

if [ -z "$M3U8_URL" ]; then
  echo "Error: Could not extract direct stream URL from embed link."
  exit 1
fi

echo "Found stream URL: $M3U8_URL"

# Play the stream with the selected player
case "$PLAYER" in
  browser)
    echo "Opening in direct player in browser..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open "$SERVER_URL/direct-player.html?stream=$M3U8_URL"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      xdg-open "$SERVER_URL/direct-player.html?stream=$M3U8_URL"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
      start "$SERVER_URL/direct-player.html?stream=$M3U8_URL"
    else
      echo "Unsupported OS. Please open this URL manually:"
      echo "$SERVER_URL/direct-player.html?stream=$M3U8_URL"
    fi
    ;;
  vlc)
    echo "Playing with VLC..."
    if command -v vlc >/dev/null 2>&1; then
      vlc "$M3U8_URL" &
    else
      echo "VLC is not installed. Please install VLC or choose another player."
      exit 1
    fi
    ;;
  mpv)
    echo "Playing with MPV..."
    if command -v mpv >/dev/null 2>&1; then
      mpv "$M3U8_URL" &
    else
      echo "MPV is not installed. Please install MPV or choose another player."
      exit 1
    fi
    ;;
  *)
    echo "Unknown player: $PLAYER"
    echo "Available players: browser, vlc, mpv"
    exit 1
    ;;
esac

echo "Playback started! If the video doesn't appear, check if your player supports HLS streams."
echo "Movie title: $(echo "$MOVIE_DATA" | grep -o '"title":"[^"]*' | head -1 | sed 's/"title":"//g')" 