import { describe, expect, it, vi } from "vitest";

import { getMessage } from "./logger";

vi.mock("@/config/env", () => ({ env: { APP_ENV: "production" } }));

const SESSION_ID = "c0ffee00-session-0001";
const FAILED_QUERY = `Failed query: select * from \`auth_sessions\` where \`id\` = ?\nparams: ${SESSION_ID},person@example.test`;

describe("getMessage", () => {
  it("redacts an error logged with a detail", () => {
    const message = getMessage({
      level: "warn",
      message: { detail: "Request failed", error: new Error(FAILED_QUERY) },
    });

    expect(message).toContain("Request failed");
    expect(message).toContain("auth_sessions");
    expect(message).not.toContain(SESSION_ID);
    expect(message).not.toContain("person@example.test");
  });

  it("redacts an error message logged as a string field", () => {
    const message = getMessage({
      level: "error",
      message: { action: "magic_link_send_failed", error: FAILED_QUERY },
    });

    expect(message).toContain("magic_link_send_failed");
    expect(message).not.toContain(SESSION_ID);
  });

  it("redacts the stack of an error logged on its own", () => {
    const error = new Error(FAILED_QUERY);
    const message = getMessage({
      level: "error",
      message: error.message,
      stack: error.stack,
    });

    expect(message).not.toContain(SESSION_ID);
    expect(message).not.toContain("person@example.test");
    expect(message).toContain("logger.test.ts");
  });
});
