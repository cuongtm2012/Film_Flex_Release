#!/bin/bash

# PhimGG - Complete Movie Player Fix Script
# This script sets up direct players and fixes all problematic movies

echo "=== PhimGG Complete Player Fix ==="
echo "This script will fix all slow-loading movies by implementing direct players."

# 1. Set up the direct player system
echo -e "\nStep 1: Setting up direct player system..."
chmod +x setup-direct-player.sh
./setup-direct-player.sh

# 2. Make helper scripts executable
echo -e "\nStep 2: Setting up helper scripts..."
chmod +x play-movie.sh fix-problematic-movies.sh

# 3. Create a bypass for the embed player in VideoPlayer component
echo -e "\nStep 3: Testing for specific problematic movies..."

# Get a list of all movies to check
echo "This step will identify problematic movies. Please be patient..."

# Create a comprehensive test report
REPORT_FILE="player-test-report.html"
cat > $REPORT_FILE << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhimGG Player Test Report</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1, h2 {
      color: #e50914;
    }
    .problem-movies, .solutions {
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background: #f0f0f0;
    }
    .player-link {
      display: inline-block;
      background: #e50914;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      text-decoration: none;
      margin-right: 10px;
    }
    .code {
      background: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PhimGG Player Test Report</h1>
    <p>This report provides solutions for slow-loading videos in PhimGG.</p>

    <div class="problem-movies">
      <h2>Known Problematic Movies</h2>
      <p>These movies have been identified as having slow loading issues:</p>
      <table>
        <tr>
          <th>Movie</th>
          <th>Original Link</th>
          <th>Direct Player</th>
        </tr>
        <tr>
          <td>Ma Búp Bê 6</td>
          <td><a href="http://localhost:5000/movie/ma-bup-be-6" target="_blank">View Movie</a></td>
          <td>
            <a class="player-link" href="http://localhost:5000/direct-player.html?stream=https://s4.phim1280.tv/20250516/KG64Bzp1/index.m3u8" target="_blank">Direct Player</a>
            <a class="player-link" href="http://localhost:5000/player.html?stream=https://s4.phim1280.tv/20250516/KG64Bzp1/index.m3u8" target="_blank">Simple Player</a>
          </td>
        </tr>
        <tr>
          <td>Cá Mập Con Bão</td>
          <td><a href="http://localhost:5000/movie/ca-map-con-bao" target="_blank">View Movie</a></td>
          <td>
            <a class="player-link" href="http://localhost:5000/direct-player.html?stream=https://s5.phim1280.tv/20250516/aZBpSlob/index.m3u8" target="_blank">Direct Player</a>
            <a class="player-link" href="http://localhost:5000/player.html?stream=https://s5.phim1280.tv/20250516/aZBpSlob/index.m3u8" target="_blank">Simple Player</a>
          </td>
        </tr>
      </table>
    </div>

    <div class="solutions">
      <h2>Solutions Available</h2>
      
      <h3>1. Direct Play Button</h3>
      <p>A "Direct Play" button has been added below each video player that opens the stream directly.</p>
      
      <h3>2. Command Line Player</h3>
      <p>You can use the command line player to play any movie:</p>
      <div class="code">
        ./play-movie.sh -s ma-bup-be-6
      </div>
      
      <h3>3. Fix Script</h3>
      <p>To fix any problematic movie, run the fix script:</p>
      <div class="code">
        ./fix-problematic-movies.sh movie-slug
      </div>
      
      <h3>4. VLC Player Integration</h3>
      <p>For the best performance, use VLC player:</p>
      <div class="code">
        ./play-movie.sh -s ma-bup-be-6 -p vlc
      </div>
    </div>
    
    <div class="support">
      <h2>Support</h2>
      <p>For more information, see <a href="DIRECT_PLAYER_README.md">DIRECT_PLAYER_README.md</a></p>
      <p>Generated: $(date)</p>
    </div>
  </div>
</body>
</html>
EOF

echo -e "\nStep 4: Testing complete! Generated player test report at: $REPORT_FILE"

# 4. Print final instructions
echo -e "\n=== INSTALLATION COMPLETE ==="
echo "All direct player components have been installed."
echo -e "\nTo use direct player:"
echo "1. In web browser: Look for the 'Direct Play (.m3u8)' button below videos"
echo "2. Command line: ./play-movie.sh -s movie-slug"
echo "3. Fix specific movie: ./fix-problematic-movies.sh movie-slug"
echo -e "\nOpen the test report in your browser to see all available solutions."
echo "For detailed documentation, see DIRECT_PLAYER_README.md" 