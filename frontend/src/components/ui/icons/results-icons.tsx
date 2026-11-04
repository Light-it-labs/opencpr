import type { SVGProps } from "react";

/**
 * The four metric glyphs and the ranking cup from the results design.
 *
 * Inline rather than added to the iconify registry: these are not lucide icons,
 * and the registry loads its set by name from the network at boot — a booth that
 * comes up without a connection would render the results screen without them.
 */

type ResultsIconProps = SVGProps<SVGSVGElement>;

/** Someone kneeling over a chest, mid-compression. */
export const CompressionsIcon = (props: ResultsIconProps) => {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 48 48" {...props}>
      <g fill="currentColor">
        <path
          clipRule="evenodd"
          d="M13 38a4 4 0 1 1 8 0a4 4 0 0 1-8 0m-1.445-2.523A6 6 0 0 0 11 38c0 1.537.578 2.938 1.528 4h-1.515a3.013 3.013 0 0 1-1.187-5.783zM21.472 42h1.515a3.013 3.013 0 0 0 1.187-5.783l-1.729-.74c.356.767.555 1.622.555 2.523a5.98 5.98 0 0 1-1.528 4"
          fillRule="evenodd"
        />
        <path d="M16 12a4 4 0 1 1-8 0a4 4 0 0 1 8 0m3 11v8a2 2 0 1 1-4 0V19.272c0-3.43 4.033-5.27 6.623-3.02l9.764 8.479a7.59 7.59 0 0 1 2.537 6.803L33 38h7a2 2 0 1 1 0 4H30a2 2 0 0 1-2-2v-7.204a4 4 0 0 0-1.343-2.99z" />
      </g>
    </svg>
  );
};

/** Chest returning between two bounds — the recoil. */
export const ReboundsIcon = (props: ResultsIconProps) => {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M13 9v6h3l-4 4l-4-4h3V9H8l4-4l4 4zM4 2h16v2H4zm0 18h16v2H4z" fill="currentColor" />
    </svg>
  );
};

/** Distance between two lines — how far the chest moved. */
export const DepthIcon = (props: ResultsIconProps) => {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        d="M4 12h16v2H4zm0-3h16v2H4zm12-5l-4 4l-4-4h3V1h2v3zM8 19l4-4l4 4h-3v3h-2v-3z"
        fill="currentColor"
      />
    </svg>
  );
};

/** A beat, for the rate. */
export const RateIcon = (props: ResultsIconProps) => {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M20.8 5.6a5.5 5.5 0 0 0-8.8 1.4a5.5 5.5 0 0 0-8.8-1.4c-2.1 2.1-2.1 5.5 0 7.6l8.8 8.8l8.8-8.8c2.1-2.1 2.1-5.5 0-7.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M3.5 13h4l2-3.5l2.5 6l2-2.5h6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

/** Shown beside where this run placed against everyone else today. */
export const RankingCupIcon = (props: ResultsIconProps) => {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        d="M18 2c-.9 0-2 1-2 2H8c0-1-1.1-2-2-2H2v9c0 1 1 2 2 2h2.2c.4 2 1.7 3.7 4.8 4v2.08C8 19.54 8 22 8 22h8s0-2.46-3-2.92V17c3.1-.3 4.4-2 4.8-4H20c1 0 2-1 2-2V2zM6 11H4V4h2zm10 .5c0 1.93-.58 3.5-4 3.5c-3.41 0-4-1.57-4-3.5V6h8zm4-.5h-2V4h2z"
        fill="currentColor"
      />
    </svg>
  );
};
