"use client";
import { useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { BarChart } from "@/components/admin/charts/BarChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format as formatDateFns } from "date-fns";
import type { AdminStats } from "./admin-dashboard-types";

export function AnalyticsTab({
  events,
  loading,
  stats,
}: {
  events: any[];
  loading: boolean;
  stats: AdminStats | null;
}) {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredEvents = events.filter(
    (event) => filterType === "all" || event.eventType === filterType
  );

  const eventTypes = stats?.eventTypes || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base md:text-lg">Analytics & Events</h2>
        <Select onValueChange={setFilterType} value={filterType}>
          <SelectTrigger aria-label="Filter events by type" className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Events</SelectItem>
              {eventTypes.map((et) => (
                <SelectItem key={et.type} value={et.type}>
                  {et.type}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {stats?.eventTypes && (
        <div className="grid gap-6 md:grid-cols-2">
          <BarChart
            color="hsl(var(--chart-1))"
            data={stats.eventTypes.map((et) => ({
              type: et.type,
              count: et.count,
            }))}
            dataKey="count"
            description="Frequency of different analytics event types"
            title="Event Type Distribution"
            xAxisKey="type"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
          <CardDescription>Real-time stream of analytics events from your platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] space-y-2 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No events found</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {filterType === "all"
                    ? "No analytics events have been recorded yet"
                    : `No events of type "${filterType}" found`}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  key={event.id}
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="font-medium">{event.eventType}</div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                        {event.userId ? "Authenticated" : "Anonymous"}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {event.userId ? (
                        <span>
                          User:{" "}
                          <span className="font-mono text-xs">
                            {event.userId.substring(0, 8)}...
                          </span>
                        </span>
                      ) : (
                        "Anonymous user"
                      )}
                      {event.metadata?.puzzleId && (
                        <span className="ml-2">
                          • Puzzle:{" "}
                          <span className="font-mono text-xs">
                            {event.metadata.puzzleId.substring(0, 8)}...
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      {formatDateFns(new Date(event.timestamp), "MMM d, yyyy h:mm a")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
