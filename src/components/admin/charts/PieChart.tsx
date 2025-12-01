"use client";

import { Cell, Pie, PieChart as RechartsPieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface PieChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieChartProps {
  title: string;
  description?: string;
  data: PieChartDataPoint[];
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function PieChart({
  title,
  description,
  data,
  dataKey = "value",
  nameKey = "name",
  colors = DEFAULT_COLORS,
  className,
}: PieChartProps) {
  const chartConfig: ChartConfig = data.reduce((acc, item, index) => {
    acc[item[nameKey] as string] = {
      label: item[nameKey] as string,
      color: colors[index % colors.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <RechartsPieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey={dataKey}
              label
              nameKey={nameKey}
              outerRadius={100}
            >
              {data.map((entry, index) => (
                <Cell
                  fill={colors[index % colors.length]}
                  key={`cell-${index}`}
                />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </RechartsPieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

