import { StatusCodes } from "@/config";

import { CustomError } from "./custom-error";

export class ForbiddenError extends CustomError {
  constructor(message?: string) {
    super(
      message ?? "Forbidden access. Please contact support",
      StatusCodes.FORBIDDEN,
    );
  }
}
