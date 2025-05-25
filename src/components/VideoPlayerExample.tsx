import React, { useState, useEffect } from 'react';
import HLSPlayer from './HLSPlayer';
import StreamService, { Stream } from '../services/StreamService';
import MockStreamService from '../services/MockStreamService';
import './VideoPlayerExample.css';

const VideoPlayerExample: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStream, setCurrentStream] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  // Fetch available streams from the service
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let fetchedStreams: Stream[] = [];
        
        // Try to fetch from real API first
        if (!useMockData) {
          try {
            fetchedStreams = await StreamService.fetchStreams();
          } catch (apiError) {
            console.error('API error, falling back to mock data:', apiError);
            // If API fails, switch to mock data
            setUseMockData(true);
            fetchedStreams = await MockStreamService.fetchStreams();
          }
        } else {
          // Use mock data if selected
          fetchedStreams = await MockStreamService.fetchStreams();
        }
        
        if (fetchedStreams.length > 0) {
          setStreams(fetchedStreams);
          setCurrentStream(fetchedStreams[0].url);
        } else {
          setError('No streams available');
        }
      } catch (error) {
        setError('Failed to load streams');
        console.error('Error fetching streams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreams();
  }, [useMockData]);

  // Handle custom URL input
  const handleCustomUrl = (url: string) => {
    if (url && url.trim() !== '') {
      setCurrentStream(url);
    }
  };

  // Toggle between real API and mock data
  const toggleDataSource = () => {
    setUseMockData(!useMockData);
  };

  if (isLoading) {
    return <div className="loading">Loading available streams...</div>;
  }

  return (
    <div className="video-player-example">
      <h2>HLS Video Player Example</h2>
      
      <div className="data-source">
        <button 
          className={`source-toggle ${useMockData ? 'mock' : 'api'}`} 
          onClick={toggleDataSource}
        >
          {useMockData ? 'Using Mock Data' : 'Using API Data'} - Click to toggle
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {currentStream ? (
        <HLSPlayer 
          src={currentStream}
          autoPlay={true}
        />
      ) : (
        <div className="no-stream">No stream selected or available</div>
      )}
      
      {streams.length > 0 && (
        <div className="stream-selector">
          <h3>Select a stream:</h3>
          <div className="stream-buttons">
            {streams.map((stream, index) => (
              <button
                key={index}
                onClick={() => setCurrentStream(stream.url)}
                className={currentStream === stream.url ? 'active' : ''}
              >
                {stream.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="custom-stream">
        <h3>Enter a custom m3u8 URL:</h3>
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter m3u8 URL..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                handleCustomUrl(e.currentTarget.value);
              }
            }}
          />
          <button onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input?.value) {
              handleCustomUrl(input.value);
            }
          }}>Load</button>
        </div>
      </div>

      {currentStream && (
        <div className="current-stream">
          <h3>Current Stream:</h3>
          <div className="stream-url">{currentStream}</div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerExample; 