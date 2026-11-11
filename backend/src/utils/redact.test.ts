import { describe, expect, it } from "vitest";

import { redactText, redactUrl } from "./redact";

const SESSION_ID = "c0ffee00-session-0001";

const failedQuery = `Failed query: select \`id\` from \`auth_sessions\` where \`id\` = ? and \`email\` = ?\nparams: ${SESSION_ID},person@example.test`;

describe("redactText", () => {
  it("drops the params of a failed query and keeps the SQL", () => {
    const redacted = redactText(failedQuery);

    expect(redacted).toContain("from `auth_sessions` where `id` = ?");
    expect(redacted).toContain("params: [redacted]");
    expect(redacted).not.toContain(SESSION_ID);
    expect(redacted).not.toContain("person@example.test");
  });

  it("keeps the stack frames after the params", () => {
    const stack = `DrizzleQueryError: ${failedQuery}\n    at Query.run (query.js:1:1)\n    at next (router.js:2:2)`;

    const redacted = redactText(stack);

    expect(redacted).not.toContain(SESSION_ID);
    expect(redacted).toContain("    at Query.run (query.js:1:1)");
    expect(redacted).toContain("    at next (router.js:2:2)");
  });

  it("drops params from text already serialized to JSON", () => {
    const redacted = redactText(JSON.stringify({ error: failedQuery }));

    expect(redacted).not.toContain(SESSION_ID);
    expect(redacted).not.toContain("person@example.test");
  });

  it("truncates a long query", () => {
    const longQuery = `Failed query: select ${"x, ".repeat(400)}\nparams: ${SESSION_ID}`;

    expect(redactText(longQuery).length).toBeLessThan(600);
  });

  it("replaces email addresses anywhere", () => {
    expect(
      redactText(
        "550 5.1.1 <first.last+tag@mail.example.test>: Recipient address rejected",
      ),
    ).toBe("550 5.1.1 <[email]>: Recipient address rejected");
  });

  it("leaves other text alone", () => {
    expect(
      redactText("Connection lost: The server closed the connection."),
    ).toBe("Connection lost: The server closed the connection.");
  });
});

describe("redactUrl", () => {
  it("hides the registration id of a claim link", () => {
    expect(redactUrl("/api/cpr-sessions/reg-0001/claim")).toBe(
      "/api/cpr-sessions/:id/claim",
    );
  });

  it("hides the public id of a run", () => {
    expect(
      redactUrl("https://api.example.test/api/cpr-sessions/run-0001"),
    ).toBe("https://api.example.test/api/cpr-sessions/:id");
  });

  it("drops the query string", () => {
    expect(
      redactUrl("/api/admin/participants?search=person%40example.test&page=2"),
    ).toBe("/api/admin/participants");
  });

  it("keeps route patterns and the run list path", () => {
    expect(redactUrl("GET /api/cpr-sessions/:publicId/claim")).toBe(
      "GET /api/cpr-sessions/:publicId/claim",
    );
    expect(redactUrl("POST /api/cpr-sessions")).toBe("POST /api/cpr-sessions");
  });

  it("keeps SQL placeholders in span names", () => {
    expect(redactUrl("select * from users where id = ?")).toBe(
      "select * from users where id = ?",
    );
  });
});
