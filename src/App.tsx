import React from 'react';
import VideoPlayerExample from './components/VideoPlayerExample';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>FilmFlex HLS Player</h1>
      </header>
      <main className="app-content">
        <VideoPlayerExample />
      </main>
      <footer className="app-footer">
        <p>FilmFlex HLS Player - Built with React and hls.js</p>
      </footer>
    </div>
  );
}

export default App; 