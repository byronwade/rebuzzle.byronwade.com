"use client";

import dynamic from "next/dynamic";
import type { BarChartProps } from "./BarChart.impl";

export type { BarChartProps };

export const BarChart = dynamic<BarChartProps>(
  () => import("./BarChart.impl").then((m) => m.BarChart),
  { ssr: false, loading: () => null }
);
