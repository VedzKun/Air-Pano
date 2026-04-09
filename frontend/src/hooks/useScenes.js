/**
 * useScenes — Custom Hook for Scene State Management
 * ====================================================
 * Fetches all scenes from the API on mount and manages:
 *   - scenes[]         all loaded scene data
 *   - currentScene     the scene currently being viewed
 *   - loading          whether the initial fetch is in progress
 *   - error            any fetch error message
 *   - setCurrentSceneById(id)   switch to a different scene
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchScenes } from '../api/scenes';

export default function useScenes() {
  const [scenes, setScenes]             = useState([]);
  const [currentScene, setCurrentScene] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Fetch all scenes on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchScenes();

        if (!cancelled) {
          setScenes(data);
          // Start tour at the first scene (cockpit)
          if (data.length > 0) {
            setCurrentScene(data[0]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load scenes:', err);
          setError(
            err.response?.data?.error ||
            err.message ||
            'Failed to load scene data'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // Cleanup: prevent state updates if component unmounts during fetch
    return () => { cancelled = true; };
  }, []);

  /**
   * Navigate to a different scene by its ID.
   * @param {string} sceneId
   */
  const setCurrentSceneById = useCallback(
    (sceneId) => {
      const target = scenes.find((s) => s.id === sceneId);
      if (target) {
        setCurrentScene(target);
      } else {
        console.warn(`Scene "${sceneId}" not found`);
      }
    },
    [scenes]
  );

  return { scenes, currentScene, loading, error, setCurrentSceneById };
}
