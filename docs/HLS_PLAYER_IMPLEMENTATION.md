# HLS Video Player - Timeline Seekable Fix 🎯

## Vấn đề đã giải quyết

**Triệu chứng:** Timeline của video player không thể kéo để tua nhanh/chậm

**Nguyên nhân:** Sử dụng iframe embed từ `player.phimapi.com` - không kiểm soát được player bên trong iframe

**Giải pháp:** Tạo Direct HLS Player với timeline seekable hoàn toàn

---

## Thay đổi chính

### 1. **HLSVideoPlayer Component** ✨ NEW
**File:** `client/src/components/HLSVideoPlayer.tsx`

**Features:**
- ✅ **Seekable Timeline** - Kéo tua nhanh/chậm bình thường
- ✅ **Custom Controls** - Play/Pause, Volume, Fullscreen
- ✅ **Progress Bar** - Hiển thị buffered & current time
- ✅ **Quality Selector** - Chọn chất lượng video (Auto, 720p, 480p, etc.)
- ✅ **Auto-hide Controls** - Tự động ẩn sau 3s khi playing
- ✅ **HLS Support** - Sử dụng hls.js cho adaptive streaming
- ✅ **Error Recovery** - Tự động recover khi gặp network/media errors

**Technology:**
```typescript
import Hls from "hls.js";  // HLS streaming library
import { Slider } from "@/components/ui/slider";  // Custom slider for volume/progress
```

**Key Functions:**
```typescript
// Timeline seeking
const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = progressBarRef.current.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  videoRef.current.currentTime = pos * duration;  // ✅ Seekable!
};

// Quality switching
const changeQuality = (level: number) => {
  hlsRef.current.currentLevel = level;  // Manual quality control
};
```

### 2. **MovieDetail Updates** 🔄
**File:** `client/src/pages/MovieDetail.tsx`

**Thêm:**
- State `playerType` để toggle giữa "embed" và "hls"
- Function `getCurrentM3u8Url()` để lấy direct M3U8 URL
- Toggle buttons để chuyển đổi player

**Code:**
```tsx
const [playerType, setPlayerType] = useState<"embed" | "hls">("hls");

const getCurrentM3u8Url = () => {
  const server = movieDetail.episodes.find(s => s.server_name === selectedServer);
  const episode = server?.server_data.find(e => e.slug === selectedEpisode);
  return episode?.link_m3u8 || "";
};

// Conditional rendering
{playerType === "hls" ? (
  <HLSVideoPlayer m3u8Url={getCurrentM3u8Url()} />
) : (
  <VideoPlayer embedUrl={getCurrentEmbedUrl()} />
)}
```

---

## UI/UX Improvements

### Player Type Toggle
Hiển thị ở góc trên bên phải video player:

```
┌─────────────────────────────────────────┐
│  [Direct Player] [Embed Player]  ←      │
│                                          │
│          VIDEO PLAYER                    │
│                                          │
└─────────────────────────────────────────┘
```

- **Direct Player (HLS):** ✅ Seekable timeline, custom controls
- **Embed Player (Iframe):** Fallback option nếu HLS không hoạt động

### Custom Controls Layout

```
┌────────────────────────────────────────────┐
│                                            │
│              Video Content                 │
│                                            │
├────────────────────────────────────────────┤
│ ▬▬▬▬▬▬●──────────────────  ← Progress Bar │
├────────────────────────────────────────────┤
│ ▶ 🔊━━━━ 1:23 / 45:00    [⚙️] [⛶]        │
└────────────────────────────────────────────┘
  ↑   ↑      ↑                ↑    ↑
  Play Vol   Time          Quality Full
```

**Features:**
- Progress bar với buffered indicator (light gray)
- Volume slider xuất hiện khi hover
- Quality menu dropdown khi hover settings icon
- Time display: current / duration
- Fullscreen toggle

---

## So sánh 2 loại Player

| Feature | Embed Player (Iframe) | Direct Player (HLS) |
|---------|----------------------|---------------------|
| **Timeline Seek** | ❌ Không kéo được | ✅ Kéo tua bình thường |
| **Custom Controls** | ❌ Không kiểm soát | ✅ Full control |
| **Quality Selection** | ⚠️ Phụ thuộc embed | ✅ Manual select |
| **Keyboard Shortcuts** | ❌ Không | ⚠️ Có thể thêm |
| **Ads/Watermark** | ⚠️ Có thể có | ✅ Không ads |
| **Compatibility** | ✅ Luôn hoạt động | ⚠️ Phụ thuộc M3U8 URL |
| **Loading Speed** | ⚠️ Load iframe trước | ✅ Direct stream |

