import { api } from "@/config/axios";
import { accessRequestResponseSchema, accessRequestsResponseSchema } from "./schemas";
import type { AccessRequest, ApproveAccessRequestRequest } from "./types";

export const getAccessRequests = async (): Promise<AccessRequest[]> => {
  const response = await api.get("admin/access-requests");

  return accessRequestsResponseSchema.parse(response.data).data;
};

export const approveAccessRequest = async ({
  id,
  payload,
}: ApproveAccessRequestRequest): Promise<AccessRequest> => {
  const response = await api.post(`admin/access-requests/${id}/approve`, payload);

  return accessRequestResponseSchema.parse(response.data).data;
};

export const rejectAccessRequest = async (id: string): Promise<AccessRequest> => {
  const response = await api.post(`admin/access-requests/${id}/reject`);

  return accessRequestResponseSchema.parse(response.data).data;
};
