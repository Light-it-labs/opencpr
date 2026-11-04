import { StatusCodes } from "@/config";

import { CustomError } from "./custom-error";

export class BadRequestError extends CustomError {
  constructor(message?: string) {
    super(
      message ?? "Something went wrong. Please try again.",
      StatusCodes.BAD_REQUEST,
    );
  }
}
