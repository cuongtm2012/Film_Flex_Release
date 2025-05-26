// MockStreamService.ts - Fallback service with sample streams
import { Stream } from './StreamService';

class MockStreamService {
  // Sample m3u8 URLs from the terminal log
  private sampleStreams: Stream[] = [
    {
      name: "Ma Búp Bê 6",
      url: "https://s4.phim1280.tv/20250516/KG64Bzp1/index.m3u8"
    },
    {
      name: "Cá Mập Con Bão",
      url: "https://s5.phim1280.tv/20250516/aZBpSlob/index.m3u8"
    },
    {
      name: "Cuộc Chiến Sống Còn",
      url: "https://s5.phim1280.tv/20250516/8tp7hbUn/index.m3u8"
    }
  ];
  
  /**
   * Get sample streams for testing
   */
  async fetchStreams(): Promise<Stream[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...this.sampleStreams];
  }
  
  /**
   * Get a specific stream by name
   */
  async fetchStreamByName(name: string): Promise<Stream | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.sampleStreams.find(stream => stream.name === name) || null;
  }
}

export default new MockStreamService(); 