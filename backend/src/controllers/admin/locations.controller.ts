import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { LocationsLogic } from "@/logic";
import { scopeLocationIds } from "@/logic/admin";
import { getUser } from "@/middlewares";
import {
  createLocationSchema,
  listLocationsQuerySchema,
  updateLocationSchema,
  uuidParamSchema,
} from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const LocationsController = {
  list: async (req: AuthenticatedRequest, res: Response) => {
    const { includeDisabled } = listLocationsQuerySchema.parse(req.query);

    const data = await LocationsLogic.listForAdmin(
      includeDisabled,
      scopeLocationIds(getUser(req)),
    );
    res.status(StatusCodes.OK).json({ data });
  },

  create: async (req: Request, res: Response) => {
    const validatedData = createLocationSchema.parse(req.body);

    const data = await LocationsLogic.create(validatedData);
    res.status(StatusCodes.CREATED).json({ data });
  },

  update: async (req: Request, res: Response) => {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedData = updateLocationSchema.parse(req.body);

    const data = await LocationsLogic.update(id, validatedData);
    res.status(StatusCodes.OK).json({ data });
  },

  remove: async (req: Request, res: Response) => {
    const { id } = uuidParamSchema.parse(req.params);

    await LocationsLogic.disable(id);
    res.status(StatusCodes.NO_CONTENT).send();
  },
};
