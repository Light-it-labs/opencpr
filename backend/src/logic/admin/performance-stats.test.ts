import { describe, expect, it } from "vitest";

import {
  aggregatePerformance,
  PerformanceSession,
  pickTopSessions,
} from "./performance-stats";

const session = (
  id: number,
  overrides: Partial<PerformanceSession> = {},
): PerformanceSession => ({
  id,
  participantId: null,
  registrationId: null,
  locationId: "location-0001",
  createdAt: new Date(Date.UTC(2026, 10, 1, 12, 0, id)),
  score: 50,
  averageCompressionEndDepthMm: 55,
  averageBpm: 110,
  totalCompressions: 30,
  totalFullCompressions: 30,
  totalFullRebounds: 30,
  compressionsOnBpmRange: 30,
  durationMs: 16_000,
  location: { name: "Test venue", timezone: "UTC" },
  ...overrides,
});

describe("pickTopSessions", () => {
  it("keeps each participant's best run, best first", () => {
    const top = pickTopSessions([
      session(1, { participantId: "participant-a", score: 40 }),
      session(2, { participantId: "participant-a", score: 90 }),
      session(3, { participantId: "participant-b", score: 70 }),
      session(4, { registrationId: "registration-c", score: 100 }),
    ]);

    expect(top.map(({ id }) => id)).toEqual([2, 3]);
  });
});

describe("aggregatePerformance", () => {
  it("counts a person with two runs, by participant or by registration, as a repeater", () => {
    const stats = aggregatePerformance({
      participantNames: [],
      range: {},
      sessions: [
        session(1, { participantId: "participant-a", score: 40 }),
        session(2, { participantId: "participant-a", score: 80 }),
        session(3, { registrationId: "registration-b" }),
        session(4, { registrationId: "registration-b" }),
        session(5),
      ],
    });

    expect(stats.totals.sessions).toBe(5);
    expect(stats.totals.repeaters).toBe(2);
  });

  it("groups many runs under one registration in linear time", () => {
    const sessions = Array.from({ length: 100_000 }, (_, index) =>
      session(index + 1, { registrationId: "registration-flood" }),
    );

    const startedAt = performance.now();
    const stats = aggregatePerformance({
      participantNames: [],
      range: {},
      sessions,
    });

    expect(stats.totals.repeaters).toBe(1);
    expect(performance.now() - startedAt).toBeLessThan(2_000);
  });
});
