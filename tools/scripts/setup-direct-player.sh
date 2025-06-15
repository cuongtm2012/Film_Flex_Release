#!/bin/bash

# Setup script for the FilmFlex Direct Player
# This script copies the direct-player.html file to all necessary locations

echo "=== Setting up FilmFlex Direct Player ==="

# Make sure we have the public directories
mkdir -p public
mkdir -p dist/public 2>/dev/null || true
mkdir -p client/public 2>/dev/null || true

# Copy the direct player to all possible locations where static files might be served from
echo "Copying direct player to public locations..."

# Copy to project root /public (for development)
cp direct-player.html public/

# Copy to dist/public (for production builds)
if [ -d "dist/public" ]; then
  cp direct-player.html dist/public/
  echo "✓ Copied to dist/public/"
fi

# Copy to client/public (for client builds)
if [ -d "client/public" ]; then
  cp direct-player.html client/public/
  echo "✓ Copied to client/public/"
fi

# Create .htaccess file to ensure proper MIME types for m3u8 files
echo "Creating .htaccess for proper MIME types..."
cat > public/.htaccess << EOF
# FilmFlex MIME type configuration
# Ensure proper MIME types for streaming media files

<IfModule mod_mime.c>
  # HLS streaming
  AddType application/vnd.apple.mpegurl .m3u8
  AddType application/octet-stream .ts
  
  # Video formats
  AddType video/mp4 .mp4
  AddType video/webm .webm
  AddType video/ogg .ogv
</IfModule>

# Allow cross-origin requests for streaming media
<IfModule mod_headers.c>
  <FilesMatch "\.(m3u8|ts)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
    Header set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept"
  </FilesMatch>
</IfModule>
EOF

# Copy to other locations if they exist
for dir in dist/public client/public; do
  if [ -d "$dir" ]; then
    cp public/.htaccess "$dir/"
  fi
done

# Create an optimized version of the player as a fallback
echo "Creating optimized fallback player..."
cat > public/player.html << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple HLS Player</title>
  <style>
    body{margin:0;padding:0;background:#000;color:#fff;font-family:sans-serif}
    .player{width:100%;height:100vh;max-height:calc(100vw*9/16)}
    video{width:100%;height:100%}
    .controls{padding:10px}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <div class="player"><video id="video" controls></video></div>
  <div class="controls">
    <p>URL: <span id="url"></span></p>
    <button onclick="window.location.href=window.location.href">Reload</button>
  </div>
  <script>
    const video = document.getElementById('video');
    const urlDisplay = document.getElementById('url');
    const urlParams = new URLSearchParams(window.location.search);
    const streamUrl = urlParams.get('stream');
    
    urlDisplay.textContent = streamUrl || 'No stream URL provided';
    
    if(streamUrl) {
      if(Hls.isSupported()) {
        const hls = new Hls({fragLoadingTimeOut:15000,manifestLoadingTimeOut:15000});
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, ()=>{video.play();});
      } else if(video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata',()=>{video.play();});
      }
    }
  </script>
</body>
</html>
EOF

# Copy to other locations
for dir in dist/public client/public; do
  if [ -d "$dir" ]; then
    cp public/player.html "$dir/"
  fi
done

echo "✓ Setup complete!"
echo "The direct player is now available at the following URLs:"
echo "• Development: http://localhost:5000/direct-player.html"
echo "• Simple player: http://localhost:5000/player.html?stream=YOUR_STREAM_URL"
echo 
echo "Usage:"
echo "From any movie page, click the 'Direct Play (.m3u8)' button to open the direct player" 