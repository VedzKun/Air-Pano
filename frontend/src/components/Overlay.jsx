/**
 * Overlay Component
 * ==================
 * Glassmorphism UI layer on top of the 360° viewer.
 * Shows:
 *   - Scene name & description (top-left)
 *   - Fullscreen toggle (top-right)
 *   - Scene navigation breadcrumb (bottom-center)
 */

import React, { useCallback } from 'react';
import './Overlay.css';

export default function Overlay({
  currentScene,
  scenes,
  onSceneChange,
}) {
  // ------ Fullscreen toggle ------
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  if (!currentScene) return null;

  return (
    <div className="overlay" id="ui-overlay">
      {/* ---- Top Bar ---- */}
      <div className="overlay-top">
        {/* Scene info */}
        <div className="overlay-info glass-panel" id="scene-info">
          <h1 className="overlay-title">{currentScene.name}</h1>
          <p className="overlay-desc">{currentScene.description}</p>
        </div>

        {/* Fullscreen button */}
        <button
          className="overlay-btn glass-panel"
          id="fullscreen-btn"
          onClick={toggleFullscreen}
          title="Toggle fullscreen"
          aria-label="Toggle fullscreen"
        >
          {/* Simple expand icon using CSS borders */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>

      {/* ---- Bottom navigation breadcrumb ---- */}
      <nav className="overlay-nav glass-panel" id="scene-nav">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            className={`nav-pill ${scene.id === currentScene.id ? 'nav-pill--active' : ''}`}
            onClick={() => onSceneChange(scene.id)}
            id={`nav-${scene.id}`}
          >
            {scene.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
