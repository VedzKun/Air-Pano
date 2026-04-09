/**
 * API Client — Scene Data Fetching
 * =================================
 * Axios-based client for communicating with the Flask backend.
 * Uses relative URLs so the Vite dev proxy forwards requests to Flask.
 */

import axios from 'axios';

// Base Axios instance. In production, set baseURL to the deployed API origin.
const api = axios.create({
  baseURL: '',           // relative — Vite proxy handles /api/* in dev
  timeout: 10000,        // 10 s timeout
  headers: { 'Accept': 'application/json' },
});

/**
 * Fetch all scenes from the backend.
 * @returns {Promise<Array>} Array of scene objects
 */
export async function fetchScenes() {
  const response = await api.get('/api/scenes');
  return response.data.scenes;
}

/**
 * Fetch a single scene by its ID.
 * @param {string} sceneId
 * @returns {Promise<Object>} Scene object
 */
export async function fetchSceneById(sceneId) {
  const response = await api.get(`/api/scenes/${sceneId}`);
  return response.data.scene;
}

export default api;
