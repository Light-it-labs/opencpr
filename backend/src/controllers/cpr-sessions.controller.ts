import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { CprSessionsLogic } from "@/logic";
import {
  claimSessionSchema,
  createCprSessionSchema,
  idParamSchema,
  publicIdParamSchema,
} from "@/schemas";

export const CprSessionsController = {
  get: async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const data = await CprSessionsLogic.get(id);
    res.status(StatusCodes.OK).json({ data });
  },

  getClaim: async (req: Request, res: Response) => {
    const { publicId } = publicIdParamSchema.parse(req.params);

    const data = await CprSessionsLogic.getClaim(publicId);
    res.status(StatusCodes.OK).json({ data });
  },

  claim: async (req: Request, res: Response) => {
    const { publicId } = publicIdParamSchema.parse(req.params);
    const validatedData = claimSessionSchema.parse(req.body);

    const data = await CprSessionsLogic.claim(publicId, validatedData);
    res.status(StatusCodes.CREATED).json({ data });
  },

  create: async (req: Request, res: Response) => {
    const validatedData = createCprSessionSchema.parse(req.body);

    const data = await CprSessionsLogic.create(validatedData);
    res.status(StatusCodes.CREATED).json({ data });
  },
};
