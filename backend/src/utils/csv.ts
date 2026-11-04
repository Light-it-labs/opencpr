export type CsvValue = string | number | null | undefined;

// Excel assumes a legacy code page for a bare .csv and garbles accents; the
// byte order mark tells it the file is UTF-8.
const UTF8_BOM = "﻿";

// Spreadsheets evaluate a cell that starts with one of these as a formula, so a
// participant-typed name like `=HYPERLINK(...)` would run when the file is opened.
// A leading apostrophe makes the cell plain text; the quoting below does not.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

const neutralizeFormula = (text: string) =>
  FORMULA_PREFIX.test(text) ? `'${text}` : text;

/** RFC 4180: quote a field holding a quote, comma or line break; double inner quotes. */
const escapeCsvField = (value: CsvValue) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text =
    typeof value === "string" ? neutralizeFormula(value) : String(value);

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (headers: string[], rows: CsvValue[][]) => {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvField).join(","),
  );

  return `${UTF8_BOM}${lines.join("\r\n")}\r\n`;
};
