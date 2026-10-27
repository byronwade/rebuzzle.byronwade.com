"use client";

import { ArrowDownToLine, ArrowUpToLine, Copy, Trash2 } from "lucide-react";
import type { VisualLayer } from "@/ai/puzzle-agent/visual/composition";
import { layerName } from "@/components/studio/StudioArtboard";
import { TEXT_SIZES, type TextEmphasis } from "@/components/studio/StudioPartsTray";
import { labelFromSlug } from "@/lib/typography";

type StudioPieceBarProps = {
  layer: VisualLayer | undefined;
  index: number;
  count: number;
  onTextChange: (content: string) => void;
  onEmphasisChange: (emphasis: TextEmphasis) => void;
  onSendBack: () => void;
  onBringForward: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

/**
 * Context bar for the selected piece, the way an editor swaps its toolbar to
 * whatever you have picked up: layer order, copy, delete, and word settings.
 */
export function StudioPieceBar({
  layer,
  index,
  count,
  onTextChange,
  onEmphasisChange,
  onSendBack,
  onBringForward,
  onDuplicate,
  onRemove,
}: StudioPieceBarProps) {
  if (!layer) {
    return (
      <p className="flex min-h-11 items-center px-1 text-muted-foreground text-xs">
        {count
          ? "Tap a piece to edit it. Drag to move, or use the arrow keys."
          : "Your stage is empty. Pick a part from the tray."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p className="mr-auto min-w-0 truncate font-medium text-sm">
          <span className="font-mono text-subtle text-xs tabular-nums">
            {index + 1}/{count}
          </span>{" "}
          {layer.kind === "pictogram" ? labelFromSlug(layerName(layer)) : layerName(layer)}
        </p>
        <div className="studio-toolbar">
          <button
            aria-label="Send back"
            className="studio-tool"
            disabled={index <= 0}
            onClick={onSendBack}
            title="Send back"
            type="button"
          >
            <ArrowDownToLine aria-hidden className="size-4" />
          </button>
          <button
            aria-label="Bring forward"
            className="studio-tool"
            disabled={index >= count - 1}
            onClick={onBringForward}
            title="Bring forward"
            type="button"
          >
            <ArrowUpToLine aria-hidden className="size-4" />
          </button>
          <button
            aria-label="Duplicate"
            className="studio-tool"
            onClick={onDuplicate}
            title="Duplicate (D)"
            type="button"
          >
            <Copy aria-hidden className="size-4" />
          </button>
          <button
            aria-label="Remove"
            className="studio-tool text-destructive hover:text-destructive"
            onClick={onRemove}
            title="Remove (Delete)"
            type="button"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {layer.kind === "text" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Word</span>
            <input
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-border bg-card px-3 font-semibold text-base focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm"
              onChange={(e) => onTextChange(e.target.value.slice(0, 40))}
              spellCheck={false}
              value={layer.content}
            />
          </label>
          <div aria-label="Word size" className="flex flex-wrap gap-1" role="group">
            {TEXT_SIZES.map((size) => (
              <button
                aria-pressed={(layer.emphasis ?? "normal") === size.id}
                className="studio-tool h-8 border border-border text-xs"
                key={size.id}
                onClick={() => onEmphasisChange(size.id)}
                type="button"
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
