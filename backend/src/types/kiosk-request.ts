import { Request } from "express";

export type AuthenticatedKiosk = {
  kioskId: string;
  locationId: string;
};

export type KioskRequest = Request & {
  kiosk?: AuthenticatedKiosk;
};
