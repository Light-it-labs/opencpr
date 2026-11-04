import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    mutationMeta: {
      skipErrorToast?: boolean;
    };
  }
}
