const SQL_PREVIEW_LENGTH = 500;

/**
 * Drizzle wraps driver errors as `Failed query: <sql>\nparams: <values>`, and
 * the values are session ids, emails and search terms. The stack repeats the
 * message, so the cut stops at the first stack frame. The escaped form covers
 * text that was already serialized to JSON.
 */
const QUERY_PARAMS = /(?:\n|\\n)params:[\s\S]*?(?=(?:\n|\\n)\s+at |$)/;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** A claim link's id lets anyone holding it file runs under that registration. */
const CPR_SESSION_ID_SEGMENT = /(\/cpr-sessions\/)(?!:)[^/?#\s]+/g;

const truncate = (text: string) =>
  text.length > SQL_PREVIEW_LENGTH
    ? `${text.slice(0, SQL_PREVIEW_LENGTH)}…`
    : text;

const removeQueryParams = (text: string) => {
  const match = QUERY_PARAMS.exec(text);

  if (!match) return text;

  const rest = text.slice(match.index + match[0].length);

  return `${truncate(text.slice(0, match.index))}\nparams: [redacted]${rest}`;
};

export const redactText = (text: string) =>
  removeQueryParams(text).replace(EMAIL, "[email]");

/**
 * Only a query string right after a path is dropped, so SQL placeholders in a
 * span name ("where id = ?") survive.
 */
const PATH_QUERY = /(\/[^\s?#]*)[?#]\S*/g;

export const redactUrl = (url: string) =>
  url
    .replace(PATH_QUERY, "$1")
    .replace(CPR_SESSION_ID_SEGMENT, "$1:id")
    .replace(EMAIL, "[email]");
