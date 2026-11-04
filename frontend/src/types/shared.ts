export type ErrorReading = {
  error: string;
};

export type MessageReading = {
  message: string;
};

export type Option<T extends number | string> = {
  value: T;
  label: string;
};
