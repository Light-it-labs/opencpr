import { useEffect, useState } from "react";
import ConfettiBoom from "react-confetti-boom";

/** The brand's reds, pinks and ink, so the paper belongs to the screen it falls on. */
const PIECE_COLORS = ["#B23A2E", "#C4473A", "#E59A92", "#F2C6BE", "#2A171B"];

const PIECE_COUNT = 70;

/**
 * The library stops its own animation frame once every piece has fallen the full
 * height of the screen, which on a kiosk panel is long enough to still be going
 * while somebody reads their numbers. These cut it short instead.
 */
const FADE_AFTER_MS = 2600;
const REMOVE_AFTER_MS = 3400;

/**
 * The celebration over a flawless run, and only over a flawless run — falling
 * paper on a screen that just told someone their compressions were too shallow
 * would read as mockery.
 *
 * The library draws to a canvas on an animation frame loop, which a media query
 * cannot reach, so a reduced-motion visitor is given nothing to mount rather
 * than something hidden.
 */
export const Confetti = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [isFading, setIsFading] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    query.addEventListener("change", handleChange);

    return () => {
      query.removeEventListener("change", handleChange);
    };
  }, []);

  // Faded out first and unmounted after, so the pieces are not cut off in
  // mid-air; unmounting is what actually releases the frame loop.
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, FADE_AFTER_MS);

    const removeTimer = setTimeout(() => {
      setHasFinished(true);
    }, REMOVE_AFTER_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (prefersReducedMotion || hasFinished) {
    return null;
  }

  return (
    // Above the screen's own content: every block on it animates in, and a
    // transform makes an element paint as though positioned, which left the
    // library's own un-layered canvas behind all of them.
    <div
      className={`pointer-events-none absolute inset-0 z-40 transition-opacity duration-700 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <ConfettiBoom colors={PIECE_COLORS} mode="fall" particleCount={PIECE_COUNT} shapeSize={18} />
    </div>
  );
};
