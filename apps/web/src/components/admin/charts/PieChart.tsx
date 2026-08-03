"use client";

import dynamic from "next/dynamic";
import type { PieChartProps } from "./PieChart.impl";

export type { PieChartProps };

export const PieChart = dynamic<PieChartProps>(
  () => import("./PieChart.impl").then((m) => m.PieChart),
  { ssr: false, loading: () => null }
);
