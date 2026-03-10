# PhimGG Direct Player

This is a solution for slow-loading videos in the PhimGG streaming platform. Many movies were experiencing long loading times when using the default player.phimapi.com wrapper.

## Why Videos Were Loading Slowly

The issue was caused by several factors:

1. **Player Wrapper Issues**: The player.phimapi.com embedded player adds an additional layer that can slow down video loading.

2. **HLS Stream Handling**: The embedded player doesn't always handle HLS (.m3u8) streams efficiently.

3. **Middleware Delays**: Processing through multiple layers (API → embed player → actual stream) creates delays.

4. **Network/Server Performance**: Some video sources may have bandwidth limitations or latency issues.

## Solution: Direct Player

We've implemented a direct player solution that bypasses the slow player.phimapi.com wrapper and accesses the underlying HLS stream directly. This significantly improves loading times and playback reliability.

### Features

- **Multiple Playback Methods**: Browser-based player, VLC, and MPV player options
- **Robust Error Handling**: Detailed status updates and fallback mechanisms
- **Optimized HLS Settings**: Increased buffer sizes and timeouts for better playback
- **Easy Access**: Direct Play button added to the video player UI
- **Command Line Interface**: Play movies directly from the terminal

## How to Use

### Method 1: Web Interface Direct Play Button

1. Browse to any movie page (e.g., http://localhost:5000/movie/ma-bup-be-6)
2. Look for the "Direct Play (.m3u8)" button below the video player
3. Click the button to open the direct player in a new tab
4. The direct player will automatically start playing the movie

### Method 2: Command Line Player

The `play-movie.sh` script allows you to play movies directly from the terminal:

```bash
# Basic usage
./play-movie.sh -s movie-slug

# Examples
./play-movie.sh -s ma-bup-be-6            # Play in browser (default)
./play-movie.sh -s ca-map-con-bao -p vlc   # Play using VLC player
./play-movie.sh -s tro-choi-con-muc -p mpv # Play using MPV player

# For help
./play-movie.sh --help
```

### Method 3: Standalone Direct Player

You can access the direct player directly at:

```
http://localhost:5000/direct-player.html?stream=YOUR_STREAM_URL
```

Where `YOUR_STREAM_URL` is the direct .m3u8 stream URL. For example:

```
http://localhost:5000/direct-player.html?stream=https://s5.phim1280.tv/20250516/aZBpSlob/index.m3u8
```

### Method 4: Simple Player

For devices with limited resources, a lightweight player is available at:

```
http://localhost:5000/player.html?stream=YOUR_STREAM_URL
```

## Troubleshooting

If you still experience playback issues:

1. **Try VLC Player**: VLC has better compatibility with various HLS streams
   ```bash
   ./play-movie.sh -s your-movie-slug -p vlc
   ```

2. **Network Issues**: Check your internet connection

3. **Server Status**: Ensure the PhimGG server is running
   ```bash
   curl http://localhost:5000/api/health
   ```

4. **Update Stream Data**: Force reimport stream data
   ```bash
   node scripts/data/import-movies-sql.cjs --movie-slug=your-movie-slug --force-import
   ```

5. **Refresh Browser Cache**: Try using incognito mode or clearing cache

## Implementation Details

This solution consists of several components:

1. **VideoPlayer.tsx**: Enhanced player with direct play option
2. **direct-player.html**: Standalone HTML5 player with HLS.js support
3. **player.html**: Lightweight alternative player
4. **play-movie.sh**: Command-line interface for direct playback
5. **setup-direct-player.sh**: Installation script for the direct player

## Deployment

When deploying:

1. Run `./setup-direct-player.sh` to ensure the player files are in all required locations
2. Make sure the direct player HTML files are accessible from your web server

## Support

For issues or questions about the direct player, please contact the PhimGG development team. 