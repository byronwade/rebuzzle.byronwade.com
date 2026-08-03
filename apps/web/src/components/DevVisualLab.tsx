"use client";

import { DevVisualLabShell } from "./dev-visual-lab-shell";
import { useDevVisualLab } from "./use-dev-visual-lab";

export function DevVisualLab(props: any) {
  const state = useDevVisualLab(props);
  return <DevVisualLabShell {...state} />;
}


function MetaCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-1.5 font-medium text-[10px] uppercase tracking-wide text-subtle">{title}</p>
      <ul className="space-y-1 text-foreground/85">
        {lines.map((line) => (
          <li key={line} className="break-words">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
