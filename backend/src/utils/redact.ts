const SQL_PREVIEW_LENGTH = 500;

// Drizzle errors end in `params: <values>` and the stack repeats them, so the cut stops at the first frame.
const QUERY_PARAMS = /(?:\n|\\n)params:[\s\S]*?(?=(?:\n|\\n)\s+at |$)/;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

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

// Needs a path before the "?" so SQL placeholders in span names ("where id = ?") survive.
const PATH_QUERY = /(\/[^\s?#]*)[?#]\S*/g;

export const redactUrl = (url: string) =>
  url
    .replace(PATH_QUERY, "$1")
    .replace(CPR_SESSION_ID_SEGMENT, "$1:id")
    .replace(EMAIL, "[email]");
