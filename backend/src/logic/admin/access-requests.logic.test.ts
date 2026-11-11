import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/config";
import { AccessRequestsRepository, UsersRepository } from "@/repositories";
import { EmailService } from "@/services";

import { AccessRequestsLogic } from "./access-requests.logic";

vi.mock("@/config", async () => ({
  env: { ADMIN_APP_URL: "https://admin.example.test/" },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  StatusCodes: (
    await vi.importActual<typeof import("../../config/status-codes")>(
      "../../config/status-codes",
    )
  ).StatusCodes,
}));
vi.mock("../../config/sentry", () => ({
  Sentry: { captureException: vi.fn() },
}));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("@/logic", () => ({ AuthLogic: {} }));
vi.mock("./users.logic", () => ({ UsersLogic: {} }));
vi.mock("@/repositories", () => ({
  AccessRequestsRepository: { countCreatedSince: vi.fn() },
  UsersRepository: { listActiveByRole: vi.fn() },
}));
vi.mock("@/services", () => ({
  EmailService: { sendAccessRequestNotice: vi.fn() },
}));

const requestedAt = new Date("2026-01-15T12:00:00.000Z");
const notice = { email: "newcomer@example.test", requestedAt };

const admins = [
  { id: "user-0001", email: "admin-one@example.test", name: "Admin One" },
  { id: "user-0002", email: "admin-two@example.test", name: "Admin Two" },
];

beforeEach(() => {
  vi.mocked(UsersRepository.listActiveByRole).mockResolvedValue(admins);
  vi.mocked(EmailService.sendAccessRequestNotice).mockResolvedValue(true);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("AccessRequestsLogic.notifyAdmins", () => {
  it("emails every active admin while under the hourly cap", async () => {
    vi.mocked(AccessRequestsRepository.countCreatedSince).mockResolvedValue(10);

    await AccessRequestsLogic.notifyAdmins(notice);

    expect(AccessRequestsRepository.countCreatedSince).toHaveBeenCalledWith(
      new Date("2026-01-15T11:00:00.000Z"),
    );
    expect(EmailService.sendAccessRequestNotice).toHaveBeenCalledTimes(2);
    expect(EmailService.sendAccessRequestNotice).toHaveBeenCalledWith({
      to: "admin-one@example.test",
      requesterEmail: notice.email,
      requestedAt: requestedAt.toISOString(),
      url: "https://admin.example.test/users",
    });
  });

  it("skips the notice once more than ten requests came in the last hour", async () => {
    vi.mocked(AccessRequestsRepository.countCreatedSince).mockResolvedValue(11);

    await AccessRequestsLogic.notifyAdmins(notice);

    expect(UsersRepository.listActiveByRole).not.toHaveBeenCalled();
    expect(EmailService.sendAccessRequestNotice).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith({
      action: "access_request_notice_skipped_over_cap",
      filedLastHour: 11,
    });
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(
      notice.email,
    );
  });
});
