"use client";

import dynamic from "next/dynamic";
import type { AreaChartProps } from "./AreaChart.impl";

export type { AreaChartProps };

export const AreaChart = dynamic<AreaChartProps>(
  () => import("./AreaChart.impl").then((m) => m.AreaChart),
  { ssr: false, loading: () => null }
);
