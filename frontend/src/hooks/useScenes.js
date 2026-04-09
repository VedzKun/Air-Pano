/**
 * useScenes v2 — Enhanced Scene State Management
 * =================================================
 * Fetches v2 schema (metadata, tourSequence, scenes) from the API.
 * Manages:
 *   - scenes[], currentScene, loading, error
 *   - tourSequence[] for guided tour
 *   - sceneHistory[] for back-navigation
 *   - nextScene / prevScene computed from tour sequence
 *   - setCurrentSceneById(id) with history tracking
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllData } from '../api/scenes';

export default function useScenes() {
  const [scenes, setScenes]               = useState([]);
  const [currentScene, setCurrentScene]   = useState(null);
  const [tourSequence, setTourSequence]   = useState([]);
  const [metadata, setMetadata]           = useState({});
  const [sceneHistory, setSceneHistory]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  // Fetch all data on mount (v2 schema)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAllData();

        if (!cancelled) {
          setScenes(data.scenes || []);
          setTourSequence(data.tourSequence || []);
          setMetadata(data.metadata || {});

          if (data.scenes?.length > 0) {
            setCurrentScene(data.scenes[0]);
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
    return () => { cancelled = true; };
  }, []);

  /**
   * Navigate to a scene by ID, pushing current to history.
   */
  const setCurrentSceneById = useCallback(
    (sceneId) => {
      const target = scenes.find((s) => s.id === sceneId);
      if (target) {
        setSceneHistory((prev) => {
          if (currentScene) {
            return [...prev.slice(-19), currentScene.id]; // keep last 20
          }
          return prev;
        });
        setCurrentScene(target);
      } else {
        console.warn(`Scene "${sceneId}" not found`);
      }
    },
    [scenes, currentScene]
  );

  /**
   * Go back to the previous scene in history.
   */
  const goBack = useCallback(() => {
    if (sceneHistory.length === 0) return;
    const prevId = sceneHistory[sceneHistory.length - 1];
    const target = scenes.find((s) => s.id === prevId);
    if (target) {
      setSceneHistory((prev) => prev.slice(0, -1));
      setCurrentScene(target);
    }
  }, [sceneHistory, scenes]);

  // Compute next/prev based on tour sequence
  const currentIndex = useMemo(() => {
    if (!currentScene) return -1;
    return tourSequence.indexOf(currentScene.id);
  }, [currentScene, tourSequence]);

  const nextSceneId = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= tourSequence.length - 1) return null;
    return tourSequence[currentIndex + 1];
  }, [currentIndex, tourSequence]);

  const prevSceneId = useMemo(() => {
    if (currentIndex <= 0) return null;
    return tourSequence[currentIndex - 1];
  }, [currentIndex, tourSequence]);

  return {
    scenes,
    currentScene,
    tourSequence,
    metadata,
    sceneHistory,
    loading,
    error,
    currentIndex,
    nextSceneId,
    prevSceneId,
    setCurrentSceneById,
    goBack,
  };
}
