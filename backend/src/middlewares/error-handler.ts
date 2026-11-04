import { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { logger, StatusCodes } from "@/config";
import { CustomError } from "@/exceptions";
import { type Error } from "@/types";

const GENERIC_SERVER_ERROR = "Something went wrong";

export const errorHandler = (
  e: Error | ZodError | CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let code = 500;
  let error = e.message;
  let errorCode: string | undefined;
  logger.warn({ detail: "Request failed", error: e });

  if (e instanceof ZodError) {
    code = StatusCodes.BAD_REQUEST;
    error = "Validation error. Please check the 'fields' property.";
    return res.status(code).send({ error, fields: e.issues });
  }

  if (e instanceof CustomError) {
    code = e.statusCode;
    errorCode = e.code;
  } else {
    code = StatusCodes.SERVER_ERROR;
    error = GENERIC_SERVER_ERROR;
  }

  return res
    .status(code)
    .send({ error, ...(errorCode && { code: errorCode }) });
};
