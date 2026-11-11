import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { logger } from "@/config";
import { BaseController } from "@/controllers";
import {
  errorHandler,
  generalRateLimit,
  httpLogger,
  kioskRateLimit,
} from "@/middlewares";

import { env } from "./config";
import { registerJobsShutdown } from "./jobs";
import ApiRouter from "./routes/routes";

const app = express();

// A reverse proxy (nginx) is one hop in front of the deployed API. Without this every per-IP
// limit counts the proxy's address, so all staff would share the 5 magic links
// a minute. Local runs have no proxy, where trusting a header would let a
// caller spoof its address.
if (env.APP_ENV !== "local") {
  app.set("trust proxy", 1);
}

// Kiosks call from any booth origin without credentials. Only the admin origin
// may send the session cookie, so SameSite=Lax is not the only line of defense:
// a page on any other origin cannot make a credentialed read either.
const ADMIN_ORIGIN = new URL(env.ADMIN_APP_URL).origin;

app.use(
  cors((req, callback) => {
    callback(null, {
      origin: true,
      credentials: req.header("Origin") === ADMIN_ORIGIN,
      // The CSV export names its file in this header; browsers hide it otherwise.
      exposedHeaders: ["Content-Disposition"],
    });
  }),
);
app.use(helmet());

app.use(cookieParser());
// A full run is about 2 kB, so the 100 kB default is needless room for abuse.
app.use(express.json({ limit: "16kb" }));

app.use(httpLogger);
app.use(kioskRateLimit);
app.use(generalRateLimit);
app.use("/api", ApiRouter);

app.use(errorHandler);

export const initServer = () => {
  registerJobsShutdown();

  app.listen(env.APP_PORT, () => {
    logger.info(
      `Server started on:  ${env.APP_ENV === "local" ? `http://localhost:${env.APP_PORT}` : env.APP_PORT}`,
    );
  });
};

app.get("/", BaseController.getRoot);
app.get("/health", BaseController.getHealth);

// Deliberate failure, so an operator can confirm reports are arriving in Sentry
// rather than assuming. Withheld in production.
if (env.APP_ENV !== "production") {
  app.get("/debug-sentry", () => {
    throw new Error("Sentry verification error - this is intentional");
  });
}
