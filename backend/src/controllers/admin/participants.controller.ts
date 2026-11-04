import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { ParticipantsLogic } from "@/logic/admin";
import { getUser } from "@/middlewares";
import {
  exportAdminParticipantsQuerySchema,
  listAdminParticipantsQuerySchema,
  uuidParamSchema,
} from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const ParticipantsController = {
  list: async (req: AuthenticatedRequest, res: Response) => {
    const query = listAdminParticipantsQuerySchema.parse(req.query);

    const result = await ParticipantsLogic.list(getUser(req), query);
    res.status(StatusCodes.OK).json(result);
  },

  exportCsv: async (req: Request, res: Response) => {
    const filters = exportAdminParticipantsQuerySchema.parse(req.query);

    const { csv, filename } = await ParticipantsLogic.exportCsv(filters);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(StatusCodes.OK).send(csv);
  },

  remove: async (req: Request, res: Response) => {
    const { id } = uuidParamSchema.parse(req.params);

    await ParticipantsLogic.remove(id);
    res.status(StatusCodes.NO_CONTENT).send();
  },
};
