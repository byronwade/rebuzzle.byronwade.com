"use client";

import dynamic from "next/dynamic";

export const TimeSeriesChart = dynamic(
  () => import("./TimeSeriesChart.impl").then((m) => m.TimeSeriesChart),
  { ssr: false, loading: () => null }
);
