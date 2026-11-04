type ErrorMessageProps = {
  errorMessage?: string;
};

export const ErrorMessage = ({ errorMessage }: ErrorMessageProps) => {
  if (!errorMessage) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{errorMessage}</p>;
};
