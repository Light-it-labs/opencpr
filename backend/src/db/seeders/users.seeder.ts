import { inArray } from "drizzle-orm";

import { env, logger } from "@/config";

import { db } from "../db";
import { USER_ROLES, users } from "../models";

const SEED_USER_EMAILS = [env.BOOTSTRAP_ADMIN_EMAIL];

/** Emails already present are skipped, so this is safe to run repeatedly. */
export const seedUsers = async () => {
  try {
    logger.info("Seeding users...");

    const emails = SEED_USER_EMAILS;

    // Revoked rows count as existing: seeding must never quietly restore
    // someone who was removed.
    const existing = emails.length
      ? await db
          .select({ email: users.email })
          .from(users)
          .where(inArray(users.email, emails))
      : [];
    const known = new Set(existing.map(({ email }) => email));
    const missing = emails.filter((email) => !known.has(email));

    if (missing.length) {
      // Seeded accounts are the people who run the portal, so they are admins.
      await db
        .insert(users)
        .values(missing.map((email) => ({ email, role: USER_ROLES.admin })));
    }

    const created = missing.length;

    logger.info(
      `Successfully seeded ${created} users (${emails.length - created} already existed)`,
    );
  } catch (error) {
    logger.error({ detail: "Error seeding users", error });
    throw error;
  }
};
