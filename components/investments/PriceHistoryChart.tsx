"use client";

import { useMemo } from "react";
import { Decimal } from "@/lib/decimal";
import { priceHistory } from "@/lib/investmentCharts";
import type { Investment } from "@/lib/investments";
import { formatDay } from "@/lib/vault";
import StepLineChart from "./StepLineChart";
import { unitPrice } from "./format";

/** Every price you've recorded for one investment, in its own currency. */
export default function PriceHistoryChart({ investment }: { investment: Investment }) {
  const points = useMemo(() => priceHistory(investment), [investment]);
  const format = (n: number) => unitPrice(Decimal.of(n.toFixed(6)), investment.currency);
  const sourceLabel = { purchase: "Price at a purchase", sale: "Price at a sale", update: "Price update" } as const;

  return (
    <StepLineChart
      dates={points.map((p) => p.date)}
      series={[{ id: "price", label: "Price per unit", values: points.map((p) => p.price.toNumber()), style: "solid" }]}
      formatValue={format}
      formatAxis={format}
      summary={
        points.length
          ? `Price per unit of ${investment.name} from ${formatDay(points[0].date)} to ${formatDay(points.at(-1)!.date)}.`
          : `Price history for ${investment.name}.`
      }
      pointNote={(i) => sourceLabel[points[i].source]}
      emptyMessage="Your price history appears once you've recorded prices on at least two different dates."
    />
  );
}
