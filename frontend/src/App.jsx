/**
 * App — Root Application Component
 * ==================================
 * Orchestrates the entire virtual tour:
 *   1. Fetches scene data via the useScenes hook
 *   2. Renders the PanoViewer (Three.js canvas)
 *   3. Renders the Overlay HUD (scene info, nav, fullscreen)
 *   4. Shows Loader during initial data fetch
 *   5. Shows error state on API failure
 */

import React from 'react';
import useScenes from './hooks/useScenes';
import PanoViewer from './components/PanoViewer';
import Overlay from './components/Overlay';
import Loader from './components/Loader';
import './App.css';

export default function App() {
  const { scenes, currentScene, loading, error, setCurrentSceneById } =
    useScenes();

  // ---- Loading state ----
  if (loading) {
    return <Loader message="Loading aircraft tour…" />;
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="app-error" id="error-screen">
        <div className="app-error-card glass-panel">
          <h2 className="app-error-title">Connection Error</h2>
          <p className="app-error-message">{error}</p>
          <p className="app-error-hint">
            Make sure the Flask backend is running on{' '}
            <code>http://localhost:5000</code>
          </p>
          <button
            className="app-error-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---- Main view ----
  return (
    <div className="app" id="app-root">
      {/* Three.js 360° panorama viewer */}
      <PanoViewer
        scene={currentScene}
        onNavigate={setCurrentSceneById}
      />

      {/* HUD overlay: scene info, navigation, fullscreen */}
      <Overlay
        currentScene={currentScene}
        scenes={scenes}
        onSceneChange={setCurrentSceneById}
      />
    </div>
  );
}
