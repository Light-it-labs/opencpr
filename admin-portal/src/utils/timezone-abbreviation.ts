type GetTimezoneAbbreviationProps = {
  timezone: string;
};

export const getTimezoneAbbreviation = ({ timezone }: GetTimezoneAbbreviationProps) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(new Date());

  return parts.find((part) => {
    return part.type === "timeZoneName";
  })?.value;
};
