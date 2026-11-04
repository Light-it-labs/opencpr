import { tv } from "tailwind-variants";

import { ChartCard } from "@/components/charts/chart-card";
import { Table } from "@/components/ui/table";
import type { PerformanceStats } from "@/services/stats";
import { formatScore } from "@/utils/score";
import { ShareBar } from "./share-bar";

const funnelVariants = tv({
  slots: {
    root: "flex flex-col gap-6",
    list: "flex flex-col gap-3",
    item: "flex flex-col gap-1",
    itemHeader: "flex items-baseline justify-between gap-2 text-sm",
    itemLabel: "text-text-default-secondary",
    itemValue: "font-semibold text-text-default-default tabular-nums",
    metric: "text-text-default-secondary",
  },
});

const { item, itemHeader, itemLabel, itemValue, list, metric, root } = funnelVariants();

const formatDepth = (depthMm: number | null) => {
  return depthMm === null ? "—" : `${depthMm.toFixed(1)} mm`;
};

type FunnelCardProps = {
  funnel: PerformanceStats["funnel"];
  isRefreshing?: boolean;
};

export const FunnelCard = ({ funnel, isRefreshing }: FunnelCardProps) => {
  const steps = [
    { label: "Registrations", value: funnel.registrations },
    { label: "Sessions with a participant", value: funnel.claimedSessions },
    { label: "Participants", value: funnel.participants },
  ];

  const widest = Math.max(
    ...steps.map((step) => {
      return step.value;
    }),
  );

  return (
    <ChartCard
      description="From registrations to sessions claimed by a participant; unclaimed sessions are anonymous"
      isRefreshing={isRefreshing}
      title="Registration funnel"
    >
      <div className={root()}>
        <ol className={list()}>
          {steps.map((step) => {
            return (
              <li key={step.label} className={item()}>
                <div className={itemHeader()}>
                  <span className={itemLabel()}>{step.label}</span>

                  <span className={itemValue()}>{step.value.toLocaleString("en-US")}</span>
                </div>

                <ShareBar
                  label={step.label}
                  segments={[{ label: step.label, tone: "brand", value: step.value }]}
                  total={widest}
                />
              </li>
            );
          })}
        </ol>

        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>
                <span className="sr-only">Metric</span>
              </Table.Head>

              <Table.Head>Claimed ({funnel.claimedSessions})</Table.Head>

              <Table.Head>Unclaimed ({funnel.unclaimedSessions})</Table.Head>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            <Table.Row>
              <Table.Cell className={metric()}>Average score</Table.Cell>

              <Table.Cell>{formatScore(funnel.claimedAverageScore)}</Table.Cell>

              <Table.Cell>{formatScore(funnel.unclaimedAverageScore)}</Table.Cell>
            </Table.Row>

            <Table.Row>
              <Table.Cell className={metric()}>Average depth</Table.Cell>

              <Table.Cell>{formatDepth(funnel.claimedAverageDepthMm)}</Table.Cell>

              <Table.Cell>{formatDepth(funnel.unclaimedAverageDepthMm)}</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>
    </ChartCard>
  );
};
