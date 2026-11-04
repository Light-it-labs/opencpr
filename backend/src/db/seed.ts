import "dotenv/config";

import { reset } from "drizzle-seed";

import { logger } from "@/config";

import { db } from "./db";
import * as schema from "./models";
import { seedLocations, seedUsers } from "./seeders";

export const seedDatabase = async () => {
  logger.debug("Resetting database...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type mismatch
  await reset(db as any, schema);

  try {
    logger.debug("Seeding database...");
    await seedLocations();
    await seedUsers();
    logger.debug("Database seeded successfully");

    process.exit(0);
  } catch (error) {
    logger.error({ error, detail: "Error seeding database" });
  }
};

void seedDatabase();
