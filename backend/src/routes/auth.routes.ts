import { Router } from "express";

import { AuthController, PasskeysController } from "@/controllers";
import { authGuard, perMinuteRateLimit, tryCatchWrapper } from "@/middlewares";

export const AuthRouter = Router();

AuthRouter.post(
  "/magic-link",
  perMinuteRateLimit(5),
  tryCatchWrapper(AuthController.requestMagicLink),
);
AuthRouter.post(
  "/magic-link/verify",
  perMinuteRateLimit(10),
  tryCatchWrapper(AuthController.verifyMagicLink),
);
AuthRouter.get("/me", authGuard(), tryCatchWrapper(AuthController.me));
AuthRouter.post("/logout", tryCatchWrapper(AuthController.logout));

AuthRouter.post(
  "/passkeys/login/options",
  perMinuteRateLimit(6),
  tryCatchWrapper(PasskeysController.loginOptions),
);
AuthRouter.post(
  "/passkeys/login/verify",
  perMinuteRateLimit(6),
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
