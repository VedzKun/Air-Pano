/**
 * useGyroscope — Device Orientation Hook
 * ========================================
 * Wraps the DeviceOrientation API for React components.
 * Returns orientation data (lon/lat) and toggle controls.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export default function useGyroscope() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled]     = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const initialAlpha = useRef(null);
  const orientationRef = useRef({ lon: 0, lat: 0 });

  useEffect(() => {
    setSupported('DeviceOrientationEvent' in window);
  }, []);

  const handleOrientation = useCallback((event) => {
    const { alpha, beta } = event;
    if (alpha === null) return;

    if (initialAlpha.current === null) {
      initialAlpha.current = alpha;
    }

    orientationRef.current = {
      lon: -(alpha - initialAlpha.current),
      lat: Math.max(-85, Math.min(85, beta - 90)),
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!supported) return false;

    if (enabled) {
      window.removeEventListener('deviceorientation', handleOrientation);
      setEnabled(false);
      return false;
    }

    // iOS 13+ permission request
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') {
          setPermissionDenied(true);
          return false;
        }
      }

      initialAlpha.current = null;
      window.addEventListener('deviceorientation', handleOrientation);
      setEnabled(true);
      return true;
    } catch {
      setPermissionDenied(true);
      return false;
    }
  }, [supported, enabled, handleOrientation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [handleOrientation]);

  return {
    supported,
    enabled,
    permissionDenied,
    toggle,
    orientationRef, // mutable ref for frame-by-frame reading
  };
}
