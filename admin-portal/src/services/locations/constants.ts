export const LOCATION_UTC_TIMEZONE = "UTC";

export const LOCATION_DEFAULTS = {
  COUNTRY: "",
  CITY: "",
  TIMEZONE: LOCATION_UTC_TIMEZONE,
} as const;

export const LOCATION_TIMEZONES = [
  LOCATION_UTC_TIMEZONE,
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Santiago",
  "Europe/London",
  "Europe/Madrid",
] as const;
