import { api } from "@/config/axios";
import { portalUserResponseSchema, portalUsersResponseSchema } from "./schemas";
import type { InviteUserPayload, PortalUser, UpdateUserRequest } from "./types";

export const getUsers = async (): Promise<PortalUser[]> => {
  const response = await api.get("admin/users");

  return portalUsersResponseSchema.parse(response.data).data;
};

export const inviteUser = async (payload: InviteUserPayload): Promise<PortalUser> => {
  const response = await api.post("admin/users", payload);

  return portalUserResponseSchema.parse(response.data).data;
};

export const updateUser = async ({ id, payload }: UpdateUserRequest): Promise<PortalUser> => {
  const response = await api.patch(`admin/users/${id}`, payload);

  return portalUserResponseSchema.parse(response.data).data;
};

export const revokeUser = async (id: string) => {
  await api.delete(`admin/users/${id}`);
};
