import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import vitePluginSvgr from "vite-plugin-svgr";

/**
 * Identifies this build. Written into the bundle and, by the plugin below, to
 * dist/version.json — the kiosk polls that file and compares, so a sealed booth
 * can pick up a deploy without anyone reaching the machine.
 */
const resolveBuildId = () => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    // A clone has git to ask; a tarball deploy does not.
    return String(Date.now());
  }
};

const BUILD_ID = resolveBuildId();

export default defineConfig(({ mode }) => {
  // Empty prefix so non-VITE_ build-time secrets are readable here. This does
  // not expose them to the client: that is controlled by envPrefix, which
  // still defaults to VITE_.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  return {
    plugins: [
      tanstackRouter(),
      viteReact(),
      tailwindcss(),
      vitePluginSvgr(),
      {
        name: "emit-version-json",
        apply: "build",
        closeBundle: () => {
          writeFileSync("./dist/version.json", JSON.stringify({ buildId: BUILD_ID }));
        },
      },
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,

        // Auth tokens can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,

        sourcemaps: {
          // "hidden" only removes the sourceMappingURL comment; the .map files
          // are still emitted into the directory the server publishes, and their
          // names are guessable from the bundle. Delete them once Sentry has
          // them, or the full source is fetchable by anyone.
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
    ],
    define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
    build: {
      // The Sentry plugin has nothing to upload unless these are produced, which
      // is why stack traces were arriving minified. `hidden` emits the maps but
      // omits the comment linking them, so they are not exposed to the browser.
      sourcemap: "hidden",
    },
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  };
});
