"use client";

import { AIInsightsTabShell } from "./ai-insights-tab-shell";
import { useAIInsightsTab } from "./use-ai-insights-tab";

export function AIInsightsTab(props: any) {
  const state = useAIInsightsTab(props);
  return <AIInsightsTabShell {...state} />;
}
