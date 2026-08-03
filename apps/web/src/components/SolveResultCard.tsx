"use client";

export interface SolveResultCardProps {
import { SolveResultCardShell } from "./solve-result-card-shell";
import { useSolveResultCard } from "./use-solve-result-card";

export function SolveResultCard(props: any) {
  const state = useSolveResultCard(props);
  return <SolveResultCardShell {...state} />;
}
