import { Request } from "express";

import { UserRole } from "@/models";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  /** Null reads every location: admins, and viewers with no locations set. */
  locationIds: string[] | null;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
