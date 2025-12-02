"use client";

import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { YearArchiveStats } from "@/app/actions/blogActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TimelineArchiveProps {
  archiveData: YearArchiveStats[];
  currentYear?: number;
  currentMonth?: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PUZZLE_TYPE_COLORS: Record<string, string> = {
  rebus: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "logic-grid": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "cryptic-crossword": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "number-sequence": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "pattern-recognition": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "caesar-cipher": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  trivia: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
};

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  rebus: "Rebus",
  "logic-grid": "Logic",
  "cryptic-crossword": "Cryptic",
  "number-sequence": "Sequence",
  "pattern-recognition": "Pattern",
  "caesar-cipher": "Cipher",
  trivia: "Trivia",
};

export function TimelineArchive({ archiveData, currentYear, currentMonth }: TimelineArchiveProps) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    const current = new Date().getFullYear();
    return new Set([current]);
  });

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  if (archiveData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Calendar className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No archive data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Blog posts will appear here as they're published
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {archiveData.map((yearData) => {
        const isExpanded = expandedYears.has(yearData.year);
        const isCurrentYear = yearData.year === currentYear;

        return (
          <div key={yearData.year} className="relative">
            {/* Year header */}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between h-auto py-3 px-4",
                isCurrentYear && "bg-primary/5"
              )}
              onClick={() => toggleYear(yearData.year)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
                <span className="font-semibold text-lg">{yearData.year}</span>
                {isCurrentYear && (
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {yearData.totalPosts} {yearData.totalPosts === 1 ? "post" : "posts"}
              </span>
            </Button>

            {/* Months */}
            {isExpanded && (
              <div className="ml-4 mt-1 border-l-2 border-muted pl-4 space-y-1">
                {yearData.months.map((monthData) => {
                  const isCurrentMonth = isCurrentYear && monthData.month === currentMonth;
                  const topTypes = Object.entries(monthData.puzzleTypes)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3);

                  return (
                    <Link
                      key={monthData.month}
                      href={`/blog/archive/${yearData.year}/${monthData.month}`}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-colors",
                        "hover:bg-accent",
                        isCurrentMonth && "bg-primary/5 border border-primary/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          {MONTH_NAMES[monthData.month - 1]}
                        </span>
                        {isCurrentMonth && (
                          <Badge className="text-xs bg-primary text-primary-foreground">Now</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Puzzle type badges */}
                        <div className="hidden sm:flex gap-1">
                          {topTypes.map(([type, count]) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className={cn("text-xs", PUZZLE_TYPE_COLORS[type])}
                            >
                              {PUZZLE_TYPE_LABELS[type] || type} ({count})
                            </Badge>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {monthData.postCount} {monthData.postCount === 1 ? "post" : "posts"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
