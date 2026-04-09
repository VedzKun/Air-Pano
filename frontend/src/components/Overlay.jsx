/**
 * Overlay v2 — Enhanced HUD with Feature Controls
 * ==================================================
 * Glassmorphism UI layer showing:
 *   - Scene name & description (top-left)
 *   - Controls toolbar (top-right): fullscreen, gyro, audio, inspection, tour
 *   - Scene navigation breadcrumb (bottom-center)
 *   - Hotspot tooltip (bottom-left, when hovering a 3D hotspot)
 */

import React, { useCallback } from 'react';
import './Overlay.css';

// SVG icon components for clean rendering
const IconFullscreen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const IconGyro = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2a10 10 0 0 1 10 10" />
    <path d="M12 2a10 10 0 0 0-10 10" />
    <path d="M12 22a10 10 0 0 1-10-10" />
    <path d="M12 22a10 10 0 0 0 10-10" />
  </svg>
);

const IconAudioOn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const IconAudioOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const IconInspect = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
    <line x1="11" y1="8" x2="11" y2="14" />
  </svg>
);

const IconTour = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

export default function Overlay({
  currentScene,
  scenes,
  onSceneChange,
  // Feature toggles
  gyroSupported,
  gyroEnabled,
  onGyroToggle,
  audioMuted,
  onAudioToggle,
  inspectionMode,
  onInspectionToggle,
  guidedTourActive,
  onGuidedTourToggle,
  // Hotspot hover info
  hoveredHotspot,
}) {
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

        {/* Controls toolbar */}
        <div className="overlay-toolbar" id="controls-toolbar">
          {/* Guided Tour toggle */}
          <button
            className={`overlay-btn glass-panel ${guidedTourActive ? 'overlay-btn--active' : ''}`}
            id="tour-btn"
            onClick={onGuidedTourToggle}
            title={guidedTourActive ? 'Exit guided tour' : 'Start guided tour'}
            aria-label="Toggle guided tour"
          >
            <IconTour />
          </button>

          {/* Inspection mode toggle */}
          <button
            className={`overlay-btn glass-panel ${inspectionMode ? 'overlay-btn--active' : ''}`}
            id="inspection-btn"
            onClick={onInspectionToggle}
            title={inspectionMode ? 'Exit inspection mode' : 'Inspection mode'}
            aria-label="Toggle inspection mode"
          >
            <IconInspect />
          </button>

          {/* Audio toggle */}
          <button
            className={`overlay-btn glass-panel ${!audioMuted ? 'overlay-btn--active' : ''}`}
            id="audio-btn"
            onClick={onAudioToggle}
            title={audioMuted ? 'Unmute narration' : 'Mute narration'}
            aria-label="Toggle audio"
          >
            {audioMuted ? <IconAudioOff /> : <IconAudioOn />}
          </button>

          {/* Gyroscope toggle (only shown if supported) */}
          {gyroSupported && (
            <button
              className={`overlay-btn glass-panel ${gyroEnabled ? 'overlay-btn--active' : ''}`}
              id="gyro-btn"
              onClick={onGyroToggle}
              title={gyroEnabled ? 'Disable gyroscope' : 'Enable gyroscope'}
              aria-label="Toggle gyroscope"
            >
              <IconGyro />
            </button>
          )}

          {/* Fullscreen */}
          <button
            className="overlay-btn glass-panel"
            id="fullscreen-btn"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
            aria-label="Toggle fullscreen"
          >
            <IconFullscreen />
          </button>
        </div>
      </div>

      {/* ---- Hovered hotspot tooltip ---- */}
      {hoveredHotspot && (
        <div className="overlay-hotspot-tooltip glass-panel" id="hotspot-tooltip">
          <span className={`tooltip-dot tooltip-dot--${hoveredHotspot.type || 'navigation'}`} />
          <span className="tooltip-text">{hoveredHotspot.label}</span>
        </div>
      )}

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
