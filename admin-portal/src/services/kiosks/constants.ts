import { TIME } from "@/constants/time";

export const KIOSKS_REFETCH_INTERVAL = 30 * TIME.SECOND;

export const SERIAL_STATUS = {
  IDLE: "idle",
  OPENING: "opening",
  READING: "reading",
  NO_SIGNAL: "no-signal",
  SENSOR_FAULT: "sensor-fault",
  DISCONNECTED: "disconnected",
  ERROR: "error",
} as const;

export const SERIAL_STATUS_LABEL: Readonly<Record<string, string>> = {
  [SERIAL_STATUS.IDLE]: "Idle",
  [SERIAL_STATUS.OPENING]: "Opening",
  [SERIAL_STATUS.READING]: "Reading",
  [SERIAL_STATUS.NO_SIGNAL]: "No signal",
  [SERIAL_STATUS.SENSOR_FAULT]: "Sensor fault",
  [SERIAL_STATUS.DISCONNECTED]: "Disconnected",
  [SERIAL_STATUS.ERROR]: "Error",
};

export const SERIAL_FAULT_STATUSES: readonly string[] = [
  SERIAL_STATUS.NO_SIGNAL,
  SERIAL_STATUS.SENSOR_FAULT,
  SERIAL_STATUS.DISCONNECTED,
  SERIAL_STATUS.ERROR,
];

export const KIOSK_STATUS_FILTER = {
  ALL: "all",
  ONLINE: "online",
  OFFLINE: "offline",
} as const;

export type KioskStatusFilterOption =
  (typeof KIOSK_STATUS_FILTER)[keyof typeof KIOSK_STATUS_FILTER];

export type KioskStatusFilter = Exclude<KioskStatusFilterOption, typeof KIOSK_STATUS_FILTER.ALL>;

export const KIOSK_STATUS_FILTER_LABEL: Readonly<Record<KioskStatusFilterOption, string>> = {
  [KIOSK_STATUS_FILTER.ALL]: "All statuses",
  [KIOSK_STATUS_FILTER.ONLINE]: "Online",
  [KIOSK_STATUS_FILTER.OFFLINE]: "Offline",
};

export const KIOSK_SENSOR_FILTER = {
  ALL: "all",
  READING: "reading",
  ATTENTION: "attention",
} as const;

export type KioskSensorFilterOption =
  (typeof KIOSK_SENSOR_FILTER)[keyof typeof KIOSK_SENSOR_FILTER];

export type KioskSensorFilter = Exclude<KioskSensorFilterOption, typeof KIOSK_SENSOR_FILTER.ALL>;

export const KIOSK_SENSOR_FILTER_LABEL: Readonly<Record<KioskSensorFilterOption, string>> = {
  [KIOSK_SENSOR_FILTER.ALL]: "All sensors",
  [KIOSK_SENSOR_FILTER.READING]: "Reading",
  [KIOSK_SENSOR_FILTER.ATTENTION]: "Stale or fault",
};
