/** MySQL ER_DUP_ENTRY: a unique key already holds the value. */
const DUPLICATE_ENTRY_ERRNO = 1062;

const hasDuplicateErrno = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "errno" in error &&
  error.errno === DUPLICATE_ENTRY_ERRNO;

/** Drizzle wraps driver errors in a DrizzleQueryError, keeping the original as `cause`. */
export const isDuplicateEntry = (error: unknown) =>
  hasDuplicateErrno(error) ||
  (error instanceof Error && hasDuplicateErrno(error.cause));
