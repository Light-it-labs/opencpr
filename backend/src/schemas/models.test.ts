import { describe, expect, it } from "vitest";

import { createCprSessionSchema } from "./models";

const compression = (timestampMs: number, endDepthMm = 55) => ({
  timestampMs,
  startDepthMm: 0,
  endDepthMm,
});

const kioskPayload = (overrides: Record<string, unknown> = {}) => ({
  publicId: "run-0001",
  registrationId: "registration-0001",
  locationId: "location-0001",
  kioskId: "kiosk-0001",
  buildId: "abc1234",
  compressions: [compression(0), compression(550), compression(1100)],
  ...overrides,
});

describe("createCprSessionSchema", () => {
  it("accepts what the kiosk sends, dropping the kiosk and location it names", () => {
    const {
      kioskId: _kioskId,
      locationId: _locationId,
      ...owned
    } = kioskPayload();

    expect(createCprSessionSchema.parse(kioskPayload())).toEqual(owned);
  });

  it("accepts a run without registration, kiosk or build", () => {
    const result = createCprSessionSchema.safeParse(
      kioskPayload({ registrationId: null, kioskId: null, buildId: undefined }),
    );

    expect(result.success).toBe(true);
  });

  it("drops fields the server owns instead of rejecting the run", () => {
    const parsed = createCprSessionSchema.parse(
      kioskPayload({
        id: 2147483647,
        participantId: "participant-0001",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: "2026-01-01T00:00:00.000Z",
        score: 100,
        totalCompressions: 999,
        totalFullCompressions: 999,
        totalFullRebounds: 999,
        compressionsOnBpmRange: 999,
        averageBpm: 110,
        averageCompressionEndDepthMm: 55,
        durationMs: 1,
      }),
    );

    expect(Object.keys(parsed).sort()).toEqual([
      "buildId",
      "compressions",
      "publicId",
      "registrationId",
    ]);
  });

  it("drops server-owned fields inside a compression", () => {
    const parsed = createCprSessionSchema.parse(
      kioskPayload({
        compressions: [{ ...compression(0), id: 1, cprSessionId: 1 }],
      }),
    );

    expect(parsed.compressions).toEqual([compression(0)]);
  });

  it("accepts 60 compressions and rejects 61", () => {
    const run = (count: number) =>
      kioskPayload({
        compressions: Array.from({ length: count }, (_, index) =>
          compression(index * 500),
        ),
      });

    expect(createCprSessionSchema.safeParse(run(60)).success).toBe(true);
    expect(createCprSessionSchema.safeParse(run(61)).success).toBe(false);
  });

  it.each([
    ["a negative depth", { ...compression(0), endDepthMm: -1 }],
    ["a depth over 200 mm", { ...compression(0), endDepthMm: 201 }],
    ["a start depth over 200 mm", { ...compression(0), startDepthMm: 201 }],
    ["a negative timestamp", compression(-1)],
    ["a timestamp past ten minutes", compression(10 * 60_000 + 1)],
    ["a null timestamp", { ...compression(0), timestampMs: null }],
  ])("rejects a compression with %s", (_, invalid) => {
    const result = createCprSessionSchema.safeParse(
      kioskPayload({ compressions: [invalid] }),
    );

    expect(result.success).toBe(false);
  });

  it.each(["timestampMs", "startDepthMm", "endDepthMm"])(
    "rejects a compression missing %s",
    (field) => {
      const { [field as keyof ReturnType<typeof compression>]: _, ...rest } =
        compression(0);

      expect(
        createCprSessionSchema.safeParse(kioskPayload({ compressions: [rest] }))
          .success,
      ).toBe(false);
    },
  );

  it("rejects an empty compression", () => {
    expect(
      createCprSessionSchema.safeParse(kioskPayload({ compressions: [{}] }))
        .success,
    ).toBe(false);
  });

  it("requires publicId", () => {
    expect(
      createCprSessionSchema.safeParse(kioskPayload({ publicId: undefined }))
        .success,
    ).toBe(false);
  });

  it("accepts a run from a newer kiosk that sends no kiosk or location", () => {
    expect(
      createCprSessionSchema.safeParse(
        kioskPayload({ kioskId: undefined, locationId: undefined }),
      ).success,
    ).toBe(true);
  });

  it("rejects ids longer than their columns", () => {
    expect(
      createCprSessionSchema.safeParse(
        kioskPayload({ publicId: "x".repeat(37) }),
      ).success,
    ).toBe(false);
  });
});
