import { api } from "@/config/axios";
import { locationResponseSchema, locationsResponseSchema } from "./schemas";
import type { Location, LocationPayload, UpdateLocationRequest } from "./types";

export const getAdminLocations = async (): Promise<Location[]> => {
  const response = await api.get("admin/locations");

  return locationsResponseSchema.parse(response.data).data;
};

export const createLocation = async (payload: LocationPayload): Promise<Location> => {
  const response = await api.post("admin/locations", payload);

  return locationResponseSchema.parse(response.data).data;
};

export const updateLocation = async ({ id, payload }: UpdateLocationRequest): Promise<Location> => {
  const response = await api.patch(`admin/locations/${id}`, payload);

  return locationResponseSchema.parse(response.data).data;
};

export const deleteLocation = async (id: string) => {
  await api.delete(`admin/locations/${id}`);
};
