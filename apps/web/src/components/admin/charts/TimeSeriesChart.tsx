"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface TimeSeriesDataPoint {
  date: string;
  count: number;
  [key: string]: string | number;
}

interface TimeSeriesChartProps {
  title: string;
  description?: string;
  data: TimeSeriesDataPoint[];
  dataKey?: string;
  color?: string;
  className?: string;
}

const chartConfig: ChartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
};

export function TimeSeriesChart({
  title,
  description,
  data,
  dataKey = "count",
  color,
  className,
}: TimeSeriesChartProps) {
  const config: ChartConfig = color
    ? {
        [dataKey]: {
          label: title,
          color,
        },
      }
    : chartConfig;

  const formattedData = data.map((point) => ({
    ...point,
    formattedDate: format(new Date(point.date), "MMM dd"),
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              angle={-45}
              dataKey="formattedDate"
              height={60}
              textAnchor="end"
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(value) => {
                const point = formattedData.find((d) => d.formattedDate === value);
                return point ? format(new Date(point.date), "MMM dd, yyyy") : value;
              }}
            />
            <Line
              activeDot={{ r: 6 }}
              dataKey={dataKey}
              dot={{ r: 4 }}
              stroke={color || "hsl(var(--chart-1))"}
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
