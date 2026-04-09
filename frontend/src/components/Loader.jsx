/**
 * Loader Component
 * =================
 * Full-screen loading overlay with an aircraft-themed spinner animation.
 * Displayed during initial data fetch and during scene transitions.
 */

import React from 'react';
import './Loader.css';

export default function Loader({ message = 'Preparing your tour…' }) {
  return (
    <div className="loader-overlay" id="loader-overlay">
      {/* Spinning ring + pulsing core */}
      <div className="loader-spinner">
        <div className="loader-ring" />
        <div className="loader-core" />
      </div>
      <p className="loader-message">{message}</p>
    </div>
  );
}
