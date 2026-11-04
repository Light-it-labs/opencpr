const parseValue = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const redirectTarget = (redirect: string | undefined) => {
  if (!redirect) {
    return { to: "/" };
  }

  const target = new URL(redirect, window.location.origin);

  return {
    to: target.pathname,
    search: Object.fromEntries(
      [...target.searchParams].map(([key, value]) => {
        return [key, parseValue(value)];
      }),
    ),
  };
};
