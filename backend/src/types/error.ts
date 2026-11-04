import { type StatusCodes } from "@/config";

export type Error = {
  message: string;
  type: StatusCodes | undefined;
  name: string;
};
