const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

// Drizzle error messages end each failed query with `params: <values>`.
const QUERY_PARAMS = /(\n|\\n)params:[^\n"\\]*/g;

export const redact = (text: string) =>
  text.replace(QUERY_PARAMS, "$1params: [redacted]").replace(EMAIL, "[email]");
