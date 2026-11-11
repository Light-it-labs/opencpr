import { redactText } from "@/utils";

type SmtpTags = {
  smtp_code?: string;
  smtp_response_code?: number;
  smtp_command?: string;
};

const readField = (error: unknown, key: string): unknown =>
  typeof error === "object" && error !== null && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined;

const readString = (error: unknown, key: string) => {
  const value = readField(error, key);

  return typeof value === "string" ? redactText(value) : undefined;
};

const readNumber = (error: unknown, key: string) => {
  const value = readField(error, key);

  return typeof value === "number" ? value : undefined;
};

// Nodemailer quotes the recipient's address in the message and in `response`.
export const toReportableEmailError = (error: unknown) => {
  const source = error instanceof Error ? error : new Error(String(error));
  const reportable = new Error(redactText(source.message));
  reportable.name = source.name;
  reportable.stack = source.stack && redactText(source.stack);

  const tags: SmtpTags = {
    smtp_code: readString(error, "code"),
    smtp_response_code: readNumber(error, "responseCode"),
    smtp_command: readString(error, "command"),
  };

  return {
    error: reportable,
    tags: Object.fromEntries(
      Object.entries(tags).filter(([, value]) => value !== undefined),
    ) as SmtpTags,
  };
};
