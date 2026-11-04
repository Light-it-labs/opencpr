import { differenceInMilliseconds } from "date-fns";
import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { AuthLogic } from "@/logic";
import { getUser } from "@/middlewares";
import { magicLinkRequestSchema, magicLinkVerifySchema } from "@/schemas";
import { CookieService } from "@/services";
import { AuthenticatedRequest } from "@/types";

export const AuthController = {
  requestMagicLink: async (req: Request, res: Response) => {
    const { email } = magicLinkRequestSchema.parse(req.body);

    await AuthLogic.requestMagicLink(email);
    // Same answer whether or not the email belongs to a user.
    res.status(StatusCodes.ACCEPTED).json({
      data: {
        message:
          "If an account exists for that email, a login link has been sent.",
      },
    });
  },

  verifyMagicLink: async (req: Request, res: Response) => {
    const { token } = magicLinkVerifySchema.parse(req.body);

    const { expiresAt, sessionId, user } =
      await AuthLogic.consumeMagicLink(token);

    CookieService.set(
      res,
      sessionId,
      differenceInMilliseconds(expiresAt, new Date()),
    );
    res.status(StatusCodes.OK).json({ data: user });
  },

  me: async (req: AuthenticatedRequest, res: Response) => {
    const data = await AuthLogic.me(getUser(req));
    res.status(StatusCodes.OK).json({ data });
  },

  logout: async (req: Request, res: Response) => {
    await AuthLogic.logout(CookieService.get(req));
    CookieService.clear(res);
    res.status(StatusCodes.NO_CONTENT).send();
  },
};
