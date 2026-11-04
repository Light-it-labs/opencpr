import { logger } from "@/config";

import { db } from "../db";
import { locations } from "../models";

export const seedLocations = async () => {
  try {
    logger.info("Seeding locations...");

    const locationsData = [
      {
        name: "Example location",
        country: "Example country",
        city: "Example city",
        address: "123 Main St",
        timezone: "UTC",
        startDate: new Date("2026-01-01"),
      },
    ];

    await db.insert(locations).values(locationsData);

    const seededLocations = await db.query.locations.findMany({
      orderBy: (locations, { desc }) => [desc(locations.createdAt)],
      limit: locationsData.length,
    });

    logger.info(`Successfully seeded ${seededLocations.length} locations`);
    return seededLocations;
  } catch (error) {
    logger.error({ detail: "Error seeding locations", error });
    throw error;
  }
};
