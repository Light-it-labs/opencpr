import { StatusCodes } from "@/config";

import { CustomError } from "./custom-error";

export type NotFoundErrorParams = {
  entity: string;
  key?: string;
  value: string | number;
};

export class NotFoundError extends CustomError {
  constructor({ entity, key = "id", value }: NotFoundErrorParams) {
    super(`No ${entity} found with ${key}: ${value}.`, StatusCodes.NOT_FOUND);
  }
}
