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

export function AIInsightsTab() {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AIAnalyticsOverview | null>(null);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [errors, setErrors] = useState<AIError[]>([]);
  const [generationHealth, setGenerationHealth] = useState<GenerationHealthPayload | null>(null);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

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
    } finally {
      setLoading(false);
    }
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
    } finally {
      setGenerationLoading(false);
    }
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

  return (
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
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
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

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <Activity data-icon="inline-start" className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="decisions">
            <Brain data-icon="inline-start" className="mr-2 h-4 w-4" />
            Chain of Thought
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertTriangle data-icon="inline-start" className="mr-2 h-4 w-4" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <ThumbsUp data-icon="inline-start" className="mr-2 h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="learning">
            <Sparkles data-icon="inline-start" className="mr-2 h-4 w-4" />
            Generation
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings data-icon="inline-start" className="mr-2 h-4 w-4" />
            Config
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Total AI Decisions"
                  value={analytics.overview.totalDecisions.toLocaleString()}
                  icon={<Cpu className="h-4 w-4" />}
                  subtitle="API calls made"
                />
                <MetricCard
                  title="Success Rate"
                  value={formatPercent(analytics.overview.successRate)}
                  icon={<Target className="h-4 w-4" />}
                  subtitle="Successful completions"
                  trend={{ value: analytics.overview.successRate > 0.95 ? 5 : -5 }}
                />
                <MetricCard
                  title="Avg Latency"
                  value={formatDuration(analytics.overview.avgDurationMs)}
                  icon={<Clock className="h-4 w-4" />}
                  subtitle="Response time"
                />
                <MetricCard
                  title="Total Cost"
                  value={formatCost(analytics.overview.totalCost)}
                  icon={<DollarSign className="h-4 w-4" />}
                  subtitle="API costs"
                />
                <MetricCard
                  title="Avg Tokens/Request"
                  value={analytics.overview.avgTokensPerDecision.toFixed(0)}
                  icon={<Zap className="h-4 w-4" />}
                  subtitle="Token usage"
                />
                <MetricCard
                  title="User Satisfaction"
                  value={analytics.overview.avgSatisfaction.toFixed(1)}
                  icon={<ThumbsUp className="h-4 w-4" />}
                  subtitle="Out of 5"
                  trend={{ value: analytics.overview.avgSatisfaction > 4 ? 5 : -5 }}
                />
                <MetricCard
                  title="Unresolved Errors"
                  value={analytics.overview.unresolvedErrors.toString()}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  subtitle={`of ${analytics.overview.totalErrors} total`}
                  trend={{ value: analytics.overview.unresolvedErrors === 0 ? 5 : -5 }}
                />
                <MetricCard
                  title="Learning Events"
                  value={analytics.overview.learningEventsApplied.toString()}
                  icon={<TrendingUp className="h-4 w-4" />}
                  subtitle="Applied improvements"
                />
              </div>

              {/* Distribution Tables */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Decisions by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Decisions by Type</CardTitle>
                    <CardDescription>Distribution of AI operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.decisionsByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{type.replace(/_/g, " ")}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                      {Object.keys(analytics.decisionsByType).length === 0 && (
                        <p className="text-sm text-muted-foreground">No data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Decisions by Provider */}
                <Card>
                  <CardHeader>
                    <CardTitle>Decisions by Provider</CardTitle>
                    <CardDescription>AI provider usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.decisionsByProvider).map(([provider, count]) => (
                        <div key={provider} className="flex justify-between items-center">
                          <span className="text-sm">{provider}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                      {Object.keys(analytics.decisionsByProvider).length === 0 && (
                        <p className="text-sm text-muted-foreground">No data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Satisfaction Trend */}
              {analytics.satisfactionTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Satisfaction Trend</CardTitle>
                    <CardDescription>User satisfaction over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Avg Rating</TableHead>
                          <TableHead>Avg Satisfaction</TableHead>
                          <TableHead>Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.satisfactionTrend.slice(0, 10).map((d, i) => (
                          <TableRow key={i}>
                            <TableCell>{new Date(d.date).toLocaleDateString()}</TableCell>
                            <TableCell>{d.avgRating.toFixed(1)}</TableCell>
                            <TableCell>{d.avgSatisfaction.toFixed(1)}</TableCell>
                            <TableCell>{d.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Top Error Patterns */}
              {analytics.topErrorPatterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Error Patterns</CardTitle>
                    <CardDescription>Most common AI errors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Error Code</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Resolved</TableHead>
                          <TableHead>Last Occurrence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.topErrorPatterns.map((pattern) => (
                          <TableRow key={pattern.errorCode}>
                            <TableCell className="font-mono text-sm">{pattern.errorCode}</TableCell>
                            <TableCell>{pattern.count}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  pattern.severity === "critical"
                                    ? "destructive"
                                    : pattern.severity === "major"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {pattern.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {pattern.resolvedCount}/{pattern.count}
                            </TableCell>
                            <TableCell>
                              {new Date(pattern.recentOccurrence).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No AI data available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Chain of Thought / Decisions Tab */}
        <TabsContent value="decisions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Decisions</CardTitle>
              <CardDescription>View chain-of-thought reasoning for AI operations</CardDescription>
            </CardHeader>
            <CardContent>
              {decisions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map((decision) => (
                      <TableRow
                        key={decision.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedDecision(decision)}
                      >
                        <TableCell>
                          <Badge variant="outline">
                            {decision.decisionType.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {decision.model.split("/").pop()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={decision.output.success ? "default" : "destructive"}>
                            {decision.output.success ? "Success" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDuration(decision.durationMs)}</TableCell>
                        <TableCell>{decision.tokens.total.toLocaleString()}</TableCell>
                        <TableCell>{formatCost(decision.tokens.cost)}</TableCell>
                        <TableCell>
                          {decision.qualityMetrics ? (
                            <span className="font-medium">{decision.qualityMetrics.score}%</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(decision.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No decisions recorded yet</p>
              )}
            </CardContent>
          </Card>

          {/* Decision Detail Dialog */}
          <Dialog open={!!selectedDecision} onOpenChange={() => setSelectedDecision(null)}>
            <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedDecision?.decisionType.replace(/_/g, " ")} Decision
                </DialogTitle>
                <DialogDescription>{selectedDecision?.id}</DialogDescription>
              </DialogHeader>

              {selectedDecision && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Model</p>
                      <p className="font-mono text-sm">{selectedDecision.model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p>{formatDuration(selectedDecision.durationMs)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tokens</p>
                      <p>{selectedDecision.tokens.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p>{formatCost(selectedDecision.tokens.cost)}</p>
                    </div>
                  </div>

                  {/* Chain of Thought */}
                  {selectedDecision.chainOfThought?.steps && (
                    <div>
                      <h4 className="mb-4 font-semibold">Chain of Thought</h4>
                      <div className="space-y-4">
                        {selectedDecision.chainOfThought.steps.map((step, i) => (
                          <div key={i} className="relative border-l-2 border-primary/30 pl-4">
                            <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-primary" />
                            <div className="mb-1 flex items-center gap-2">
                              <Badge variant="outline">{step.stepType}</Badge>
                              <span className="text-sm text-muted-foreground">
                                Step {step.stepNumber}
                              </span>
                            </div>
                            <p className="font-medium">{step.description}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{step.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quality Metrics */}
                  {selectedDecision.qualityMetrics && (
                    <div>
                      <h4 className="mb-2 font-semibold">Quality Metrics</h4>
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold">
                          {selectedDecision.qualityMetrics.score}%
                        </div>
                        <Badge
                          variant={
                            selectedDecision.qualityMetrics.verdict === "publish"
                              ? "default"
                              : selectedDecision.qualityMetrics.verdict === "revise"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {selectedDecision.qualityMetrics.verdict}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {selectedDecision.output.error && (
                    <div>
                      <h4 className="mb-2 font-semibold text-destructive">Error</h4>
                      <pre className="overflow-x-auto rounded bg-muted p-4 text-sm">
                        {selectedDecision.output.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Errors</CardTitle>
              <CardDescription>Track and resolve AI system errors</CardDescription>
            </CardHeader>
            <CardContent>
              {errors.length > 0 ? (
                <Table role="alert">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Error Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell className="font-mono text-sm">{error.errorCode}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{error.errorType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              error.severity === "critical"
                                ? "destructive"
                                : error.severity === "major"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {error.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{error.provider}</TableCell>
                        <TableCell className="max-w-xs truncate">{error.message}</TableCell>
                        <TableCell>
                          <Badge variant={error.resolved ? "default" : "outline"}>
                            {error.resolved ? "Resolved" : "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(error.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No errors recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Feedback</CardTitle>
              <CardDescription>Feedback on AI-generated puzzles and hints</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Feedback collection is enabled. Data will appear here as users provide ratings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generation / Learning Health Tab */}
        <TabsContent value="learning" className="space-y-6">
          {generationLoading && !generationHealth ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : generationHealth ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Generations (7d)"
                  value={generationHealth.health.auditsLast7d.toString()}
                  icon={<Sparkles className="h-4 w-4" />}
                  subtitle="Audit trail rows"
                />
                <MetricCard
                  title="Publish Success"
                  value={formatPercent(generationHealth.health.successRate)}
                  icon={<Target className="h-4 w-4" />}
                  subtitle={`Fallback ${formatPercent(generationHealth.health.fallbackRate)}`}
                />
                <MetricCard
                  title="Apex Share"
                  value={formatPercent(generationHealth.health.apexShare)}
                  icon={<Cpu className="h-4 w-4" />}
                  subtitle="Tournament engine"
                />
                <MetricCard
                  title="Avg Quality"
                  value={
                    generationHealth.health.avgQuality !== null
                      ? generationHealth.health.avgQuality.toFixed(0)
                      : "—"
                  }
                  icon={<Zap className="h-4 w-4" />}
                  subtitle="Rubric / quality score"
                />
                <MetricCard
                  title="Adaptive Target"
                  value={`${generationHealth.adaptiveDifficulty.target}`}
                  icon={<TrendingUp className="h-4 w-4" />}
                  subtitle={`${generationHealth.adaptiveDifficulty.tierLabel} · Δ${generationHealth.adaptiveDifficulty.delta >= 0 ? "+" : ""}${generationHealth.adaptiveDifficulty.delta}`}
                />
                <MetricCard
                  title="Solve Rate (7d)"
                  value={formatPercent(generationHealth.playerPressure.solveRate)}
                  icon={<Activity className="h-4 w-4" />}
                  subtitle={`${generationHealth.playerPressure.finalPlays} finals`}
                />
                <MetricCard
                  title="Median Solve"
                  value={
                    generationHealth.playerPressure.medianSolveSeconds !== null
                      ? `${Math.round(generationHealth.playerPressure.medianSolveSeconds)}s`
                      : "—"
                  }
                  icon={<Clock className="h-4 w-4" />}
                  subtitle={
                    generationHealth.playerPressure.tooEasy
                      ? "Pressure: too easy"
                      : generationHealth.playerPressure.tooHard
                        ? "Pressure: too hard"
                        : "Pressure: stable"
                  }
                />
                <MetricCard
                  title="Abandon Rate"
                  value={formatPercent(generationHealth.playerPressure.abandonRate)}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  subtitle="Final plays"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Adaptive Difficulty</CardTitle>
                    <CardDescription>Schedule spine + live learning delta</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      Baseline {generationHealth.adaptiveDifficulty.baseline} → target{" "}
                      {generationHealth.adaptiveDifficulty.target} (
                      {generationHealth.adaptiveDifficulty.tierLabel})
                    </p>
                    <p className="text-muted-foreground">
                      {generationHealth.adaptiveDifficulty.reason}
                    </p>
                    {generationHealth.playerPressure.notes.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {generationHealth.playerPressure.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Learning Events</CardTitle>
                    <CardDescription>Calibration pulses from play + perception</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {generationHealth.recentLearningEvents.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead>Change</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generationHealth.recentLearningEvents.slice(0, 8).map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-mono text-xs">
                                {event.change?.parameter ?? event.eventType}
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                                {event.change?.reason ??
                                  `${String(event.change?.oldValue ?? "")} → ${String(event.change?.newValue ?? "")}`}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{event.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">No learning events yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Generation Audits</CardTitle>
                  <CardDescription>
                    Every publish attempt — Apex, Eve, and fallbacks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generationHealth.recentAudits.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Engine</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Technique</TableHead>
                          <TableHead>Quality</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Est. Solve</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generationHealth.recentAudits.map((audit) => (
                          <TableRow key={audit.id}>
                            <TableCell className="font-mono text-xs">{audit.dateString}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{audit.engine}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  audit.status === "success"
                                    ? "default"
                                    : audit.status === "fallback"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {audit.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {audit.techniqueId ?? "—"}
                            </TableCell>
                            <TableCell>
                              {typeof audit.qualityScore === "number"
                                ? audit.qualityScore.toFixed(0)
                                : "—"}
                            </TableCell>
                            <TableCell>{audit.targetDifficulty}</TableCell>
                            <TableCell>
                              {typeof audit.estimatedSolveRate === "number"
                                ? `${Math.round(audit.estimatedSolveRate * 100)}%`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No generation audits yet — run daily generate or regenerate
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Generation health unavailable. Confirm admin access and that audits are being
                    written.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Manage AI parameters, prompts, and A/B tests</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Settings className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Configuration editor coming soon. You&apos;ll be able to adjust prompts,
                  thresholds, and run A/B tests.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
