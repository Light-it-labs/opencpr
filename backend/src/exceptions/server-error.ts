import { StatusCodes } from "@/config";

import { CustomError } from "./custom-error";

export class ServerError extends CustomError {
  constructor(message?: string) {
    super(
      message ??
        "Something went wrong. Please try again or contact support if issue persists.",
      StatusCodes.SERVER_ERROR,
    );
  }
}
