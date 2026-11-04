type FullNameParts = {
  firstName: string;
  lastName: string | null;
};

export const getFullName = ({ firstName, lastName }: FullNameParts) => {
  return [firstName, lastName].filter(Boolean).join(" ");
};
