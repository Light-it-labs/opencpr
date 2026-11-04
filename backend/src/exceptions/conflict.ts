import { StatusCodes } from "@/config";

import { CustomError } from "./custom-error";

export type ConflictErrorParams =
  | {
      entity: string;
      key: string;
      value: string | number;
      message?: never;
    }
  | {
      message: string;
      entity?: never;
      key?: never;
      value?: never;
    };

export class ConflictError extends CustomError {
  constructor({ entity, key, message, value }: ConflictErrorParams) {
    super(
      message ??
        `Another ${entity} with the same ${key}: ${value}, already exists.`,
      StatusCodes.CONFLICT,
    );
  }
}
