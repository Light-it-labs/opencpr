import path from "path";
import { defineConfig } from "vitest/config";

const src = path.resolve(import.meta.dirname, "./src");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/models$/, replacement: path.join(src, "db/models") },
      { find: /^@\/(.*)$/, replacement: path.join(src, "$1") },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
