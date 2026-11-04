import { describe, expect, it } from "vitest";

import type { CprCompression } from "@/stores";
import { CPR_TARGETS, deriveCompressions, MAX_SCORE, scoreSession } from "./session-scoring";

const compression = (timestampMs: number, endDepthMm: number, startDepthMm = 0): CprCompression => {
  return { timestampMs, startDepthMm, endDepthMm };
};

/** A run at one steady interval and one steady depth, released fully every time. */
const steadyRun = (count: number, intervalMs: number, endDepthMm = 55, startDepthMm = 0) => {
  return Array.from({ length: count }, (_, index) => {
    return compression(index * intervalMs, endDepthMm, startDepthMm);
  });
};

describe("deriveCompressions", () => {
  it("has no rate for the first compression and derives it from the interval after that", () => {
    const [first, second] = deriveCompressions([compression(0, 55), compression(600, 55)]);

    expect(first.bpm).toBeNull();
    expect(second.bpm).toBeCloseTo(100);
  });

  it("averages the rate over the last three intervals", () => {
    const derived = deriveCompressions([
      compression(0, 55),
      compression(1000, 55),
      compression(1500, 55),
      compression(2000, 55),
      compression(2500, 55),
    ]);

    expect(derived[4].bpm).toBeCloseTo(120);
  });

  it("ignores a repeated timestamp instead of producing an infinite rate", () => {
    const derived = deriveCompressions([
      compression(0, 55),
      compression(600, 55),
      compression(600, 55),
    ]);

    expect(derived[2].bpm).toBeCloseTo(100);
  });

  it("counts a compression as full exactly at the minimum depth", () => {
    const [atMin, justShort] = deriveCompressions([
      compression(0, CPR_TARGETS.depthMinMm),
      compression(600, CPR_TARGETS.depthMinMm - 0.1),
    ]);

    expect(atMin.hasFullyCompressed).toBe(true);
    expect(justShort.hasFullyCompressed).toBe(false);
  });

  it("counts a release as full exactly at the residual depth limit", () => {
    const [atLimit, justOver] = deriveCompressions([
      compression(0, 55, CPR_TARGETS.fullRecoilMaxDepthMm),
      compression(600, 55, CPR_TARGETS.fullRecoilMaxDepthMm + 0.1),
    ]);

    expect(atLimit.hasFullyRebounded).toBe(true);
    expect(justOver.hasFullyRebounded).toBe(false);
  });
});

describe("scoreSession", () => {
  it("scores an empty run as zero everywhere", () => {
    expect(scoreSession([])).toEqual({
      score: 0,
      totalCompressions: 0,
      totalFullCompressions: 0,
      totalFullRebounds: 0,
      compressionsOnBpmRange: 0,
      averageBpm: 0,
      averageCompressionEndDepthMm: 0,
    });
  });

  it("scores a single compression on depth and recoil alone, with no rate", () => {
    const statistics = scoreSession([compression(0, 55)]);

    expect(statistics).toEqual({
      score: 695,
      totalCompressions: 1,
      totalFullCompressions: 1,
      totalFullRebounds: 1,
      compressionsOnBpmRange: 0,
      averageBpm: 0,
      averageCompressionEndDepthMm: 55,
    });
  });

  it("gives the maximum score to a flawless run", () => {
    const statistics = scoreSession(steadyRun(30, 545));

    expect(statistics.score).toBe(MAX_SCORE);
    expect(statistics.totalFullCompressions).toBe(30);
    expect(statistics.totalFullRebounds).toBe(30);
    expect(statistics.compressionsOnBpmRange).toBe(30);
    expect(statistics.averageBpm).toBeCloseTo(60000 / 545);
    expect(statistics.averageCompressionEndDepthMm).toBe(55);
  });

  it("treats exactly 100 bpm as in range", () => {
    const statistics = scoreSession(steadyRun(30, 600));

    expect(statistics.compressionsOnBpmRange).toBe(30);
    expect(statistics.averageBpm).toBeCloseTo(100);
    expect(statistics.score).toBe(MAX_SCORE);
  });

  it("treats exactly 120 bpm as in range", () => {
    const statistics = scoreSession(steadyRun(30, 500));

    expect(statistics.compressionsOnBpmRange).toBe(30);
    expect(statistics.averageBpm).toBeCloseTo(120);
    expect(statistics.score).toBe(MAX_SCORE);
  });

  it("takes a run just under 100 bpm out of range and off the maximum score", () => {
    const statistics = scoreSession(steadyRun(30, 601));

    expect(statistics.compressionsOnBpmRange).toBe(0);
    expect(statistics.score).toBeLessThan(MAX_SCORE);
  });

  it("accepts the depth band edges as full compressions and a flawless run", () => {
    expect(scoreSession(steadyRun(30, 545, CPR_TARGETS.depthMinMm)).score).toBe(MAX_SCORE);
    expect(scoreSession(steadyRun(30, 545, CPR_TARGETS.depthMaxMm)).score).toBe(MAX_SCORE);
  });

  it("marks a run just short of the minimum depth as no full compressions", () => {
    const statistics = scoreSession(steadyRun(30, 545, CPR_TARGETS.depthMinMm - 1));

    expect(statistics.totalFullCompressions).toBe(0);
    expect(statistics.score).toBeLessThan(MAX_SCORE);
  });

  it("keeps a run just past the maximum depth off the maximum score", () => {
    const statistics = scoreSession(steadyRun(30, 545, CPR_TARGETS.depthMaxMm + 1));

    expect(statistics.totalFullCompressions).toBe(30);
    expect(statistics.score).toBeLessThan(MAX_SCORE);
  });

  it("counts an incomplete release against the run", () => {
    const statistics = scoreSession(steadyRun(30, 545, 55, CPR_TARGETS.fullRecoilMaxDepthMm + 1));

    expect(statistics.totalFullRebounds).toBe(0);
    expect(statistics.score).toBeLessThan(MAX_SCORE);
  });

  it("never rounds an imperfect run up to the maximum score", () => {
    const nearlyPerfect = [...steadyRun(29, 545), compression(29 * 545, 49)];

    expect(scoreSession(nearlyPerfect).score).toBeLessThanOrEqual(999);
  });

  it("reports the average of the measured depths", () => {
    const statistics = scoreSession([
      compression(0, 50),
      compression(545, 60),
      compression(1090, 40),
    ]);

    expect(statistics.averageCompressionEndDepthMm).toBeCloseTo(50);
  });
});
