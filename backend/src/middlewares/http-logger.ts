import { type Request, type Response } from "express";
import morgan from "morgan";

import { logger } from "@/config";
import { redactUrl } from "@/utils";

export const write = (message: string) => logger.info(message);

export const httpLoggerFormat: morgan.FormatFn<Request, Response> = (
  info,
  req,
  res,
) =>
  [
    info.method?.(req, res),
    redactUrl(info.url?.(req, res) ?? ""),
    info.status?.(req, res),
    info.res?.(req, res, "content-length"),
    "-",
    info["response-time"]?.(req, res),
    "ms",
  ].join(" ");

export const httpLogger = morgan(httpLoggerFormat, { stream: { write } });
