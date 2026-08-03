"use client";
// react-doctor-disable-file react-doctor/prefer-dynamic-import -- loaded only via next/dynamic parent wrapper

import { Bar, CartesianGrid, BarChart as RechartsBarChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface BarChartDataPoint {
  [key: string]: string | number;
}

export interface BarChartProps {
  title: string;
  description?: string;
  data: BarChartDataPoint[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  className?: string;
}

export function BarChart({
  title,
  description,
  data,
  dataKey,
  xAxisKey,
  color,
  className,
}: BarChartProps) {
  const chartConfig: ChartConfig = {
    [dataKey]: {
      label: title,
      color: color || "hsl(var(--chart-1))",
    },
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              angle={-45}
              dataKey={xAxisKey}
              height={80}
              textAnchor="end"
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={dataKey} fill={color || "hsl(var(--chart-1))"} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
