#!/bin/bash

# PhimGG - Fix Problematic Movies Script
# This script reimports and tests specific movies that have loading issues

echo "=== PhimGG Movie Repair Tool ==="

# List of known problematic movies to fix
MOVIE_SLUGS=(
  "ma-bup-be-6"
  "ca-map-con-bao"
)

# Function to repair a specific movie
repair_movie() {
  local movie_slug="$1"
  echo -e "\n=======================================\n"
  echo "Repairing: $movie_slug..."
  
  # Reimport the movie with force flag
  echo "Step 1: Reimporting movie data..."
  node scripts/data/import-movies-sql.cjs --movie-slug=$movie_slug --force-import
  
  # Verify the API response contains valid episode data
  echo -e "\nStep 2: Verifying API response..."
  MOVIE_DATA=$(curl -s "http://localhost:5000/api/movies/$movie_slug")
  
  if [ -z "$MOVIE_DATA" ]; then
    echo "ERROR: Could not get movie data from API. Is the server running?"
    return 1
  fi
  
  # Check for episodes
  EPISODES_COUNT=$(echo "$MOVIE_DATA" | grep -o '"episodes":\[.*\]' | grep -o "server_data" | wc -l)
  echo "Episodes count: $EPISODES_COUNT"
  
  # Extract and verify direct stream URLs
  echo -e "\nStep 3: Extracting direct stream URLs..."
  STREAM_URL=$(echo "$MOVIE_DATA" | grep -o '"link_embed":"[^"]*' | head -1 | sed 's/"link_embed":"//g')
  
  if [ -z "$STREAM_URL" ]; then
    echo "ERROR: No link_embed found in movie data"
    return 1
  fi
  
  # Extract m3u8 URL from the embed URL
  M3U8_URL=$(echo "$STREAM_URL" | grep -o 'url=[^&"]*' | sed 's/url=//g')
  
  if [ -z "$M3U8_URL" ]; then
    echo "ERROR: Could not extract direct stream URL"
    return 1
  fi
  
  echo "Found stream URL: $M3U8_URL"
  
  # Check if the stream URL is accessible
  echo -e "\nStep 4: Testing stream URL accessibility..."
  HTTP_STATUS=$(curl -s -I "$M3U8_URL" | head -1 | cut -d$' ' -f2)
  
  if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "302" ]; then
    echo "SUCCESS: Stream URL is accessible (HTTP $HTTP_STATUS)"
    echo "Direct player URL: http://localhost:5000/direct-player.html?stream=$M3U8_URL"
  else
    echo "WARNING: Stream URL returned HTTP status $HTTP_STATUS"
    echo "This may indicate an issue with the stream source"
  fi
  
  # Create a test file for this movie
  local file_name="test-${movie_slug}.html"
  echo -e "\nStep 5: Creating test player at $file_name..."
  
  cat > "public/$file_name" << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Player: $movie_slug</title>
  <style>
    body{margin:0;padding:0;background:#111;color:#fff;font-family:sans-serif}
    .container{max-width:800px;margin:0 auto;padding:20px}
    h1{color:#e50914}
    .player{width:100%;aspect-ratio:16/9;background:#000;margin:20px 0}
    video{width:100%;height:100%}
    .meta{background:#222;padding:10px;margin-top:20px;border-radius:4px}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <div class="container">
    <h1>Test Player: $movie_slug</h1>
    <div class="player"><video id="video" controls></video></div>
    <div class="meta">
      <p><b>Stream URL:</b> $M3U8_URL</p>
      <p><a href="http://localhost:5000/direct-player.html?stream=$M3U8_URL" target="_blank" style="color:#e50914">Open in full player</a></p>
    </div>
  </div>
  <script>
    const video = document.getElementById('video');
    const streamUrl = "$M3U8_URL";
    
    if(Hls.isSupported()) {
      const hls = new Hls({fragLoadingTimeOut:15000,manifestLoadingTimeOut:15000});
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, ()=>{video.play();});
    } else if(video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata',()=>{video.play();});
    }
  </script>
</body>
</html>
EOF
  
  # Copy to dist/public if it exists
  if [ -d "dist/public" ]; then
    cp "public/$file_name" "dist/public/"
  fi
  
  echo -e "\nRepair complete for $movie_slug!"
  echo "Test player available at: http://localhost:5000/$file_name"
  echo -e "\n=======================================\n"
}

# Process specific movie if provided as argument
if [ -n "$1" ]; then
  repair_movie "$1"
  exit 0
fi

# Process the list of known problematic movies
echo "Repairing known problematic movies..."
for slug in "${MOVIE_SLUGS[@]}"; do
  repair_movie "$slug"
done

# Print summary
echo -e "\n=== REPAIR SUMMARY ==="
echo "Fixed movies:"
for slug in "${MOVIE_SLUGS[@]}"; do
  echo "- $slug: http://localhost:5000/test-${slug}.html"
done

echo -e "\nTo add more movies to the automatic repair list, edit the MOVIE_SLUGS array in this script."
echo "To repair a specific movie, run: ./fix-problematic-movies.sh movie-slug" 