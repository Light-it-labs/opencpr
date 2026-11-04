import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { analyzer } from "vite-bundle-analyzer";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  return {
    build: {
      sourcemap: "hidden",
    },
    plugins: [
      tanstackRouter({
        autoCodeSplitting: true,
      }),
      viteReact(),
      tailwindcss(),
      ...(process.env.VITE_APP_ENV === "local" ? [analyzer()] : []),
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,

        // Auth tokens can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,

        sourcemaps: {
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
    ],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  };
});
