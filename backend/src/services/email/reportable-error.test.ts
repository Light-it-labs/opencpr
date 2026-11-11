import { describe, expect, it } from "vitest";

import { toReportableEmailError } from "./reportable-error";

const smtpRejection = () =>
  Object.assign(
    new Error(
      "Can't send mail - all recipients were rejected: 550 5.1.1 <person@example.test>: Recipient address rejected",
    ),
    {
      code: "EENVELOPE",
      responseCode: 550,
      command: "RCPT TO",
      response: "550 5.1.1 <person@example.test>: Recipient address rejected",
    },
  );

describe("toReportableEmailError", () => {
  it("redacts the recipient from the message and the stack", () => {
    const { error } = toReportableEmailError(smtpRejection());

    expect(error.message).toBe(
      "Can't send mail - all recipients were rejected: 550 5.1.1 <[email]>: Recipient address rejected",
    );
    expect(error.stack).not.toContain("person@example.test");
    expect(error).not.toHaveProperty("response");
  });

  it("keeps the SMTP codes as tags", () => {
    expect(toReportableEmailError(smtpRejection()).tags).toEqual({
      smtp_code: "EENVELOPE",
      smtp_response_code: 550,
      smtp_command: "RCPT TO",
    });
  });

  it("handles a thrown value that is not an error", () => {
    const { error, tags } = toReportableEmailError("person@example.test");

    expect(error.message).toBe("[email]");
    expect(tags).toEqual({});
  });
});
