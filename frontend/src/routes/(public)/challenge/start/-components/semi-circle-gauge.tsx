import { useEffect, useState } from "react";

type GaugeProps = {
  value: number;
};

const CONFIG = {
  strokeWidth: 30,
  min: 80,
  max: 140,
  greenHalfWidth: 10,
  yellowHalfWidth: 20,
  size: 400,
  animationDuration: 250,
};

const clamp = (v: number) => {
  return Math.max(Math.min(v, CONFIG.max), CONFIG.min);
};
const map = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  return outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);
};

// Gauge degrees: -90 (left) .. 0 (top) .. +90 (right)
const valueToGaugeDeg = (v: number) => {
  return map(clamp(v), CONFIG.min, CONFIG.max, -90, 90);
};
// Convert gauge degrees to SVG polar angle (0°=right, 90°=up, 180°=left)
const gaugeDegToPolar = (deg: number) => {
  return 90 - deg;
};

// SVG arc path for a band on the semicircle
const arcPath = (startGaugeDeg: number, endGaugeDeg: number, r: number, cx: number, cy: number) => {
  const a0 = (gaugeDegToPolar(startGaugeDeg) * Math.PI) / 180;
  const a1 = (gaugeDegToPolar(endGaugeDeg) * Math.PI) / 180;

  const x0 = cx + r * Math.cos(a0);
  const y0 = cy - r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);

  const sweepFlag = a1 < a0 ? 1 : 0; // draw over the top, clockwise if needed

  return `M ${x0} ${y0} A ${r} ${r} 0 0 ${sweepFlag} ${x1} ${y1}`;
};

export const SemiCircleGauge = ({ value }: GaugeProps) => {
  const [animatedValue, setAnimatedValue] = useState(value);

  // Animate value changes
  useEffect(() => {
    const startValue = animatedValue;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / CONFIG.animationDuration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easeOut;
      setAnimatedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    if (startValue !== endValue) {
      requestAnimationFrame(animate);
    }
  }, [value, animatedValue]);

  const mid = (CONFIG.min + CONFIG.max) / 2;

  // Geometry
  const pad = CONFIG.strokeWidth / 2 + 40;
  const r = (CONFIG.size - 2 * pad) / 2;
  const cx = CONFIG.size / 2;
  const cy = r + pad; // semicircle center

  // Needle (use animated value for smooth transitions)
  const deg = valueToGaugeDeg(animatedValue);
  const needlePolar = (gaugeDegToPolar(deg) * Math.PI) / 180;
  const needleLen = r;
  const nx = cx + needleLen * Math.cos(needlePolar);
  const ny = cy - needleLen * Math.sin(needlePolar);

  // Band boundaries (clamped to [min, max])
  const LR = clamp(mid - CONFIG.yellowHalfWidth);
  const LY = clamp(mid - CONFIG.greenHalfWidth);
  const RY = clamp(mid + CONFIG.greenHalfWidth);
  const RR = clamp(mid + CONFIG.yellowHalfWidth);

  type Band = { from: number; to: number; color: string };
  const maybe = (from: number, to: number, color: string): Band | null => {
    return to > from ? { from, to, color } : null;
  };

  const bands = [
    maybe(CONFIG.min, LR, "var(--results-low)"),
    maybe(LR, LY, "var(--results-mid)"),
    maybe(LY, RY, "var(--results-high)"),
    maybe(RY, RR, "var(--results-mid)"),
    maybe(RR, CONFIG.max, "var(--results-low)"),
  ].filter(Boolean) as Band[];

  // Mid tick (always vertical)
  const midDeg = valueToGaugeDeg(mid); // should be 0
  const th = (gaugeDegToPolar(midDeg) * Math.PI) / 180;
  const ix = cx + (r - CONFIG.strokeWidth) * Math.cos(th);
  const iy = cy - (r - CONFIG.strokeWidth) * Math.sin(th) - 12;
  const ox = cx + (r + 10) * Math.cos(th);
  const oy = cy - (r + 10) * Math.sin(th) - 8;

  return (
    <svg
      className="mt-5 -mb-20"
      height={CONFIG.size}
      viewBox={`0 0 ${CONFIG.size} ${CONFIG.size}`}
      width={CONFIG.size}
    >
      {/* Colored bands */}
      {bands.map((b, i) => {
        const s = valueToGaugeDeg(b.from);
        const e = valueToGaugeDeg(b.to);

        return (
          <path
            d={arcPath(s, e, r, cx, cy)}
            fill="none"
            key={i}
            strokeWidth={CONFIG.strokeWidth}
            style={{ stroke: b.color }}
          />
        );
      })}

      {/* Mid tick, needle and labels: currentColor + text-foreground so they read
          against the dark metric-box surface instead of a fixed near-black. */}
      <g className="text-foreground">
        <line
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={4}
          x1={ix}
          x2={ox}
          y1={iy}
          y2={oy}
        />

        {/* Needle */}
        <line
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={4}
          x1={cx}
          x2={nx}
          y1={cy}
          y2={ny}
        />
        <circle cx={cx} cy={cy} fill="currentColor" r={6} />

        {/* Labels: min / midpoint / max */}
        <text fill="currentColor" fontSize={20} x={pad + 20} y={cy}>
          - {CONFIG.min}
        </text>
        <text fill="currentColor" fontSize={20} textAnchor="middle" x={cx} y={30}>
          {Math.round(mid * 100) / 100}
        </text>
        <text fill="currentColor" fontSize={20} textAnchor="end" x={CONFIG.size - pad - 20} y={cy}>
          + {CONFIG.max}
        </text>

        <text
          className="font-bold"
          fill="currentColor"
          fontSize={30}
          textAnchor="middle"
          x={CONFIG.size / 2}
          y={CONFIG.size / 2 + 40}
        >
          {Math.round(animatedValue)}
        </text>
        <text
          fill="currentColor"
          fontSize={20}
          textAnchor="middle"
          x={CONFIG.size / 2}
          y={CONFIG.size / 2 + 60}
        >
          BPM
        </text>
      </g>
    </svg>
  );
};
