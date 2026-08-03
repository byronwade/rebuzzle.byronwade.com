"use client";

import dynamic from "next/dynamic";

export const AreaChart = dynamic(
  () => import("./AreaChart.impl").then((m) => m.AreaChart),
  { ssr: false, loading: () => null }
);
