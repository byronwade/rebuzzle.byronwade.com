"use client";

import { DevToolsPanelShell } from "./dev-tools-panel-shell";
import { useDevToolsPanel } from "./use-dev-tools-panel";

export function DevToolsPanel(props: any) {
  const state = useDevToolsPanel(props);
  return <DevToolsPanelShell {...state} />;
}
