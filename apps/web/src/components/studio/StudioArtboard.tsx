"use client";

import { useEffect, useRef, useState } from "react";
import type { PuzzleVisual, VisualLayer } from "@/ai/puzzle-agent/visual/composition";
import {
  defaultPositionForIndex,
  hasLayerPosition,
  STUDIO_GRID_STEP,
  snapPosition,
} from "@/ai/puzzle-agent/visual/layer-position";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { cn } from "@/lib/utils";

type StudioArtboardProps = {
  visual: PuzzleVisual;
  /** -1 when nothing is selected. */
  selectedIndex: number;
  onSelect: (index: number) => void;
  onMove: (index: number, position: { x: number; y: number }) => void;
  className?: string;
};

type DragState = {
  index: number;
  pointerId: number;
  originX: number;
  originY: number;
  startPos: { x: number; y: number };
};

function layerPosition(layer: VisualLayer, index: number) {
  return hasLayerPosition(layer) ? { x: layer.x, y: layer.y } : defaultPositionForIndex(index);
}

export function layerName(layer: VisualLayer): string {
  if (layer.kind === "pictogram") return layer.concept;
  if (layer.kind === "text") return layer.content;
  if (layer.kind === "operator") return layer.symbol;
  return layer.concept || layer.alt || "image";
}

const NUDGE_KEYS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/**
 * The Studio stage: drag pieces freely with grid snap, or focus a piece and
 * nudge it with the arrow keys. Tapping empty space deselects.
 * The player preview still uses PuzzleVisualBoard (non-interactive).
 */
export function StudioArtboard({
  visual,
  selectedIndex,
  onSelect,
  onMove,
  className,
}: StudioArtboardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);

  const [compact, setCompact] = useState(false);

  const layers = visual.layers ?? [];

  // Phone-width stages draw pieces at the small board size so they don't collide.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setCompact(entry.contentRect.width < 560);
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const handlePointerDown = (index: number, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    target.focus({ preventScroll: true });
    const startPos = layerPosition(layers[index]!, index);
    onSelect(index);
    setDrag({
      index,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startPos,
    });
    setLivePos(startPos);
  };

  const positionFromEvent = (event: React.PointerEvent, state: DragState) => {
    const board = boardRef.current;
    if (!board) return state.startPos;
    const rect = board.getBoundingClientRect();
    const dx = ((event.clientX - state.originX) / rect.width) * 100;
    const dy = ((event.clientY - state.originY) / rect.height) * 100;
    return snapPosition({ x: state.startPos.x + dx, y: state.startPos.y + dy });
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    setLivePos(positionFromEvent(event, drag));
  };

  const endDrag = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const next = positionFromEvent(event, drag);
    if (next.x !== drag.startPos.x || next.y !== drag.startPos.y) onMove(drag.index, next);
    setDrag(null);
    setLivePos(null);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    const delta = NUDGE_KEYS[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? STUDIO_GRID_STEP * 2 : STUDIO_GRID_STEP;
    const pos = layerPosition(layers[index]!, index);
    onMove(index, snapPosition({ x: pos.x + delta.x * step, y: pos.y + delta.y * step }));
  };

  return (
    <div
      ref={boardRef}
      className={cn("studio-stage", className)}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect(-1);
      }}
      style={{ backgroundSize: `${STUDIO_GRID_STEP}% ${STUDIO_GRID_STEP}%` }}
    >
      {layers.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="studio-empty-mark" aria-hidden>
            +
          </span>
          <p className="max-w-[16rem] font-medium text-sm">Empty stage</p>
          <p className="max-w-[18rem] text-muted-foreground text-xs leading-5">
            Pick parts from the tray to drop them here, then drag them into place.
          </p>
        </div>
      ) : null}

      {layers.map((layer, index) => {
        const base = layerPosition(layer, index);
        const pos = drag?.index === index && livePos ? livePos : base;
        const selected = selectedIndex === index;
        const dragging = drag?.index === index;
        return (
          <button
            key={`piece-${index}`}
            type="button"
            aria-label={`${layerName(layer)}, piece ${index + 1}. Arrow keys move it.`}
            aria-pressed={selected}
            className={cn(
              "studio-piece absolute touch-none select-none rounded-lg outline-none",
              selected && "is-selected",
              dragging && "is-dragging"
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              zIndex: dragging ? 50 : index + 1,
            }}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPointerDown={(event) => handlePointerDown(index, event)}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className="studio-piece-inner">
              <PuzzleVisualBoard
                className="pointer-events-none [&_.puzzle-visual-board]:min-h-0"
                fallback=""
                size={compact ? "small" : "medium"}
                visual={{
                  ...visual,
                  layout: "row",
                  layers: [layer],
                  unicodeFallback: "◆",
                }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
