import { format, formatDistance, parseISO } from "date-fns";

import { Tooltip } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/use-now";

type RelativeTimeProps = {
  date: string;
};

export const RelativeTime = ({ date }: RelativeTimeProps) => {
  const now = useNow();
  const parsedDate = parseISO(date);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <time dateTime={date} tabIndex={0}>
          {formatDistance(parsedDate, now, { addSuffix: true })}
        </time>
      </Tooltip.Trigger>

      <Tooltip.Content>{format(parsedDate, "PPpp")}</Tooltip.Content>
    </Tooltip.Root>
  );
};
