/**
 * App v2 — Root Application Component
 * ======================================
 * Full orchestrator for the virtual tour system.
 * Manages:
 *   - Scene state via useScenes hook
 *   - Analytics tracking via useAnalytics hook
 *   - Gyroscope integration via useGyroscope hook
 *   - Audio narration via useAudio hook
 *   - UI states: annotation panel, guided tour, inspection mode
 *   - Plugin initialization
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import useScenes from './hooks/useScenes';
import useAnalytics from './hooks/useAnalytics';
import useGyroscope from './hooks/useGyroscope';
import useAudio from './hooks/useAudio';
import PanoViewer from './components/PanoViewer';
import Overlay from './components/Overlay';
import AnnotationPanel from './components/AnnotationPanel';
import GuidedTour from './components/GuidedTour';
import Loader from './components/Loader';
import './App.css';

export default function App() {
  // ---- Core scene state ----
  const {
    scenes,
    currentScene,
    tourSequence,
    loading,
    error,
    currentIndex,
    setCurrentSceneById,
  } = useScenes();

  // ---- Feature hooks ----
  const { trackSceneVisit, trackHotspotClick } = useAnalytics();
  const { supported: gyroSupported, enabled: gyroEnabled, toggle: toggleGyro, orientationRef } = useGyroscope();
  const { muted: audioMuted, switchAudio, toggleMute: toggleAudio } = useAudio();

  // ---- UI states ----
  const [annotation, setAnnotation]           = useState(null);
  const [guidedTourActive, setGuidedTourActive] = useState(false);
  const [inspectionMode, setInspectionMode]   = useState(false);
  const [hoveredHotspot, setHoveredHotspot]   = useState(null);

  // Store scenes globally for preload lookups in PanoViewer
  useEffect(() => {
    window.__airPanoScenes = scenes;
  }, [scenes]);

  // ---- Track scene visits and switch audio on scene change ----
  const prevSceneId = useRef(null);
  useEffect(() => {
    if (currentScene && currentScene.id !== prevSceneId.current) {
      prevSceneId.current = currentScene.id;
      trackSceneVisit(currentScene.id);
      switchAudio(currentScene.audioUrl || null);
    }
  }, [currentScene, trackSceneVisit, switchAudio]);

  // ---- Navigation with analytics ----
  const handleNavigate = useCallback(
    (sceneId) => {
      trackHotspotClick(sceneId, currentScene?.id);
      setCurrentSceneById(sceneId);
      setAnnotation(null);
    },
    [setCurrentSceneById, trackHotspotClick, currentScene]
  );

  // ---- Annotation panel ----
  const handleAnnotationOpen = useCallback((ann) => {
    setAnnotation(ann);
  }, []);

  const handleAnnotationClose = useCallback(() => {
    setAnnotation(null);
  }, []);

  // ---- Feature toggles ----
  const handleGuidedTourToggle = useCallback(() => {
    setGuidedTourActive((prev) => !prev);
    setInspectionMode(false);
  }, []);

  const handleInspectionToggle = useCallback(() => {
    setInspectionMode((prev) => !prev);
    setGuidedTourActive(false);
  }, []);

  const handleHotspotHover = useCallback((hs) => {
    setHoveredHotspot(hs);
  }, []);

  // ---- Loading state ----
  if (loading) {
    return <Loader message="Loading aircraft tour..." />;
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

  return (
    <div className="app" id="app-root">
      {/* ---- Three.js 360° panorama viewer ---- */}
      <PanoViewer
        scene={currentScene}
        onNavigate={handleNavigate}
        onAnnotationOpen={handleAnnotationOpen}
        gyroEnabled={gyroEnabled}
        gyroOrientation={orientationRef}
        inspectionMode={inspectionMode}
        onHotspotHover={handleHotspotHover}
      />

      {/* ---- HUD overlay with controls ---- */}
      <Overlay
        currentScene={currentScene}
        scenes={scenes}
        onSceneChange={handleNavigate}
        gyroSupported={gyroSupported}
        gyroEnabled={gyroEnabled}
        onGyroToggle={toggleGyro}
        audioMuted={audioMuted}
        onAudioToggle={toggleAudio}
        inspectionMode={inspectionMode}
        onInspectionToggle={handleInspectionToggle}
        guidedTourActive={guidedTourActive}
        onGuidedTourToggle={handleGuidedTourToggle}
        hoveredHotspot={hoveredHotspot}
      />

      {/* ---- Annotation detail panel ---- */}
      {annotation && (
        <AnnotationPanel
          annotation={annotation}
          onClose={handleAnnotationClose}
        />
      )}

      {/* ---- Guided tour controls ---- */}
      {guidedTourActive && tourSequence.length > 0 && (
        <GuidedTour
          tourSequence={tourSequence}
          currentIndex={currentIndex}
          scenes={scenes}
          onSceneChange={handleNavigate}
          onClose={() => setGuidedTourActive(false)}
        />
      )}
    </div>
  );
}
