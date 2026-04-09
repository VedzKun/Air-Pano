/**
 * GuidedTour — Sequential Tour Navigation
 * ==========================================
 * Provides a tour control bar with:
 *   - Previous / Next buttons
 *   - Auto-play mode with configurable interval
 *   - Progress indicator dots
 *   - Current step display
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './GuidedTour.css';

const AUTO_PLAY_INTERVAL = 8000; // 8 seconds per scene

export default function GuidedTour({
  tourSequence,
  currentIndex,
  scenes,
  onSceneChange,
  onClose,
}) {
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef(null);

  const totalSteps = tourSequence.length;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < totalSteps - 1;

  // Current scene name
  const currentSceneObj = scenes.find(
    (s) => s.id === tourSequence[currentIndex]
  );

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (currentIndex < totalSteps - 1) {
        onSceneChange(tourSequence[currentIndex + 1]);
      } else {
        // Loop back to start
        onSceneChange(tourSequence[0]);
      }
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [autoPlay, currentIndex, totalSteps, tourSequence, onSceneChange]);

  const handlePrev = useCallback(() => {
    if (canPrev) onSceneChange(tourSequence[currentIndex - 1]);
  }, [canPrev, currentIndex, tourSequence, onSceneChange]);

  const handleNext = useCallback(() => {
    if (canNext) onSceneChange(tourSequence[currentIndex + 1]);
  }, [canNext, currentIndex, tourSequence, onSceneChange]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => !prev);
  }, []);

  return (
    <div className="guided-tour glass-panel" id="guided-tour">
      {/* Close / exit tour button */}
      <button
        className="gt-close"
        onClick={onClose}
        title="Exit guided tour"
        aria-label="Exit guided tour"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Step info */}
      <div className="gt-info">
        <span className="gt-step-label">
          Step {currentIndex + 1} of {totalSteps}
        </span>
        <span className="gt-scene-name">
          {currentSceneObj?.name || ''}
        </span>
      </div>

      {/* Progress dots */}
      <div className="gt-progress">
        {tourSequence.map((sceneId, i) => (
          <button
            key={sceneId}
            className={`gt-dot ${i === currentIndex ? 'gt-dot--active' : ''} ${i < currentIndex ? 'gt-dot--done' : ''}`}
            onClick={() => onSceneChange(sceneId)}
            title={scenes.find((s) => s.id === sceneId)?.name}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="gt-controls">
        <button
          className="gt-btn"
          onClick={handlePrev}
          disabled={!canPrev}
          title="Previous"
          aria-label="Previous scene"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          className={`gt-btn gt-btn--play ${autoPlay ? 'gt-btn--active' : ''}`}
          onClick={toggleAutoPlay}
          title={autoPlay ? 'Pause auto-play' : 'Start auto-play'}
          aria-label={autoPlay ? 'Pause auto-play' : 'Start auto-play'}
        >
          {autoPlay ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21" />
            </svg>
          )}
        </button>

        <button
          className="gt-btn"
          onClick={handleNext}
          disabled={!canNext}
          title="Next"
          aria-label="Next scene"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
