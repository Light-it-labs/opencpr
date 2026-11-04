import { type NextFunction, type Response } from "express";

import { ForbiddenError } from "@/exceptions";
import { type UserRole } from "@/models";
import { type AuthenticatedRequest } from "@/types";

import { getUser } from "./auth-guard";

/** For routes behind authGuard(): only the listed roles may continue. */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const user = getUser(req);

      if (!roles.includes(user.role)) {
        throw new ForbiddenError("Your role does not allow this action.");
      }

      next();
    } catch (e) {
      next(e);
    }
  };
