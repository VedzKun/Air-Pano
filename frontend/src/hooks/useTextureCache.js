/**
 * useTextureCache — GPU Texture Management with LRU Cache & Preloading
 * =====================================================================
 * Manages Three.js textures with:
 *   - LRU cache (max 6 textures in GPU memory)
 *   - Background preloading of linked scene textures
 *   - Progressive loading: thumbnail first, then full-res
 *   - Proper GPU memory disposal to prevent leaks
 */

import { useRef, useCallback } from 'react';
import * as THREE from 'three';

const MAX_CACHE_SIZE = 6;

export default function useTextureCache() {
  // Map<url, { texture, lastUsed, loading }>
  const cache = useRef(new Map());
  const loader = useRef(new THREE.TextureLoader());

  /**
   * Evict least-recently-used textures if cache exceeds max size.
   */
  const evict = useCallback(() => {
    const entries = Array.from(cache.current.entries());
    if (entries.length <= MAX_CACHE_SIZE) return;

    // Sort by lastUsed ascending (oldest first)
    entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    // Remove oldest entries beyond the limit
    const toRemove = entries.length - MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      const [url, entry] = entries[i];
      entry.texture?.dispose();
      cache.current.delete(url);
    }
  }, []);

  /**
   * Load a texture, returning it from cache if available.
   * @param {string} url - Texture URL
   * @returns {Promise<THREE.Texture>}
   */
  const loadTexture = useCallback((url) => {
    return new Promise((resolve, reject) => {
      // Return cached texture
      const cached = cache.current.get(url);
      if (cached && cached.texture) {
        cached.lastUsed = Date.now();
        resolve(cached.texture);
        return;
      }

      // Check if already loading
      if (cached && cached.loading) {
        // Wait for existing load
        const check = setInterval(() => {
          const entry = cache.current.get(url);
          if (entry && entry.texture) {
            clearInterval(check);
            entry.lastUsed = Date.now();
            resolve(entry.texture);
          }
        }, 100);
        return;
      }

      // Start loading
      cache.current.set(url, { texture: null, lastUsed: Date.now(), loading: true });

      loader.current.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          cache.current.set(url, { texture, lastUsed: Date.now(), loading: false });
          evict();
          resolve(texture);
        },
        undefined,
        (err) => {
          cache.current.delete(url);
          reject(err);
        }
      );
    });
  }, [evict]);

  /**
   * Preload multiple textures in the background (low priority).
   * @param {string[]} urls
   */
  const preload = useCallback((urls) => {
    urls.forEach((url) => {
      if (!cache.current.has(url)) {
        // Use setTimeout to defer behind main loading
        setTimeout(() => loadTexture(url).catch(() => {}), 500);
      }
    });
  }, [loadTexture]);

  /**
   * Check if a texture is already cached.
   */
  const has = useCallback((url) => {
    const entry = cache.current.get(url);
    return !!(entry && entry.texture);
  }, []);

  /**
   * Dispose a specific texture from cache.
   */
  const dispose = useCallback((url) => {
    const entry = cache.current.get(url);
    if (entry && entry.texture) {
      entry.texture.dispose();
      cache.current.delete(url);
    }
  }, []);

  /**
   * Dispose all cached textures.
   */
  const disposeAll = useCallback(() => {
    for (const [, entry] of cache.current) {
      entry.texture?.dispose();
    }
    cache.current.clear();
  }, []);

  return { loadTexture, preload, has, dispose, disposeAll };
}
