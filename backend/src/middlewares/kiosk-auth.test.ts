import type { Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/exceptions";
import { KiosksRepository } from "@/repositories";
import { KioskRequest } from "@/types";
import { hashToken } from "@/utils";

import { kioskAuth } from "./kiosk-auth";

vi.mock("@/config", async () => ({
  StatusCodes: (
    await vi.importActual<typeof import("../config/status-codes")>(
      "../config/status-codes",
    )
  ).StatusCodes,
}));
vi.mock("@/repositories", () => ({
  KiosksRepository: { getByTokenHash: vi.fn() },
}));

type StoredKiosk = Awaited<ReturnType<typeof KiosksRepository.getByTokenHash>>;

const TOKEN = "test-token-0001";

const requestWith = (authorization?: string) =>
  ({
    header: (name: string) =>
      name === "Authorization" ? authorization : undefined,
  }) as KioskRequest;

const authenticate = async (req: KioskRequest) => {
  const next = vi.fn();

  await kioskAuth()(req, {} as Response, next);

  return next;
};

afterEach(() => {
  vi.resetAllMocks();
});

describe("kioskAuth", () => {
  it("rejects a request without a bearer token", async () => {
    const next = await authenticate(requestWith());

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(KiosksRepository.getByTokenHash).not.toHaveBeenCalled();
  });

  it("rejects a header that is not a bearer token", async () => {
    const next = await authenticate(requestWith(`Basic ${TOKEN}`));

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("rejects a token no kiosk holds", async () => {
    vi.mocked(KiosksRepository.getByTokenHash).mockResolvedValue(undefined);

    const req = requestWith(`Bearer ${TOKEN}`);
    const next = await authenticate(req);

    expect(KiosksRepository.getByTokenHash).toHaveBeenCalledWith(
      hashToken(TOKEN),
    );
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(req.kiosk).toBeUndefined();
  });

  it("attaches the kiosk that holds the token", async () => {
    vi.mocked(KiosksRepository.getByTokenHash).mockResolvedValue({
      kioskId: "kiosk-0001",
      locationId: "location-0001",
    } as StoredKiosk);

    const req = requestWith(`Bearer ${TOKEN}`);
    const next = await authenticate(req);

    expect(next).toHaveBeenCalledWith();
    expect(req.kiosk).toEqual({
      kioskId: "kiosk-0001",
      locationId: "location-0001",
    });
  });
});
