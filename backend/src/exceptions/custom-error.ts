export class CustomError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    /** Stable machine-readable reason, for clients that branch on it. */
    public code?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
  }
}
