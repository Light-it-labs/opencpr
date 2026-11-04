import * as util from "util";
import type winston from "winston";
import { createLogger, format, transports, type Logform } from "winston";

import { env } from ".";

export const getColor = (infoLevel: string): string => {
  if (env.APP_ENV === "production") return "";

  switch (infoLevel) {
    case "error":
      return "\u001b[1;31m";
    case "warn":
      return "\u001b[1;33m";
    case "info":
      return "\u001b[1;36m";
    default:
      return "\x1b[30m";
  }
};

const serializeErrors = (_key: string, value: unknown) =>
  value instanceof Error
    ? { name: value.name, message: value.message, stack: value.stack }
    : value;

const formatMessage = (info: Logform.TransformableInfo) => {
  if (
    typeof info.message === "object" &&
    info.message &&
    "error" in info.message &&
    "detail" in info.message
  )
    return util.format({
      error: info.message?.error as Error,
      detail: info.message?.detail,
    });

  if (
    typeof info.original === "object" &&
    info?.original &&
    "message" in info.original
  )
    return JSON.stringify(info.original.message, serializeErrors, 4);

  return JSON.stringify(info.message, serializeErrors, 4);
};

export const getMessage = (info: Logform.TransformableInfo) => {
  const message = formatMessage(info);

  return typeof info.stack === "string" ? `${message}\n${info.stack}` : message;
};

const hasColor = env.APP_ENV !== "production";

export const consoleLoggerFormat = format.combine(
  format.timestamp({
    format: "HH:mm:ss.SSS",
  }),
  format.printf(
    (info: Logform.TransformableInfo) =>
      `${hasColor ? "\x1b[7m" : ""}${info.timestamp} ${
        hasColor ? getColor(info.level) : ""
      } [${info.level?.toUpperCase()}] ${hasColor ? "\x1b[0m" : ""} ${getMessage(info)}${info.splat ?? ""}`,
  ),
);

export const logger: winston.Logger = createLogger({
  format: format.errors({ stack: true }),
  transports: [
    new transports.Console({
      format: consoleLoggerFormat,
    }),
  ],
});
