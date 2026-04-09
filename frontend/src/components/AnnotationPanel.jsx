/**
 * AnnotationPanel — Slide-over Detail Panel
 * ============================================
 * Displays rich annotation content when an annotation-type hotspot is clicked.
 * Features:
 *   - Slide-in from right with smooth animation
 *   - Title, description, optional image
 *   - Click-outside or X button to dismiss
 *   - Responsive: full-width on mobile
 */

import React, { useEffect, useRef, useCallback } from 'react';
import './AnnotationPanel.css';

export default function AnnotationPanel({ annotation, onClose }) {
  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on click outside panel
  const handleBackdropClick = useCallback(
    (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    },
    [onClose]
  );

  if (!annotation) return null;

  return (
    <div
      className="annotation-backdrop"
      id="annotation-backdrop"
      onClick={handleBackdropClick}
    >
      <aside
        className="annotation-panel glass-panel"
        id="annotation-panel"
        ref={panelRef}
        role="dialog"
        aria-label={annotation.title}
      >
        {/* Close button */}
        <button
          className="annotation-close"
          id="annotation-close-btn"
          onClick={onClose}
          aria-label="Close annotation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Optional image */}
        {annotation.imageUrl && (
          <div className="annotation-image-wrap">
            <img
              className="annotation-image"
              src={annotation.imageUrl}
              alt={annotation.title}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Content */}
        <div className="annotation-content">
          <h2 className="annotation-title">{annotation.title}</h2>
          <p className="annotation-desc">{annotation.description}</p>
        </div>

        {/* Decorative accent bar */}
        <div className="annotation-accent" />
      </aside>
    </div>
  );
}
