"use client";

import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronRight,
  Clock,
  Cpu,
  DollarSign,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/admin/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format as formatDateFns } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

interface AIAnalyticsOverview {
  overview: {
    totalDecisions: number;
    successRate: number;
    avgDurationMs: number;
    avgTokensPerDecision: number;
    totalCost: number;
    avgSatisfaction: number;
    totalErrors: number;
    unresolvedErrors: number;
    learningEventsApplied: number;
    avgQualityChange: number;
  };
  decisionsByType: Record<string, number>;
  decisionsByProvider: Record<string, number>;
  topErrorPatterns: Array<{
    errorCode: string;
    count: number;
    severity: string;
    recentOccurrence: string;
    resolvedCount: number;
  }>;
  satisfactionTrend: Array<{
    date: string;
    avgRating: number;
    avgSatisfaction: number;
    count: number;
  }>;
  period: { start: string; end: string };
}

interface AIDecision {
  id: string;
  decisionType: string;
  operationId: string;
  timestamp: string;
  durationMs: number;
  provider: string;
  model: string;
  modelType: string;
  output: {
    success: boolean;
    error?: string;
  };
  tokens: {
    prompt: number;
    completion: number;
    total: number;
    cost: number;
  };
  chainOfThought?: {
    steps: Array<{
      stepNumber: number;
      stepType: string;
      description: string;
      reasoning: string;
    }>;
  };
  qualityMetrics?: {
    score: number;
    verdict: string;
  };
  entityType?: string;
  entityId?: string;
}

interface AIError {
  id: string;
  errorCode: string;
  errorType: string;
  severity: string;
  message: string;
  timestamp: string;
  provider: string;
  model: string;
  resolved: boolean;
  tags: string[];
}

interface GenerationHealthPayload {
  health: {
    auditsLast7d: number;
    successRate: number;
    fallbackRate: number;
    apexShare: number;
    avgQuality: number | null;
    lastSuccessAt: string | null;
  };
  playerPressure: {
    finalPlays: number;
    solveRate: number;
    medianSolveSeconds: number | null;
    abandonRate: number;
    tooEasy: boolean;
    tooHard: boolean;
    difficultyDelta: number;
    notes: string[];
  };
  adaptiveDifficulty: {
    baseline: number;
    delta: number;
    target: number;
    tierLabel: string;
    reason: string;
  };
  recentAudits: Array<{
    id: string;
    dateString: string;
    engine: string;
    status: string;
    targetDifficulty: number;
    techniqueId?: string;
    qualityScore?: number;
    funScore?: number;
    estimatedSolveRate?: number;
    createdAt: string;
  }>;
  recentLearningEvents: Array<{
    id: string;
    eventType: string;
    status: string;
    change?: {
      parameter?: string;
      oldValue?: unknown;
      newValue?: unknown;
      reason?: string;
    };
    timestamp: string;
  }>;
  generatedAt: string;
}

// ============================================================================
// COMPONENT
// ============================================================================


import { AIInsightsTabShellLower } from "./ai-insights-tab-shell-lower";

export function AIInsightsTabShell(props: Record<string, any>) {
  const {
    activeSubTab,
    analytics,
    data,
    dateRange,
    decisions,
    errors,
    fetchAnalytics,
    fetchDecisions,
    fetchErrors,
    fetchGenerationHealth,
    formatCost,
    formatDuration,
    formatPercent,
    from,
    generationHealth,
    generationLoading,
    handlePresetChange,
    loading,
    now,
    params,
    response,
    selectedDecision,
    setActiveSubTab,
    setAnalytics,
    setDateRange,
    setDecisions,
    setErrors,
    setGenerationHealth,
    setGenerationLoading,
    setLoading,
    setSelectedDecision
  } = props;
    return (
    <>

    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Insights</h2>
          <p className="text-muted-foreground">
            Monitor AI decisions, errors, feedback, and learning progress
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select onValueChange={handlePresetChange} defaultValue="7d">
            <SelectTrigger aria-label="Filter insights" className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="14d">Last 14 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAnalytics();
              fetchDecisions();
              fetchErrors();
              fetchGenerationHealth();
            }}
          >
            <RefreshCw data-icon="inline-start" className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      <AIInsightsTabShellLower {...props} />
    </>
  );
}
