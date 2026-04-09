/**
 * API Client v2 — Extended Scene & Analytics API
 * =================================================
 * Axios-based client with endpoints for scenes, tour, and analytics.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: { 'Accept': 'application/json' },
});

/**
 * Fetch all scenes (v2 schema: includes metadata, tourSequence, scenes[]).
 * @returns {Promise<Object>} Full response with metadata, tourSequence, scenes
 */
export async function fetchAllData() {
  const response = await api.get('/api/scenes');
  return response.data;
}

/**
 * Fetch all scenes (backward-compatible).
 * @returns {Promise<Array>} Array of scene objects
 */
export async function fetchScenes() {
  const response = await api.get('/api/scenes');
  return response.data.scenes;
}

/**
 * Fetch a single scene by its ID.
 */
export async function fetchSceneById(sceneId) {
  const response = await api.get(`/api/scenes/${sceneId}`);
  return response.data.scene;
}

/**
 * Fetch the guided tour sequence.
 * @returns {Promise<Object>} { tourSequence: string[], metadata: {} }
 */
export async function fetchTourSequence() {
  const response = await api.get('/api/tour');
  return response.data;
}

/**
 * Post analytics events to the backend.
 * @param {Array} events - Array of event objects
 * @returns {Promise<Object>} { status, received, totalStored }
 */
export async function postAnalytics(events) {
  const response = await api.post('/api/analytics', { events });
  return response.data;
}

/**
 * Send analytics via navigator.sendBeacon (for page unload).
 * Falls back to axios if sendBeacon is unavailable.
 * @param {Array} events
 */
export function sendAnalyticsBeacon(events) {
  if (navigator.sendBeacon) {
    const blob = new Blob(
      [JSON.stringify({ events })],
      { type: 'application/json' }
    );
    navigator.sendBeacon('/api/analytics', blob);
  } else {
    postAnalytics(events).catch(() => {});
  }
}

export default api;
