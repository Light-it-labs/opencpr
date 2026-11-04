import { StatusCodes } from "@/config";

import { CustomError } from "./custom-error";

export class UnauthorizedError extends CustomError {
  constructor(message?: string) {
    super(
      message ??
        "Unauthorized access, either token is malformed or non existent. Please login or contact support.",
      StatusCodes.UNAUTHORIZED,
    );
  }
}
