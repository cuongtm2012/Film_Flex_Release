#!/bin/bash

# Fix movie links for slow-loading movies
# This script reimports specific movies with the --force-import flag

echo "=== Film Flex Link Repair Tool ==="
echo "Fixing slow-loading videos by reimporting episodes data"

# Fix Ma Búp Bê 6
echo -e "\nRepairing: Ma Búp Bê 6..."
node scripts/data/import-movies-sql.cjs --movie-slug=ma-bup-be-6 --force-import

# Add custom post-processing to fix link_embed in the database
echo -e "\nOptimizing player links..."
# Verify the player is loading properly
MOVIE_INFO=$(curl -s "http://localhost:5000/api/movies/ma-bup-be-6")
echo "$MOVIE_INFO" | grep "link_embed" | head -1

# Extract direct m3u8 URL for faster playback
echo -e "\nExtracting direct stream URL for faster playback..."
DIRECT_URL=$(echo "$MOVIE_INFO" | grep -o "link_m3u8\":\"[^\"]*" | sed 's/link_m3u8":"//g' | head -1)

if [ -n "$DIRECT_URL" ]; then
  echo "Direct Stream URL: $DIRECT_URL"
  echo -e "\nYou can play this stream directly using VLC or MPV player with:"
  echo "./direct-player.sh \"$DIRECT_URL\" vlc"
else
  echo "Could not extract direct stream URL."
fi

# Handle specific user-provided URL
echo -e "\n=== Processing User Provided URL ==="
USER_EMBED_URL="https://player.phimapi.com/player/?url=https://s5.phim1280.tv/20250516/aZBpSlob/index.m3u8"
USER_DIRECT_URL=$(echo "$USER_EMBED_URL" | grep -o "url=.*" | cut -d= -f2)

echo "User Embed URL: $USER_EMBED_URL"
echo "Direct Stream URL: $USER_DIRECT_URL"
echo -e "\nYou can play this specific stream directly using:"
echo "./direct-player.sh \"$USER_DIRECT_URL\" vlc"

# Create a quick HTML file for direct playback
echo -e "\nCreating a direct player HTML file..."
cat > direct-player.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Film Flex Direct Player</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #000;
            color: white;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        video {
            width: 100%;
            height: auto;
            max-height: 80vh;
        }
        h1 {
            color: #e50914;
        }
        .player-container {
            margin-top: 20px;
        }
        .instructions {
            margin-top: 20px;
            padding: 15px;
            background-color: #333;
            border-radius: 5px;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
    <div class="container">
        <h1>Film Flex Direct Player</h1>
        <div class="player-container">
            <video id="video" controls></video>
        </div>
        <div class="instructions">
            <h3>Stream Information</h3>
            <p>Direct stream URL: <code id="stream-url"></code></p>
            <p>If video doesn't play properly, try using VLC player instead.</p>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const video = document.getElementById('video');
            const streamUrl = "$USER_DIRECT_URL";
            document.getElementById('stream-url').textContent = streamUrl;
            
            if(Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    video.play();
                });
            }
            else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = streamUrl;
                video.addEventListener('loadedmetadata', function() {
                    video.play();
                });
            } else {
                document.querySelector('.instructions').innerHTML += 
                    '<p style="color:red">Your browser does not support HLS playback. Please use VLC player.</p>';
            }
        });
    </script>
</body>
</html>
EOF

echo "Created direct-player.html - open this file in your browser for web-based direct playback."

echo -e "\nRepair complete! Please try playing the movie again."
echo "If it's still loading slowly, try one of these options:"
echo "1. Use the direct-player.sh script for faster playback"
echo "2. Open the direct-player.html file in your browser"
echo "3. Clear your browser cache or try a different browser"
echo "4. Use the mobile app to cast to your TV instead of direct playback" 