/**
 * useAudio — Scene Narration Audio Hook
 * =======================================
 * Manages per-scene audio with crossfade transitions.
 * Starts muted (respects browser autoplay policies).
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const CROSSFADE_MS = 600;

export default function useAudio() {
  const [muted, setMuted]     = useState(true);
  const [playing, setPlaying] = useState(false);
  const audioRef              = useRef(null);
  const fadeTimerRef           = useRef(null);
  const volumeRef             = useRef(0.7);

  /**
   * Switch to a new audio source (called on scene change).
   */
  const switchAudio = useCallback((audioUrl) => {
    // Fade out current
    if (audioRef.current) {
      const old = audioRef.current;
      const startVol = old.volume;
      let step = 0;
      const steps = 15;
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = setInterval(() => {
        step++;
        old.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fadeTimerRef.current);
          old.pause();
          old.src = '';
        }
      }, CROSSFADE_MS / steps);
    }

    if (!audioUrl) {
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    // Create new audio
    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    if (!muted) {
      // Fade in after a brief delay to let crossfade finish
      setTimeout(() => {
        audio.play().then(() => {
          let step = 0;
          const steps = 15;
          const targetVol = volumeRef.current;
          const timer = setInterval(() => {
            step++;
            audio.volume = Math.min(targetVol, targetVol * (step / steps));
            if (step >= steps) clearInterval(timer);
          }, CROSSFADE_MS / steps);
          setPlaying(true);
        }).catch(() => {
          setPlaying(false);
        });
      }, CROSSFADE_MS + 100);
    }
  }, [muted]);

  /**
   * Toggle mute/unmute.
   */
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      if (audioRef.current) {
        if (newMuted) {
          audioRef.current.pause();
          setPlaying(false);
        } else {
          audioRef.current.volume = volumeRef.current;
          audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
        }
      }
      return newMuted;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(fadeTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return { muted, playing, switchAudio, toggleMute };
}
