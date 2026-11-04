import { useCallback, useEffect, useRef } from "react";

// Imported rather than written as a path. A "/src/assets/audio/..." string only
// resolves under the dev server, so the metronome would be silent in every
// production build. Going through the bundler yields the hashed URL that ships.
import metronomeSrc from "@/assets/audio/metronome.mp3";

/**
 * The compression-rhythm guide participants pace themselves to: a 110bpm
 * metronome, the middle of the 100-120 range session-scoring rewards.
 *
 * The clip is an exact whole number of beats, so looping it cannot drift out
 * of time with itself. It also runs longer than any plausible run, so the loop
 * point is rarely reached at all.
 */
export const useRhythmAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    // Restart rather than resume, so a second run does not begin halfway
    // through the loop.
    audio.currentTime = 0;

    audio.play().catch(() => {
      // Playback was refused for want of a user gesture. A silent run is still
      // a perfectly good run, and there is nothing the participant could do
      // about it, so this stays quiet.
    });
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }, []);

  // Covers every exit that is not the end of the challenge: an idle reset, the
  // back button, a lost sensor. Without this the audio carries on over the
  // attract screen.
  useEffect(() => {
    // Captured on mount rather than read in the cleanup. The element is
    // rendered unconditionally and never remounts, so the ref cannot point
    // somewhere else by the time this runs.
    const audio = audioRef.current;

    return () => {
      audio?.pause();
    };
  }, []);

  return { audioRef, audioSrc: metronomeSrc, startAudio, stopAudio } as const;
};
