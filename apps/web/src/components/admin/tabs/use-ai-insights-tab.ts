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


export function useAIInsightsTab(props: any = {}) {

  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AIAnalyticsOverview | null>(null);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [errors, setErrors] = useState<AIError[]>([]);
  const [generationHealth, setGenerationHealth] = useState<GenerationHealthPayload | null>(null);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }));

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      const response = await fetch(`/api/admin/ai/analytics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch AI analytics:", error);
    }
    setLoading(false);

  }, [dateRange]);

  // Fetch decisions
  const fetchDecisions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        limit: "50",
      });

      const response = await fetch(`/api/admin/ai/decisions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDecisions(data.decisions || []);
      }
    } catch (error) {
      console.error("Failed to fetch AI decisions:", error);
    }
  }, [dateRange]);

  // Fetch errors
  const fetchErrors = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        limit: "50",
      });

      const response = await fetch(`/api/admin/ai/errors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error("Failed to fetch AI errors:", error);
    }
  }, [dateRange]);

  const fetchGenerationHealth = useCallback(async () => {
    setGenerationLoading(true);
    try {
      const response = await fetch("/api/admin/ai/generation-health");
      if (response.ok) {
        const data = (await response.json()) as GenerationHealthPayload & {
          success?: boolean;
        };
        setGenerationHealth(data);
      }
    } catch (error) {
      console.error("Failed to fetch generation health:", error);
    }
    setGenerationLoading(false);

  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchDecisions();
    fetchErrors();
    fetchGenerationHealth();
  }, [fetchAnalytics, fetchDecisions, fetchErrors, fetchGenerationHealth]);

  const handlePresetChange = (preset: string) => {
    const now = new Date();
    const from = new Date();

    switch (preset) {
      case "7d":
        from.setDate(now.getDate() - 7);
        break;
      case "14d":
        from.setDate(now.getDate() - 14);
        break;
      case "30d":
        from.setDate(now.getDate() - 30);
        break;
      case "90d":
        from.setDate(now.getDate() - 90);
        break;
    }

    setDateRange({ from, to: now });
  };

  // Format numbers
  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatDuration = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
  const formatPercent = (rate: number) => `${(rate * 100).toFixed(1)}%`;


  return {
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
  };
}
