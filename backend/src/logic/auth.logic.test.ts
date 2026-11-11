import { subMinutes, subSeconds } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AccessRequestsRepository,
  MagicLinksRepository,
  UsersRepository,
} from "@/repositories";
import { AuthEmailService } from "@/services";

import { AccessRequestsLogic } from "./admin/access-requests.logic";
import { AuthLogic } from "./auth.logic";

vi.mock("@/config", async () => ({
  env: { ADMIN_APP_URL: "https://admin.example.test" },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  StatusCodes: (
    await vi.importActual<typeof import("../config/status-codes")>(
      "../config/status-codes",
    )
  ).StatusCodes,
}));
vi.mock("../config/sentry", () => ({ Sentry: { captureException: vi.fn() } }));
vi.mock("@/repositories", () => ({
  AccessRequestsRepository: { record: vi.fn() },
  AuthSessionsRepository: {},
  MagicLinksRepository: { issue: vi.fn(), issuedSince: vi.fn() },
  PasskeysRepository: {},
  UsersRepository: { getByEmail: vi.fn() },
}));
vi.mock("@/services", () => ({
  AuthEmailService: { sendMagicLink: vi.fn() },
}));
vi.mock("./admin/access-requests.logic", () => ({
  AccessRequestsLogic: { notifyAdmins: vi.fn() },
}));

const NOW = new Date("2026-01-15T12:00:00.000Z");

const staffUser = {
  id: "user-0001",
  email: "staff@example.test",
  name: "Staff Member",
  role: "admin",
};

const givenRecentLinks = (total: number, latestAt: Date | null) =>
  vi.mocked(MagicLinksRepository.issuedSince).mockResolvedValue({
    total,
    latestAt,
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(UsersRepository.getByEmail).mockResolvedValue(
    staffUser as Awaited<ReturnType<typeof UsersRepository.getByEmail>>,
  );
  vi.mocked(MagicLinksRepository.issue).mockResolvedValue(undefined);
  vi.mocked(AuthEmailService.sendMagicLink).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("AuthLogic.requestMagicLink", () => {
  it("issues and sends a link when none went out recently", async () => {
    givenRecentLinks(0, null);

    await AuthLogic.requestMagicLink("  Staff@Example.test ");

    expect(UsersRepository.getByEmail).toHaveBeenCalledWith(
      "staff@example.test",
    );
    expect(MagicLinksRepository.issue).toHaveBeenCalledOnce();
    expect(AuthEmailService.sendMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({ to: staffUser.email }),
    );
  });

  it("checks the last hour of links for that user", async () => {
    givenRecentLinks(0, null);

    await AuthLogic.requestMagicLink(staffUser.email);

    expect(MagicLinksRepository.issuedSince).toHaveBeenCalledWith(
      staffUser.id,
      new Date("2026-01-15T11:00:00.000Z"),
    );
  });

  it("sends a new link once the last one is over a minute old", async () => {
    givenRecentLinks(1, subSeconds(NOW, 61));

    await AuthLogic.requestMagicLink(staffUser.email);

    expect(MagicLinksRepository.issue).toHaveBeenCalledOnce();
    expect(AuthEmailService.sendMagicLink).toHaveBeenCalledOnce();
  });

  it("neither issues nor sends within a minute of the last link", async () => {
    givenRecentLinks(1, subSeconds(NOW, 30));

    await expect(
      AuthLogic.requestMagicLink(staffUser.email),
    ).resolves.toBeUndefined();

    expect(MagicLinksRepository.issue).not.toHaveBeenCalled();
    expect(AuthEmailService.sendMagicLink).not.toHaveBeenCalled();
  });

  it("neither issues nor sends after five links in the hour", async () => {
    givenRecentLinks(5, subMinutes(NOW, 10));

    await expect(
      AuthLogic.requestMagicLink(staffUser.email),
    ).resolves.toBeUndefined();

    expect(MagicLinksRepository.issue).not.toHaveBeenCalled();
    expect(AuthEmailService.sendMagicLink).not.toHaveBeenCalled();
  });

  it("still files an access request for an unknown email", async () => {
    vi.mocked(UsersRepository.getByEmail).mockResolvedValue(undefined);
    vi.mocked(AccessRequestsRepository.record).mockResolvedValue({
      isNewlyPending: true,
    });

    await expect(
      AuthLogic.requestMagicLink("newcomer@example.test"),
    ).resolves.toBeUndefined();

    expect(AccessRequestsRepository.record).toHaveBeenCalledWith(
      "newcomer@example.test",
    );
    expect(AccessRequestsLogic.notifyAdmins).toHaveBeenCalledWith({
      email: "newcomer@example.test",
      requestedAt: NOW,
    });
    expect(MagicLinksRepository.issuedSince).not.toHaveBeenCalled();
    expect(MagicLinksRepository.issue).not.toHaveBeenCalled();
    expect(AuthEmailService.sendMagicLink).not.toHaveBeenCalled();
  });
});
