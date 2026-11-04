export const USER_STATUS_FILTER = {
  ALL: "all",
  ACTIVE: "active",
  REVOKED: "revoked",
} as const;

export type UserStatusFilterOption = (typeof USER_STATUS_FILTER)[keyof typeof USER_STATUS_FILTER];

export type UserStatusFilter = Exclude<UserStatusFilterOption, typeof USER_STATUS_FILTER.ALL>;

export const USER_STATUS_FILTER_LABEL: Readonly<Record<UserStatusFilterOption, string>> = {
  [USER_STATUS_FILTER.ALL]: "All statuses",
  [USER_STATUS_FILTER.ACTIVE]: "Active",
  [USER_STATUS_FILTER.REVOKED]: "Revoked",
};

export const USER_ROLES = {
  admin: "admin",
  viewer: "viewer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  [USER_ROLES.admin]: "Admin",
  [USER_ROLES.viewer]: "Viewer",
};
