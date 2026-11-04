import { drizzle } from "drizzle-orm/mysql2";

import { env } from "@/config";

import * as schema from "./models";

export const db = drizzle({
  connection: {
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    database: env.MYSQL_DATABASE,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
  },
  casing: "snake_case",
  schema,
  mode: "default",
});

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The pool or an open transaction, for repository calls that sometimes have
 * to join a caller's transaction and otherwise run on their own.
 */
export type DbExecutor = typeof db | Transaction;
