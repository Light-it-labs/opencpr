import { useEffect, useRef, useState } from "react";

import { CONFIG } from "@/config/constants";

type UseDepthBarCompressionAnimationProps = {
  bpm: number;
  targetDepthMm: number;
  timestamp: number;
};

export const useDepthBarCompressionAnimation = ({
  bpm,
  targetDepthMm,
  timestamp,
}: UseDepthBarCompressionAnimationProps) => {
  const [animatedDepth, setAnimatedDepth] = useState(0);

  const animatedDepthRef = useRef(0);
  const animationIdRef = useRef<number | null>(null);
  const releaseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any in-flight animation frame or pending release timeout
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    if (releaseTimeoutRef.current) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }

    // Guard against bpm = 0
    const safeBpm = bpm && bpm > 0 ? bpm : 100;
    const timeBetweenCompressions = 60000 / safeBpm; // ms between beats

    const targetDepth = targetDepthMm / 10; // convert mm to cm for UI depth
    const startDepth = animatedDepthRef.current;
    const compressionStartTime = performance.now();

    const animateCompression = () => {
      const elapsed = performance.now() - compressionStartTime;
      const progress = Math.min(elapsed / CONFIG.compressionAnimationMs, 1);

      const easeProgress =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const newDepth = startDepth + (targetDepth - startDepth) * easeProgress;

      setAnimatedDepth(newDepth);
      animatedDepthRef.current = newDepth;

      if (progress < 1) {
        animationIdRef.current = requestAnimationFrame(animateCompression);
      } else {
        const delay = Math.max(
          10,
          timeBetweenCompressions - CONFIG.compressionAnimationMs - CONFIG.releaseAnimationMs,
        );

        releaseTimeoutRef.current = window.setTimeout(() => {
          const releaseStartTime = performance.now();

          const animateRelease = () => {
            const elapsed = performance.now() - releaseStartTime;
            const progress = Math.min(elapsed / CONFIG.releaseAnimationMs, 1);

            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const newDepth = targetDepth * (1 - easeProgress);

            setAnimatedDepth(newDepth);
            animatedDepthRef.current = newDepth;

            if (progress < 1) {
              animationIdRef.current = requestAnimationFrame(animateRelease);
            } else {
              animationIdRef.current = null;
            }
          };

          animationIdRef.current = requestAnimationFrame(animateRelease);
          releaseTimeoutRef.current = null;
        }, delay);
      }
    };

    animationIdRef.current = requestAnimationFrame(animateCompression);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }
    };
  }, [timestamp, bpm, targetDepthMm]);

  return animatedDepth;
};
