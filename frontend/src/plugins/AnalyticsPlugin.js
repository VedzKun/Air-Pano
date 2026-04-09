/**
 * AnalyticsPlugin — Interaction Tracking
 * ========================================
 * Tracks scene visits, hotspot clicks, and time spent per scene.
 * Buffers events and flushes to POST /api/analytics every 30 seconds.
 * Uses navigator.sendBeacon on page unload for reliability.
 */

import { postAnalytics, sendAnalyticsBeacon } from '../api/scenes';

const FLUSH_INTERVAL = 30000; // 30 seconds

export default function createAnalyticsPlugin() {
  let buffer = [];
  let flushTimer = null;
  let sceneEntryTime = null;
  let currentSceneId = null;

  function flush() {
    if (buffer.length === 0) return;
    const events = [...buffer];
    buffer = [];
    postAnalytics(events).catch((err) => {
      console.warn('[AnalyticsPlugin] Failed to flush events:', err);
      // Re-add failed events to buffer for next attempt
      buffer.unshift(...events);
    });
  }

  function flushBeacon() {
    // Record final time-spent for current scene
    if (currentSceneId && sceneEntryTime) {
      buffer.push({
        type: 'time_spent',
        sceneId: currentSceneId,
        duration: Date.now() - sceneEntryTime,
        timestamp: Date.now(),
      });
    }
    if (buffer.length > 0) {
      sendAnalyticsBeacon(buffer);
      buffer = [];
    }
  }

  return {
    name: 'analytics',

    init() {
      flushTimer = setInterval(flush, FLUSH_INTERVAL);
      window.addEventListener('beforeunload', flushBeacon);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushBeacon();
      });
    },

    onSceneChange(scene) {
      // Record time spent on previous scene
      if (currentSceneId && sceneEntryTime) {
        buffer.push({
          type: 'time_spent',
          sceneId: currentSceneId,
          duration: Date.now() - sceneEntryTime,
          timestamp: Date.now(),
        });
      }

      // Track new scene visit
      currentSceneId = scene.id;
      sceneEntryTime = Date.now();
      buffer.push({
        type: 'scene_visit',
        sceneId: scene.id,
        timestamp: Date.now(),
      });
    },

    /**
     * Track a hotspot click event.
     * Call this externally: registry.get('analytics').trackHotspot(id, sceneId)
     */
    trackHotspot(hotspotId, sceneId) {
      buffer.push({
        type: 'hotspot_click',
        hotspotId,
        sceneId,
        timestamp: Date.now(),
      });
    },

    destroy() {
      flushBeacon();
      if (flushTimer) clearInterval(flushTimer);
      window.removeEventListener('beforeunload', flushBeacon);
    },
  };
}
