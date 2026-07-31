"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRangePreset = "7d" | "30d" | "90d" | "1y" | "all";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
  onPresetChange: (preset: DateRangePreset) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  onPresetChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets: { label: string; value: DateRangePreset }[] = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
    { label: "Last year", value: "1y" },
    { label: "All time", value: "all" },
  ];

  const handlePresetClick = (preset: DateRangePreset) => {
    const end = new Date();
    let start: Date | null = null;

    switch (preset) {
      case "7d":
        start = new Date();
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start = new Date();
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start = new Date();
        start.setDate(start.getDate() - 90);
        break;
      case "1y":
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "all":
        start = null;
        break;
    }

    onDateChange(start, end);
    onPresetChange(preset);
    setIsOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1.5">
        {presets.map((preset) => (
          <Button
            className="text-xs"
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            size="sm"
            variant="outline"
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !startDate && "text-muted-foreground"
            )}
            size="sm"
            variant="outline"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate && endDate ? (
              <>
                {format(startDate, "LLL dd, y")} - {format(endDate, "LLL dd, y")}
              </>
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            initialFocus
            mode="range"
            numberOfMonths={2}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateChange(range.from, range.to);
                setIsOpen(false);
              } else if (range?.from) {
                onDateChange(range.from, null);
              } else {
                onDateChange(null, null);
              }
            }}
            selected={
              startDate && endDate
                ? { from: startDate, to: endDate }
                : startDate
                  ? { from: startDate, to: startDate }
                  : undefined
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
