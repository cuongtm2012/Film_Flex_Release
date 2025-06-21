import React from 'react';
import VideoPlayerExample from './components/VideoPlayerExample';
import LanguageSwitcher from './components/LanguageSwitcher';
import './i18n'; // Ensure i18n is initialized
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>FilmFlex HLS Player</h1>
        <LanguageSwitcher /> {/* Add language switcher to header */}
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