---

## Cách sử dụng

### User Perspective

1. **Mở movie detail page**
2. **Mặc định sẽ load Direct Player (HLS)**
3. **Kéo timeline để tua:**
   - Click vào bất kỳ vị trí nào trên progress bar
   - Video sẽ jump đến vị trí đó ngay lập tức
4. **Nếu Direct Player không hoạt động:**
   - Click "Embed Player" button
   - Fallback sang iframe player

### Developer Perspective

**Sử dụng HLSVideoPlayer:**
```tsx
import HLSVideoPlayer from "@/components/HLSVideoPlayer";

<HLSVideoPlayer 
  m3u8Url="https://s6.kkphimplayer6.com/.../index.m3u8"
  isLoading={false}
  onError={(error) => console.error(error)}
/>
```

**Sử dụng VideoPlayer (iframe):**
```tsx
import VideoPlayer from "@/components/VideoPlayer";

<VideoPlayer 
  embedUrl="https://player.phimapi.com/player/?url=..."
  isLoading={false}
/>
```

---

## Technical Details

### HLS.js Configuration
```typescript
const hls = new Hls({
  enableWorker: true,        // Use web worker for better performance
  lowLatencyMode: false,     // Disable low latency (VOD không cần)
  backBufferLength: 90,      // Keep 90s of back buffer
  maxBufferLength: 30,       // Buffer ahead 30s
  maxBufferSize: 60 * 1000 * 1000,  // 60MB max buffer
});
```

### Error Recovery
```typescript
hls.on(Hls.Events.ERROR, (_, data) => {
  if (data.fatal) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        hls.startLoad();  // Retry loading
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        hls.recoverMediaError();  // Try to recover
        break;
      default:
        hls.destroy();  // Fatal error, give up
    }
  }
});
```

### Safari Support
```typescript
// Safari có native HLS support, không cần hls.js
if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = m3u8Url;  // Direct assignment
}
```

---

## Testing Checklist

### Functionality
- [x] Timeline seekable (click anywhere on progress bar)
- [x] Play/Pause toggle
- [x] Volume control with mute
- [x] Fullscreen mode
- [x] Quality selection (if multiple levels available)
- [x] Time display accurate
- [x] Buffered indicator shows correctly
- [x] Controls auto-hide after 3s when playing

### Error Handling
- [x] Invalid M3U8 URL shows error message
- [x] Network error auto-recovery
- [x] Media error auto-recovery
- [x] Fallback to embed player if HLS fails

### Browser Compatibility
- [x] Chrome/Edge (hls.js)
- [x] Firefox (hls.js)
- [x] Safari (native HLS)
- [x] Mobile browsers

### Performance
- [x] No memory leaks (cleanup on unmount)
- [x] Smooth seeking
- [x] Fast initial load
- [x] Efficient buffering

---

## Troubleshooting

### Timeline vẫn không kéo được?

**Check 1: M3U8 URL có valid không?**
```bash
# Open browser console
console.log(getCurrentM3u8Url());
# Should return: https://s6.kkphimplayer6.com/.../index.m3u8
```

**Check 2: HLS loaded thành công?**
```bash
# Browser console should show:
HLS manifest parsed { levels: 3 }
```

**Check 3: Video có duration?**
```typescript
// In browser console
const video = document.querySelector('video');
console.log(video.duration);  // Should be > 0
```

### Video không phát?

**Giải pháp:**
1. Click "Embed Player" button để fallback
2. Check M3U8 URL trong network tab (should be 200 OK)
3. Try different episode (link có thể hết hạn)

### Controls không hiển thị?

**Fix:** Move mouse over video hoặc pause video

---

## Future Enhancements

### Possible Additions:
- [ ] **Keyboard shortcuts** (Space = Play/Pause, Arrow keys = Seek)
- [ ] **Playback speed control** (0.5x, 1x, 1.5x, 2x)
- [ ] **Subtitles support** (VTT/SRT)
- [ ] **Picture-in-Picture mode**
- [ ] **Remember last watched position**
- [ ] **Skip intro/outro buttons**
- [ ] **Chromecast support**

---

## References

- **HLS.js Docs:** https://github.com/video-dev/hls.js/
- **MDN Video API:** https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
- **HLS Spec:** https://datatracker.ietf.org/doc/html/rfc8216
