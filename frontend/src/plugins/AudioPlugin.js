/**
 * AudioPlugin — Scene Narration Audio Manager
 * ==============================================
 * Manages HTML5 Audio elements for per-scene narration.
 * Features:
 *   - Auto-play on scene change
 *   - Crossfade between scenes
 *   - Mute/unmute toggle with state persistence
 */

const CROSSFADE_DURATION = 800; // ms

export default function createAudioPlugin() {
  let currentAudio = null;
  let muted = true; // start muted by default — browser autoplay policy
  let volume = 0.7;
  let onStateChange = null; // callback for React state sync

  function fadeOut(audio, duration = CROSSFADE_DURATION) {
    if (!audio) return Promise.resolve();
    return new Promise((resolve) => {
      const startVol = audio.volume;
      const steps = 20;
      const stepTime = duration / steps;
      const stepVol = startVol / steps;
      let current = 0;
      const interval = setInterval(() => {
        current++;
        audio.volume = Math.max(0, startVol - stepVol * current);
        if (current >= steps) {
          clearInterval(interval);
          audio.pause();
          audio.volume = startVol;
          resolve();
        }
      }, stepTime);
    });
  }

  function fadeIn(audio, targetVol, duration = CROSSFADE_DURATION) {
    if (!audio) return;
    audio.volume = 0;
    audio.play().catch(() => {}); // may fail due to autoplay policy
    const steps = 20;
    const stepTime = duration / steps;
    const stepVol = targetVol / steps;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      audio.volume = Math.min(targetVol, stepVol * current);
      if (current >= steps) clearInterval(interval);
    }, stepTime);
  }

  return {
    name: 'audio',

    init(context) {
      onStateChange = context?.onAudioStateChange || null;
    },

    async onSceneChange(scene) {
      // Fade out current audio
      if (currentAudio) {
        await fadeOut(currentAudio);
        currentAudio = null;
      }

      // Load new audio if scene has one
      if (scene.audioUrl) {
        const audio = new Audio(scene.audioUrl);
        audio.loop = true;
        audio.volume = muted ? 0 : volume;
        currentAudio = audio;

        if (!muted) {
          fadeIn(audio, volume);
        }
      }

      onStateChange?.({ muted, playing: !muted && !!scene.audioUrl });
    },

    toggleMute() {
      muted = !muted;
      if (currentAudio) {
        if (muted) {
          currentAudio.volume = 0;
          currentAudio.pause();
        } else {
          currentAudio.volume = volume;
          currentAudio.play().catch(() => {});
        }
      }
      onStateChange?.({ muted, playing: !muted && !!currentAudio });
      return muted;
    },

    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (currentAudio && !muted) {
        currentAudio.volume = volume;
      }
    },

    isMuted() {
      return muted;
    },

    destroy() {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
    },
  };
}
