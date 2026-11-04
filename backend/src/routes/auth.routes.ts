import { milliseconds } from "date-fns";
import { Router } from "express";
import rateLimit from "express-rate-limit";

import { AuthController, PasskeysController } from "@/controllers";
import { authGuard, tryCatchWrapper } from "@/middlewares";

export const AuthRouter = Router();

// On top of the global limit: these endpoints are unauthenticated and either
// send email or are guessing targets, so each gets its own, tighter, budget.
const perMinute = (max: number) =>
  rateLimit({
    windowMs: milliseconds({ minutes: 1 }),
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests from this IP, please try again after a minute",
    },
  });

AuthRouter.post(
  "/magic-link",
  perMinute(5),
  tryCatchWrapper(AuthController.requestMagicLink),
);
AuthRouter.post(
  "/magic-link/verify",
  perMinute(10),
  tryCatchWrapper(AuthController.verifyMagicLink),
);
AuthRouter.get("/me", authGuard(), tryCatchWrapper(AuthController.me));
AuthRouter.post("/logout", tryCatchWrapper(AuthController.logout));

AuthRouter.post(
  "/passkeys/login/options",
  perMinute(6),
  tryCatchWrapper(PasskeysController.loginOptions),
);
AuthRouter.post(
  "/passkeys/login/verify",
  perMinute(6),
  tryCatchWrapper(PasskeysController.loginVerify),
);
AuthRouter.post(
  "/passkeys/register/options",
  authGuard(),
  tryCatchWrapper(PasskeysController.registrationOptions),
);
AuthRouter.post(
  "/passkeys/register/verify",
  authGuard(),
  tryCatchWrapper(PasskeysController.register),
);
AuthRouter.get(
  "/passkeys",
  authGuard(),
  tryCatchWrapper(PasskeysController.list),
);
AuthRouter.delete(
  "/passkeys/:id",
  authGuard(),
  tryCatchWrapper(PasskeysController.remove),
);
