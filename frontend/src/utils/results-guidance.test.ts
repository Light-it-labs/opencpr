import { describe, expect, it } from "vitest";

import { getImprovementTips, getResultsSummary, RESULTS_TONES } from "./results-guidance";
import { MAX_SCORE, type SessionStatistics } from "./session-scoring";

/** A flawless thirty, which every case below breaks in exactly one way. */
const statistics = (overrides: Partial<SessionStatistics> = {}): SessionStatistics => {
  return {
    score: MAX_SCORE,
    totalCompressions: 30,
    totalFullCompressions: 30,
    totalFullRebounds: 30,
    compressionsOnBpmRange: 30,
    averageBpm: 110,
    averageCompressionEndDepthMm: 55,
    ...overrides,
  };
};

const tipIds = (overrides: Partial<SessionStatistics>) => {
  return getImprovementTips(statistics(overrides)).map((tip) => {
    return tip.id;
  });
};

describe("getImprovementTips", () => {
  it("has nothing to say about a flawless run", () => {
    expect(getImprovementTips(statistics())).toEqual([]);
  });

  it("has nothing to say about an empty run", () => {
    expect(getImprovementTips(statistics({ totalCompressions: 0 }))).toEqual([]);
  });

  it("tells a slow run to speed up, under the rate card", () => {
    const [tip] = getImprovementTips(statistics({ averageBpm: 90, compressionsOnBpmRange: 5 }));

    expect(tip).toEqual({ id: "rateSlow", metric: "averageBpm", values: { min: 100, max: 120 } });
  });

  it("tells a fast run to ease off", () => {
    expect(tipIds({ averageBpm: 130, compressionsOnBpmRange: 5 })).toEqual(["rateFast"]);
  });

  it("calls a run unsteady when the average is fine but too few compressions were in range", () => {
    expect(tipIds({ compressionsOnBpmRange: 23 })).toEqual(["rateUnsteady"]);
  });

  it("accepts eight in ten compressions in range as steady", () => {
    expect(tipIds({ compressionsOnBpmRange: 24 })).toEqual([]);
  });

  it("flags a shallow average under the depth card", () => {
    const [tip] = getImprovementTips(
      statistics({ averageCompressionEndDepthMm: 45, totalFullCompressions: 10 }),
    );

    expect(tip).toEqual({
      id: "depthShallow",
      metric: "averageDepth",
      values: { minCm: 5, maxCm: 6 },
    });
  });

  it("flags a deep average", () => {
    expect(tipIds({ averageCompressionEndDepthMm: 65 })).toEqual(["depthDeep"]);
  });

  it("flags inconsistent depth under the full-compressions card when the average is fine", () => {
    const [tip] = getImprovementTips(statistics({ totalFullCompressions: 26 }));

    expect(tip.id).toBe("depthInconsistent");
    expect(tip.metric).toBe("fullCompressions");
  });

  it("lets nine in ten full compressions pass", () => {
    expect(tipIds({ totalFullCompressions: 27 })).toEqual([]);
  });

  it("flags recoil under the rebounds card once more than one in ten was incomplete", () => {
    expect(getImprovementTips(statistics({ totalFullRebounds: 26 }))).toEqual([
      { id: "recoil", metric: "fullRebounds", values: {} },
    ]);
    expect(tipIds({ totalFullRebounds: 27 })).toEqual([]);
  });

  it("puts the shallow-depth tip before a rate miss of the same size", () => {
    expect(
      tipIds({
        averageBpm: 80,
        compressionsOnBpmRange: 0,
        averageCompressionEndDepthMm: 40,
        totalFullCompressions: 0,
      }),
    ).toEqual(["depthShallow", "rateSlow"]);
  });

  it("gives at most one tip per card", () => {
    const tips = getImprovementTips(
      statistics({
        averageBpm: 80,
        compressionsOnBpmRange: 0,
        averageCompressionEndDepthMm: 40,
        totalFullCompressions: 0,
        totalFullRebounds: 0,
      }),
    );
    const metrics = tips.map((tip) => {
      return tip.metric;
    });

    expect(new Set(metrics).size).toBe(metrics.length);
    expect(tips).toHaveLength(3);
  });
});

describe("getResultsSummary", () => {
  it("has no summary for an empty run", () => {
    expect(getResultsSummary(statistics({ totalCompressions: 0 }))).toBeNull();
  });

  it("praises a run with nothing flagged", () => {
    expect(getResultsSummary(statistics())).toEqual({
      id: "excellent",
      isPraise: true,
      tone: RESULTS_TONES.HIGH,
    });
  });

  it("withholds praise from a top score that still earned a tip", () => {
    expect(getResultsSummary(statistics({ totalFullRebounds: 20 }))).toEqual({
      id: "good",
      isPraise: false,
      tone: RESULTS_TONES.MID,
    });
  });

  it("bands an imperfect run by its percentage", () => {
    const withTip = { totalFullRebounds: 20 };

    expect(getResultsSummary(statistics({ ...withTip, score: 700 }))?.id).toBe("good");
    expect(getResultsSummary(statistics({ ...withTip, score: 699 }))?.id).toBe("fair");
    expect(getResultsSummary(statistics({ ...withTip, score: 500 }))?.id).toBe("fair");
    expect(getResultsSummary(statistics({ ...withTip, score: 499 }))).toEqual({
      id: "keepPracticing",
      isPraise: false,
      tone: RESULTS_TONES.LOW,
    });
  });
});
