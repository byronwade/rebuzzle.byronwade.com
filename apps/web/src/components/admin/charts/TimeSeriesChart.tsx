"use client";

import dynamic from "next/dynamic";
import type { TimeSeriesChartProps } from "./TimeSeriesChart.impl";

export type { TimeSeriesChartProps };

export const TimeSeriesChart = dynamic<TimeSeriesChartProps>(
  () => import("./TimeSeriesChart.impl").then((m) => m.TimeSeriesChart),
  { ssr: false, loading: () => null }
);
