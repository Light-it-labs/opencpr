import { type Request, type Response } from "express";
import type morgan from "morgan";
import { describe, expect, it, vi } from "vitest";

import { httpLoggerFormat } from "./http-logger";

vi.mock("@/config/env", () => ({ env: { APP_ENV: "production" } }));

const tokensFor = (url: string) =>
  ({
    method: () => "GET",
    url: () => url,
    status: () => "200",
    res: () => "42",
    "response-time": () => "3.1",
  }) as unknown as morgan.TokenIndexer<Request, Response>;

const format = (url: string) =>
  httpLoggerFormat(tokensFor(url), {} as Request, {} as Response);

describe("httpLoggerFormat", () => {
  it("logs the path without its query string", () => {
    expect(format("/api/admin/participants?search=person%40example.test")).toBe(
      "GET /api/admin/participants 200 42 - 3.1 ms",
    );
  });

  it("hides the registration id of a claim link", () => {
    expect(format("/api/cpr-sessions/reg-0001/claim")).toBe(
      "GET /api/cpr-sessions/:id/claim 200 42 - 3.1 ms",
    );
  });
});
