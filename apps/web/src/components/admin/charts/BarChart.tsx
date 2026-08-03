"use client";

import dynamic from "next/dynamic";

export const BarChart = dynamic(
  () => import("./BarChart.impl").then((m) => m.BarChart),
  { ssr: false, loading: () => null }
);
