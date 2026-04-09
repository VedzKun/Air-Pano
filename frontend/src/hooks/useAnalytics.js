/**
 * useAnalytics — Interaction Tracking Hook
 * ==========================================
 * Provides React-friendly wrappers around the AnalyticsPlugin.
 * Tracks scene visits, hotspot clicks, and time spent automatically.
 */

import { useRef, useCallback, useEffect } from 'react';
import { postAnalytics, sendAnalyticsBeacon } from '../api/scenes';

const FLUSH_INTERVAL = 30000;

export default function useAnalytics() {
  const buffer = useRef([]);
  const sceneEntry = useRef({ sceneId: null, time: null });
  const timerRef = useRef(null);

  // Flush buffered events to backend
  const flush = useCallback(() => {
    if (buffer.current.length === 0) return;
    const events = [...buffer.current];
    buffer.current = [];
    postAnalytics(events).catch(() => {
      buffer.current.unshift(...events);
    });
  }, []);

  // Use sendBeacon on unload
  const flushBeacon = useCallback(() => {
    // Record final time spent
    if (sceneEntry.current.sceneId) {
      buffer.current.push({
        type: 'time_spent',
        sceneId: sceneEntry.current.sceneId,
        duration: Date.now() - sceneEntry.current.time,
        timestamp: Date.now(),
      });
    }
    if (buffer.current.length > 0) {
      sendAnalyticsBeacon(buffer.current);
      buffer.current = [];
    }
  }, []);

  // Setup flush timer and unload handler
  useEffect(() => {
    timerRef.current = setInterval(flush, FLUSH_INTERVAL);
    window.addEventListener('beforeunload', flushBeacon);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushBeacon();
    });

    return () => {
      flushBeacon();
      clearInterval(timerRef.current);
      window.removeEventListener('beforeunload', flushBeacon);
    };
  }, [flush, flushBeacon]);

  /**
   * Track a scene visit. Also records time spent on previous scene.
   */
  const trackSceneVisit = useCallback((sceneId) => {
    // Time spent on previous scene
    if (sceneEntry.current.sceneId) {
      buffer.current.push({
        type: 'time_spent',
        sceneId: sceneEntry.current.sceneId,
        duration: Date.now() - sceneEntry.current.time,
        timestamp: Date.now(),
      });
    }

    sceneEntry.current = { sceneId, time: Date.now() };
    buffer.current.push({
      type: 'scene_visit',
      sceneId,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * Track a hotspot click.
   */
  const trackHotspotClick = useCallback((hotspotId, sceneId) => {
    buffer.current.push({
      type: 'hotspot_click',
      hotspotId,
      sceneId,
      timestamp: Date.now(),
    });
  }, []);

  return { trackSceneVisit, trackHotspotClick, flush };
}
