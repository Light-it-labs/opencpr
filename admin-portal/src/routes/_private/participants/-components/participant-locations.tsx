import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import type { Participant } from "@/services/participants";

const VISIBLE_LOCATIONS = 2;

type ParticipantLocationsProps = {
  locations: Participant["locations"];
};

export const ParticipantLocations = ({ locations }: ParticipantLocationsProps) => {
  if (locations.length === 0) {
    return "—";
  }

  const visibleLocations = locations.slice(0, VISIBLE_LOCATIONS);
  const hiddenLocations = locations.slice(VISIBLE_LOCATIONS);

  return (
    <div className="flex items-center gap-2">
      <span>
        {visibleLocations
          .map((location) => {
            return location.name;
          })
          .join(", ")}
      </span>

      {hiddenLocations.length > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge size="xs" tabIndex={0} variant="secondary">
              +{hiddenLocations.length}
            </Badge>
          </Tooltip.Trigger>

          <Tooltip.Content>
            {hiddenLocations
              .map((location) => {
                return location.name;
              })
              .join(", ")}
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
};
