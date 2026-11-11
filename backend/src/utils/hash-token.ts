import { createHash } from "node:crypto";

/** Only this digest is stored, so a database leak yields no usable secrets. */
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
