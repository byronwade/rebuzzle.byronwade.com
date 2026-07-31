"use client";

import { ArrowDown, ArrowUp, Info, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
  formatValue?: (value: string | number) => string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  description,
  trend,
  icon,
  className,
  formatValue,
}: MetricCardProps) {
  const trendValue = trend?.value ?? 0;
  const isPositive = trendValue > 0;
  const isNegative = trendValue < 0;
  const isNeutral = trendValue === 0;

  const formattedValue = formatValue
    ? formatValue(value)
    : typeof value === "number"
      ? value.toLocaleString()
      : value;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border transition-all hover:shadow-md",
        "bg-gradient-to-br from-card to-card/50",
        className
      )}
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="font-medium text-muted-foreground text-sm">{title}</div>
            {description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {icon && (
            <div className="rounded-lg bg-muted/50 p-2 text-muted-foreground/60">{icon}</div>
          )}
        </div>
        <div className="space-y-1">
          <div className="font-semibold text-3xl tracking-tight">{formattedValue}</div>
          {subtitle && <div className="font-medium text-muted-foreground text-xs">{subtitle}</div>}
          {trend && (
            <div
              className={cn(
                "mt-2 flex items-center gap-1 font-medium text-xs",
                isPositive &&
                  "w-fit rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                isNegative &&
                  "w-fit rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                isNeutral && "text-muted-foreground"
              )}
            >
              {isPositive && <ArrowUp className="h-3 w-3" />}
              {isNegative && <ArrowDown className="h-3 w-3" />}
              {isNeutral && <Minus className="h-3 w-3" />}
              <span>
                {Math.abs(trendValue).toFixed(1)}%{trend.label && ` ${trend.label}`}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Decorative gradient line */}
      <div className="absolute right-0 bottom-0 left-0 h-1 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
    </Card>
  );
}
