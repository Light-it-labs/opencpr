import { StatusCodes } from "@/config";

import { CustomError } from "./custom-error";

export class UnprocessableEntityError extends CustomError {
  constructor(message: string, code?: string) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, code);
  }
}
