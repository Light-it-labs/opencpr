import "dotenv/config";

import { defineConfig } from "drizzle-kit";

import { env } from "@/config";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/models/*",
  dialect: "mysql",
  casing: "snake_case",
  dbCredentials: {
    database: env.MYSQL_DATABASE,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
  },
});
