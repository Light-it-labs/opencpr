import { describe, expect, it } from "vitest";

import { SERIAL_COMMANDS, serialFrameSchema } from "./cpr-protocol";

const parseLine = (line: string) => {
  return serialFrameSchema.safeParse(JSON.parse(line));
};

describe("serialFrameSchema", () => {
  it("parses a compression frame", () => {
    const result = parseLine(
      '{"type":"compression","timestampMs":1200,"startDepthMm":2,"endDepthMm":54.5}',
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      type: "compression",
      timestampMs: 1200,
      startDepthMm: 2,
      endDepthMm: 54.5,
    });
  });

  it("parses a heartbeat with or without a live depth", () => {
    expect(parseLine('{"type":"heartbeat","sensorOk":true,"depthMm":3}').data).toEqual({
      type: "heartbeat",
      sensorOk: true,
      depthMm: 3,
    });
    expect(parseLine('{"type":"heartbeat","sensorOk":false}').data).toEqual({
      type: "heartbeat",
      sensorOk: false,
    });
  });

  it("parses a ready frame from an older board without the optional fields", () => {
    expect(parseLine('{"type":"ready","baselineMm":12}').data).toEqual({
      type: "ready",
      baselineMm: 12,
    });
  });

  it("parses a ready frame carrying the board id and the baseline verdict", () => {
    const result = parseLine(
      '{"type":"ready","baselineMm":12,"baselineOk":false,"deviceId":"booth-7"}',
    );

    expect(result.data).toEqual({
      type: "ready",
      baselineMm: 12,
      baselineOk: false,
      deviceId: "booth-7",
    });
  });

  it("parses an error frame with a known code and one without any code", () => {
    expect(
      parseLine('{"type":"error","code":"calibration","message":"baseline refused"}').data,
    ).toEqual({ type: "error", code: "calibration", message: "baseline refused" });
    expect(parseLine('{"type":"error","message":"ranging failed"}').data).toEqual({
      type: "error",
      message: "ranging failed",
    });
  });

  it("rejects a frame with an unknown type", () => {
    expect(parseLine('{"type":"status","ok":true}').success).toBe(false);
  });

  it("rejects a compression frame missing a measurement", () => {
    expect(parseLine('{"type":"compression","timestampMs":1200,"startDepthMm":2}').success).toBe(
      false,
    );
  });

  it("rejects a negative timestamp", () => {
    expect(
      parseLine('{"type":"compression","timestampMs":-1,"startDepthMm":0,"endDepthMm":50}').success,
    ).toBe(false);
  });

  it("rejects a depth that is not a number", () => {
    expect(
      serialFrameSchema.safeParse({
        type: "compression",
        timestampMs: 1,
        startDepthMm: 0,
        endDepthMm: Number.NaN,
      }).success,
    ).toBe(false);
    expect(
      parseLine('{"type":"compression","timestampMs":1,"startDepthMm":0,"endDepthMm":"50"}')
        .success,
    ).toBe(false);
  });

  it("rejects a line that is not a JSON object", () => {
    expect(serialFrameSchema.safeParse("compression 1 2 3").success).toBe(false);
    expect(serialFrameSchema.safeParse(null).success).toBe(false);
  });

  it("rejects a board id longer than a uuid", () => {
    expect(
      serialFrameSchema.safeParse({ type: "ready", baselineMm: 1, deviceId: "x".repeat(37) })
        .success,
    ).toBe(false);
  });

  it("rejects an error frame whose code is not one the kiosk knows", () => {
    expect(parseLine('{"type":"error","code":"overheat","message":"too hot"}').success).toBe(false);
  });

  it("throws on a line that is not JSON at all, leaving the caller to drop it", () => {
    expect(() => {
      return parseLine("{not json");
    }).toThrow();
  });
});

describe("SERIAL_COMMANDS", () => {
  it("are single characters the board can read byte by byte", () => {
    Object.values(SERIAL_COMMANDS).forEach((command) => {
      expect(command).toHaveLength(1);
    });
    expect(SERIAL_COMMANDS.resetSession).not.toBe(SERIAL_COMMANDS.recalibrate);
  });
});
