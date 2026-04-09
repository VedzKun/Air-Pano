/**
 * GyroscopePlugin — Mobile Device Orientation Integration
 * =========================================================
 * Uses the DeviceOrientation API to provide phone-as-controller navigation.
 * - Detects support and handles iOS 13+ permission requests
 * - Converts alpha/beta/gamma to lon/lat for camera control
 * - Provides enable/disable toggle
 *
 * NOTE: Requires HTTPS on iOS Safari. HTTP works on Android Chrome.
 */

export default function createGyroscopePlugin() {
  let supported = false;
  let enabled = false;
  let onOrientationUpdate = null; // callback: ({ lon, lat }) => void
  let onStateChange = null;
  let initialAlpha = null;
  let lastOrientation = { alpha: 0, beta: 0, gamma: 0 };

  function handleOrientation(event) {
    if (!enabled) return;

    const { alpha, beta, gamma } = event;
    if (alpha === null) return;

    // Set initial alpha on first reading to use as reference
    if (initialAlpha === null) {
      initialAlpha = alpha;
    }

    lastOrientation = { alpha, beta, gamma };

    // Convert device orientation to panorama lon/lat
    // alpha: compass direction (0-360) → horizontal rotation
    // beta: front-back tilt (-180 to 180) → vertical rotation
    const lon = -(alpha - initialAlpha); // relative to initial heading
    const lat = Math.max(-85, Math.min(85, beta - 90)); // map to vertical angle

    onOrientationUpdate?.({ lon, lat });
  }

  return {
    name: 'gyroscope',

    init(context) {
      onOrientationUpdate = context?.onOrientationUpdate || null;
      onStateChange = context?.onGyroStateChange || null;

      // Check for DeviceOrientationEvent support
      supported = 'DeviceOrientationEvent' in window;
    },

    isSupported() {
      return supported;
    },

    isEnabled() {
      return enabled;
    },

    /**
     * Toggle gyroscope on/off.
     * On iOS 13+, this will request permission on first enable.
     */
    async toggle() {
      if (!supported) {
        console.warn('[GyroscopePlugin] DeviceOrientation not supported');
        return false;
      }

      if (enabled) {
        // Disable
        enabled = false;
        window.removeEventListener('deviceorientation', handleOrientation);
        onStateChange?.({ enabled: false, supported });
        return false;
      }

      // Enable — may need permission on iOS
      try {
        if (
          typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function'
        ) {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission !== 'granted') {
            console.warn('[GyroscopePlugin] Permission denied');
            onStateChange?.({ enabled: false, supported, permissionDenied: true });
            return false;
          }
        }

        enabled = true;
        initialAlpha = null; // reset reference on re-enable
        window.addEventListener('deviceorientation', handleOrientation);
        onStateChange?.({ enabled: true, supported });
        return true;
      } catch (err) {
        console.error('[GyroscopePlugin] Failed to enable:', err);
        onStateChange?.({ enabled: false, supported, error: err.message });
        return false;
      }
    },

    getLastOrientation() {
      return lastOrientation;
    },

    destroy() {
      enabled = false;
      window.removeEventListener('deviceorientation', handleOrientation);
    },
  };
}
