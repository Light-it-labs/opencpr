export const ACCESS_REQUEST_STATUSES = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type AccessRequestStatus =
  (typeof ACCESS_REQUEST_STATUSES)[keyof typeof ACCESS_REQUEST_STATUSES];
