"use client";

import dynamic from "next/dynamic";

export const PieChart = dynamic(
  () => import("./PieChart.impl").then((m) => m.PieChart),
  { ssr: false, loading: () => null }
);
